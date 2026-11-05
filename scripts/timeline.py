#!/usr/bin/env python3
"""Preview, apply, and validate curated timeline changes. Requires Python 3.10+ and Node 18+."""
import argparse
import csv
import difflib
import hashlib
import io
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['Date', 'Headline', 'Link']


class Invalid(ValueError):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def date_key(row):
    return datetime.strptime(row['Date'], '%d/%m/%Y')


def validate_event(row, allow_legacy_url=False):
    if not isinstance(row, dict) or set(row) != set(FIELDS):
        raise Invalid('Each event must contain exactly Date, Headline, and Link.')
    if any(not isinstance(row[k], str) or not row[k].strip() for k in FIELDS):
        raise Invalid('Event fields must be non-empty strings.')
    if any('\n' in row[k] or '\r' in row[k] or '\x00' in row[k] for k in FIELDS):
        raise Invalid('Embedded line breaks or NUL characters are incompatible with the site parser.')
    if not re.fullmatch(r'\d{2}/\d{2}/\d{4}', row['Date']):
        raise Invalid('Dates must use DD/MM/YYYY.')
    try:
        date_key(row)
    except ValueError as exc:
        raise Invalid(f"Invalid calendar date: {row['Date']}") from exc
    link = row['Link']
    parsed = urlparse(link)
    try:
        _ = parsed.port  # urlparse defers numeric/range validation until this access.
    except ValueError as exc:
        raise Invalid(f'Invalid source URL port: {link}') from exc
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or
            (not allow_legacy_url and any(c.isspace() or c in '"<>' for c in link))):
        raise Invalid(f'Invalid HTTP(S) source URL: {link}')


def validate_unique(rows, allow_legacy_urls=False):
    seen = set()
    for row in rows:
        validate_event(row, allow_legacy_url=allow_legacy_urls)
        key = ' '.join(row['Headline'].split()).casefold()
        if key in seen:
            raise Invalid(f"Duplicate headline: {row['Headline']}")
        seen.add(key)


def read_csv(data):
    if not data:
        raise Invalid('CSV is empty.')
    text = data.decode('utf-8')
    newline = b'\r\n' if b'\r\n' in data else b'\n'
    if b'\r' in data.replace(b'\r\n', b'') or (newline == b'\r\n' and b'\n' in data.replace(b'\r\n', b'')):
        raise Invalid('CSV must use a consistent LF or CRLF newline style.')
    trailing = data.endswith(newline)
    raw = data.split(newline)
    if trailing:
        raw.pop()
    rows = []
    for i, line in enumerate(raw):
        values = list(csv.reader([line.decode('utf-8')], strict=True))[0]
        if i == 0:
            if values != FIELDS:
                raise Invalid('CSV header must be Date,Headline,Link.')
        else:
            if len(values) != 3:
                raise Invalid(f'CSV record {i + 1} has {len(values)} fields; expected 3.')
            row = dict(zip(FIELDS, values))
            validate_event(row, allow_legacy_url=True)
            rows.append(row)
    validate_unique(rows, allow_legacy_urls=True)
    return rows, raw, newline, trailing


def browser_check(data, rows, browser_script):
    payload = json.dumps({'csv': data.decode('utf-8'), 'rows': [[r[k] for k in FIELDS] for r in rows]})
    result = subprocess.run(
        ['node', str(ROOT / 'scripts' / 'check-browser-parser.mjs'), str(browser_script)],
        input=payload, text=True, capture_output=True, timeout=15)
    if result.returncode:
        raise Invalid(result.stderr.strip() or 'Site parser check failed.')


def read_json(path):
    value = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(value, dict):
        raise Invalid('Batch or plan must be a JSON object.')
    return value


def encode(row):
    stream = io.StringIO(newline='')
    csv.writer(stream, quoting=csv.QUOTE_ALL, lineterminator='\n').writerow([row[k] for k in FIELDS])
    return stream.getvalue().removesuffix('\n').encode('utf-8')


