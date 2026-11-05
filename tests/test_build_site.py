"""Static output contracts: content survives disabled JavaScript and hostile text."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

class Elements(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

class BuildSite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import build_site
        cls.site = build_site

    def test_static_content_order_links_and_stable_anchors(self):
        rows = [dict(Date='01/01/2025', Headline='Older', Link='https://example.com/old'),
                dict(Date='02/02/2026', Headline='Newer', Link='https://example.com/new')]
        text = self.site.render_page(rows, '2026-11-05')
        tags = Elements(text).tags
        events = [a for t, a in tags if t == 'article']
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]['id'], self.site.event_id(rows[1]))
        self.assertLess(text.index('Newer'), text.index('Older'))
        self.assertIn(('time', {'datetime': '2026-02-02', 'class': 'date'}), tags)
        self.assertTrue(any(t == 'a' and a.get('href') == 'https://example.com/new' for t,a in tags))
        corrected = dict(rows[1], Date='03/02/2026', Link='https://example.com/corrected')
        self.assertEqual(self.site.event_id(corrected), self.site.event_id(rows[1]))
        self.assertEqual(len(events), len({e['id'] for e in events}))
        self.assertNotIn('raw.githubusercontent.com', text)

    def test_presentation_matches_original_scope(self):
        row = dict(Date='01/01/2026', Headline='Milestone', Link='https://example.com')
        tags = Elements(self.site.render_page([row], '2026-11-05')).tags
        search = next(a for t,a in tags if t == 'input' and a.get('id') == 'search-bar')
        self.assertEqual(search['placeholder'], '🔍 Search...')
        self.assertEqual(search['type'], 'text')
        self.assertFalse(any(t in ('nav', 'footer') for t,a in tags))
        self.assertFalse(any(a.get('class') in ('permalink', 'introduction') for t,a in tags))
        self.assertTrue(any(t == 'p' for t,a in tags))

    def test_html_and_jsonld_escape_headlines_and_links(self):
        row = dict(Date='01/01/2026', Headline='A </script><script>alert("x")</script> & B',
                   Link='https://example.com/?a=1&b=2')
        text = self.site.render_page([row], '2026-11-05')
        self.assertNotIn('<script>alert', text)
        self.assertIn('&lt;/script&gt;', text)
        block = text.split('<script type="application/ld+json">')[1].split('</script>')[0]
        data = json.loads(block)
        listing = next(obj for obj in data['@graph'] if obj['@type'] == 'ItemList')
        self.assertEqual(listing['numberOfItems'], 1)
        self.assertEqual(listing['itemListElement'][0]['item']['name'], row['Headline'])

    def test_revision_date_is_explicit_and_sitemap_matches(self):
        self.assertIn('<lastmod>2026-11-05</lastmod>', self.site.render_sitemap('2026-11-05'))
        for bad in ['2026-02-31', '05/11/2026', '2026-1-1']:
            with self.assertRaises(ValueError):
                self.site.render_sitemap(bad)

    def test_check_detects_stale_output_without_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'index.html'
            path.write_text('old')
            self.assertFalse(self.site.write_or_check(path, 'new', check=True))
            self.assertEqual(path.read_text(), 'old')
            self.assertTrue(self.site.write_or_check(path, 'new', check=False))
            self.assertTrue(self.site.write_or_check(path, 'new', check=True))

    def test_committed_outputs_are_current(self):
        import subprocess
        result = subprocess.run([sys.executable, str(ROOT/'scripts/build_site.py'), '--check'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
