"""CLI contracts: failed operations must not corrupt the curated source."""
import csv
import hashlib
import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'scripts' / 'timeline.py'
HEADER = b'"Date","Headline","Link"\r\n'


def event(date, headline, link='https://example.com/source'):
    return dict(Date=date, Headline=headline, Link=link)


class TimelineCLI(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.csv = self.root / 'timeline.csv'
        self.original = HEADER + b'"01/01/2025","Original event","http://example.com/old"'
        self.csv.write_bytes(self.original)
        self.batch = self.root / 'batch.json'
        self.plan = self.root / 'plan.json'
        self.browser = self.root / 'scripts.js'
        shutil.copyfile(ROOT / 'scripts.js', self.browser)

    def run_cli(self, *args, ok=True):
        result = subprocess.run(
            [sys.executable, str(CLI), *args, '--csv', str(self.csv),
             '--browser-script', str(self.browser)],
            cwd=self.root, text=True, capture_output=True)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout)
        return result

    def preview(self, additions=None, updates=None):
        self.batch.write_text(json.dumps(dict(additions=additions or [], updates=updates or [])))
        return self.run_cli('preview', str(self.batch), '--out', str(self.plan))

    def test_preview_does_not_mutate_csv_and_apply_preserves_original_bytes(self):
        self.csv.chmod(0o640)
        output = self.preview([event('02/01/2025', 'A "quoted", new event')])
        self.assertEqual(self.csv.read_bytes(), self.original)
        self.assertIn('+"02/01/2025","A ""quoted"", new event"', output.stdout)
        self.run_cli('apply', str(self.plan))
        self.assertEqual(self.csv.read_bytes(), self.original +
            b'\r\n"02/01/2025","A ""quoted"", new event","https://example.com/source"')
        self.assertEqual(self.csv.stat().st_mode & 0o777, 0o640)

    def test_apply_rejects_stale_plan_without_losing_external_edit(self):
        self.preview([event('02/01/2025', 'New event')])
        edited = self.original.replace(b'Original event', b'Edited by user')
        self.csv.write_bytes(edited)
        self.run_cli('apply', str(self.plan), ok=False)
        self.assertEqual(self.csv.read_bytes(), edited)

    def test_apply_rejects_changed_plan_result(self):
        self.preview([event('02/01/2025', 'New event')])
        plan = json.loads(self.plan.read_text())
        plan['additions'][0]['Headline'] = 'Unreviewed change'
        self.plan.write_text(json.dumps(plan))
        self.run_cli('apply', str(self.plan), ok=False)
        self.assertEqual(self.csv.read_bytes(), self.original)

    def test_preview_refuses_to_overwrite_an_existing_output(self):
        self.batch.write_text(json.dumps(dict(additions=[event('02/01/2025', 'New event')])))
        self.plan.write_bytes(b'keep this file')
        self.run_cli('preview', str(self.batch), '--out', str(self.plan), ok=False)
        self.assertEqual(self.plan.read_bytes(), b'keep this file')
        self.assertEqual(self.csv.read_bytes(), self.original)

    def test_invalid_dates_extra_fields_and_embedded_newlines_are_rejected(self):
        bad_rows = [
            b'"31/02/2025","Bad date","https://example.com"',
            b'"01/01/2025","Extra field","","https://example.com"',
            b'"01/01/2025","Line one\r\nline two","https://example.com"',
        ]
        for row in bad_rows:
            with self.subTest(row=row):
                self.csv.write_bytes(HEADER + row)
                self.run_cli('validate', ok=False)
                self.assertEqual(self.csv.read_bytes(), HEADER + row)

    def test_duplicate_headlines_are_normalized_but_shared_sources_are_allowed(self):
        self.batch.write_text(json.dumps(dict(additions=[event('02/01/2025', ' original   EVENT ')])))
        self.run_cli('preview', str(self.batch), '--out', str(self.plan), ok=False)
        self.assertEqual(self.csv.read_bytes(), self.original)
        self.preview([event('02/01/2025', 'Different event', 'http://example.com/old')])
        self.run_cli('apply', str(self.plan))
        self.assertEqual(len(list(csv.reader(io.StringIO(self.csv.read_text())))), 3)

    def test_date_update_moves_only_the_matched_row_and_inserts_backfill(self):
        self.csv.write_bytes(HEADER +
            b'"01/01/2025","Original event","http://example.com/old"\r\n' +
            b'"10/01/2025","Later event","https://example.com/later"')
        self.preview([event('05/01/2025', 'Backfill')], [dict(
            match=event('10/01/2025', 'Later event', 'https://example.com/later'),
            replacement=event('02/01/2025', 'Corrected date', 'https://example.com/later'))])
        self.run_cli('apply', str(self.plan))
        self.assertEqual([r['Headline'] for r in csv.DictReader(io.StringIO(self.csv.read_text()))],
                         ['Original event', 'Corrected date', 'Backfill'])

    def test_conflicting_updates_fail_without_writing_plan_or_csv(self):
        change = dict(match=event('01/01/2025', 'Original event', 'http://example.com/old'),
                      replacement=event('01/01/2025', 'Replacement'))
        self.batch.write_text(json.dumps(dict(additions=[], updates=[change, change])))
        self.run_cli('preview', str(self.batch), '--out', str(self.plan), ok=False)
        self.assertFalse(self.plan.exists())
        self.assertEqual(self.csv.read_bytes(), self.original)

    def test_existing_ordering_anomaly_is_reported_and_not_rewritten(self):
        old = HEADER + b'"10/01/2025","Ten","https://example.com/ten"\r\n' + \
              b'"01/01/2025","One","https://example.com/one"'
        self.csv.write_bytes(old)
        report = self.run_cli('validate')
        self.assertIn('order', report.stdout.lower())
        self.preview([event('20/01/2025', 'Twenty')])
        self.run_cli('apply', str(self.plan))
        self.assertTrue(self.csv.read_bytes().startswith(old + b'\r\n'))

    def test_lf_and_trailing_newline_convention_are_preserved(self):
        self.csv.write_bytes(self.original.replace(b'\r\n', b'\n') + b'\n')
        self.preview([event('02/01/2025', 'New event')])
        self.run_cli('apply', str(self.plan))
        output = self.csv.read_bytes()
        self.assertNotIn(b'\r', output)
        self.assertTrue(output.endswith(b'\n'))

    def test_browser_parser_failure_prevents_apply(self):
        self.preview([event('02/01/2025', 'New event')])
        text = self.browser.read_text().replace('return { date: eventDate, headline, link, year };', 'return null;')
        self.browser.write_text(text)
        self.run_cli('apply', str(self.plan), ok=False)
        self.assertEqual(self.csv.read_bytes(), self.original)

    def test_legacy_source_warning_does_not_allow_new_unsafe_url(self):
        legacy = HEADER + b'"01/01/2025","Legacy","https://example.com/path"""'
        self.csv.write_bytes(legacy)
        report = self.run_cli('validate')
        self.assertIn('Warning:', report.stdout)
        self.assertEqual(self.csv.read_bytes(), legacy)
        self.batch.write_text(json.dumps(dict(additions=[event('02/01/2025', 'New', 'https://example.com/path"')])))
        self.run_cli('preview', str(self.batch), '--out', str(self.plan), ok=False)
        self.assertEqual(self.csv.read_bytes(), legacy)

    def test_exact_update_can_repair_a_legacy_url_without_touching_other_rows(self):
        self.csv.write_bytes(HEADER + b'"01/01/2025","Legacy",https://example.com/path"')
        self.preview(updates=[dict(match=event('01/01/2025', 'Legacy', 'https://example.com/path"'),
                                  replacement=event('01/01/2025', 'Legacy', 'https://example.com/path'))])
        self.run_cli('apply', str(self.plan))
        self.assertEqual(self.csv.read_bytes(), HEADER + b'"01/01/2025","Legacy","https://example.com/path"')

    def test_malformed_source_ports_cannot_be_previewed(self):
        for index, link in enumerate(['https://example.com:abc/path', 'https://example.com:99999/path', 'https://example.com:-1/path']):
            self.plan = self.root / f'port-plan-{index}.json'
            with self.subTest(link=link):
                self.batch.write_text(json.dumps(dict(additions=[event('02/01/2025', 'New', link)])))
                self.run_cli('preview', str(self.batch), '--out', str(self.plan), ok=False)
                self.assertFalse(self.plan.exists())
                self.assertEqual(self.csv.read_bytes(), self.original)
        self.plan = self.root / 'valid-port-plan.json'
        self.preview([event('02/01/2025', 'New', 'https://example.com:8443/path')])
        self.assertTrue(self.plan.exists())

    def test_validate_accepts_current_project_without_changing_it(self):
        data = (ROOT / 'timeline.csv').read_bytes()
        self.csv.write_bytes(data)
        result = self.run_cli('validate')
        self.assertIn('Validated', result.stdout)
        self.assertEqual(hashlib.sha256(self.csv.read_bytes()).digest(), hashlib.sha256(data).digest())


if __name__ == '__main__':
    unittest.main()