def build(data, batch):
    if set(batch) - {'additions', 'updates'}:
        raise Invalid('Batch accepts only additions and updates.')
    additions, updates = batch.get('additions', []), batch.get('updates', [])
    if not isinstance(additions, list) or not isinstance(updates, list):
        raise Invalid('additions and updates must be arrays.')
    if not additions and not updates:
        raise Invalid('Batch contains no changes.')
    rows, raw, newline, trailing = read_csv(data)
    replacements = {}
    pending = list(additions)
    for row in pending:
        validate_event(row)
    for change in updates:
        if not isinstance(change, dict) or set(change) != {'match', 'replacement'}:
            raise Invalid('Updates require an exact match and a complete replacement event.')
        match, replacement = change['match'], change['replacement']
        validate_event(match, allow_legacy_url=True)
        validate_event(replacement)
        indices = [i for i, row in enumerate(rows) if row == match]
        if len(indices) != 1 or indices[0] in replacements:
            raise Invalid('Update match must identify one existing event and may be used only once.')
        replacements[indices[0]] = replacement
    existing = []
    for i, row in enumerate(rows):
        replacement = replacements.get(i)
        if replacement is None:
            existing.append((row, raw[i + 1]))
        elif replacement['Date'] == row['Date']:
            existing.append((replacement, encode(replacement)))
        else:
            pending.append(replacement)
    pending.sort(key=date_key)
    result = [raw[0]]
    pos = 0
    for row, line in existing:
        while pos < len(pending) and date_key(pending[pos]) < date_key(row):
            result.append(encode(pending[pos]))
            pos += 1
        result.append(line)
    result.extend(encode(row) for row in pending[pos:])
    output = newline.join(result) + (newline if trailing else b'')
    new_rows, _, _, _ = read_csv(output)
    return output, new_rows


def report(data, rows):
    latest = max((date_key(r) for r in rows), default=None)
    anomalies = sum(date_key(a) > date_key(b) for a, b in zip(rows, rows[1:]))
    print(f"Validated {len(rows)} events; latest selected event: {latest.strftime('%d/%m/%Y') if latest else 'none'}.")
    print(f'SHA-256: {digest(data)}')
    for i, row in enumerate(rows, 2):
        if any(c.isspace() or c in '"<>' for c in row['Link']):
            print(f'Warning: record {i} has a legacy source URL needing review: {row["Link"]}')
    if anomalies:
        print(f'Warning: {anomalies} existing date-order anomalies; existing rows were not reordered.')


def atomic_write(path, expected, output):
    mode = stat.S_IMODE(path.stat().st_mode)
    handle, name = tempfile.mkstemp(prefix=f'.{path.name}.', dir=path.parent)
    try:
        with os.fdopen(handle, 'wb') as stream:
            stream.write(output)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, mode)
        if path.read_bytes() != expected:
            raise Invalid('CSV changed during preparation; preview again.')
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('validate', 'preview', 'apply'):
        command = sub.add_parser(name)
        command.add_argument('--csv', type=Path, default=ROOT / 'timeline.csv')
        command.add_argument('--browser-script', type=Path, default=ROOT / 'scripts' / 'csv-parser.js')
        if name != 'validate':
            command.add_argument('input', type=Path)
        if name == 'preview':
            command.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    data = args.csv.read_bytes()
    rows, _, _, _ = read_csv(data)
    if args.command == 'validate':
        browser_check(data, rows, args.browser_script)
        report(data, rows)
        return
    value = read_json(args.input)
    if args.command == 'apply':
        if set(value) != {'version', 'source_sha256', 'result_sha256', 'additions', 'updates'} or value['version'] != 1:
            raise Invalid('Unsupported preview plan; create a new preview.')
        if digest(data) != value['source_sha256']:
            raise Invalid('Stale plan: CSV changed since preview; preview again.')
        batch = {k: value[k] for k in ('additions', 'updates')}
    else:
        batch = value
    output, new_rows = build(data, batch)
    browser_check(output, new_rows, args.browser_script)
    if args.command == 'preview':
        plan = dict(version=1, source_sha256=digest(data), result_sha256=digest(output),
                    additions=batch.get('additions', []), updates=batch.get('updates', []))
        # Exclusive creation also protects an input/CSV path accidentally passed as --out.
        with args.out.open('x', encoding='utf-8') as stream:
            json.dump(plan, stream, indent=2, ensure_ascii=False)
            stream.write('\n')
        diff = difflib.unified_diff(data.decode().splitlines(), output.decode().splitlines(),
                                    fromfile=str(args.csv), tofile='proposed timeline.csv', lineterm='')
        print('\n'.join(diff))
        print(f"Preview: {len(plan['additions'])} additions, {len(plan['updates'])} updates. Plan: {args.out}")
    else:
        if digest(output) != value['result_sha256']:
            raise Invalid('Plan result differs from preview; create and review a new preview.')
        atomic_write(args.csv, data, output)
        print(f"Applied {len(batch['additions'])} additions and {len(batch['updates'])} updates.")
    report(output, new_rows)


if __name__ == '__main__':
    try:
        main()
    except (Invalid, OSError, ValueError, csv.Error, subprocess.SubprocessError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        sys.exit(1)
