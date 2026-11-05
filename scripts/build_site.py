#!/usr/bin/env python3
"""Generate committed static HTML and sitemap from timeline.csv; --check never writes."""
import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from timeline import ROOT, FIELDS, read_csv, date_key

URL = 'https://timeline.the-blueprint.ai/'


def revision_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('content_modified must be an ISO calendar date (YYYY-MM-DD).')
    return datetime.strptime(value, '%Y-%m-%d')


def event_id(row):
    return 'milestone-' + hashlib.sha256(row['Headline'].strip().encode()).hexdigest()[:16]


def date_label(date):
    return f'{date.day} {date.strftime("%B %Y")}'


def render_page(rows, modified):
    revision_date(modified)
    ordered = sorted(rows, key=date_key, reverse=True)
    sections, listing, current = [], [], None
    for i, row in enumerate(ordered):
        date = date_key(row)
        if date.year != current:
            if current is not None:
                sections.append('</div></section>')
            current = date.year
            sections.append(f'<section id="{current}" class="year" aria-labelledby="heading-{current}">'
                            f'<h2 id="heading-{current}">{current}</h2><div class="timeline">')
        ident = event_id(row)
        side = 'left' if i % 2 == 0 else 'right'
        headline, link = html.escape(row['Headline']), html.escape(row['Link'], quote=True)
        sections.append(f'<article id="{ident}" class="event {side}">'
                        f'<div class="circle-container" aria-hidden="true"><div class="circle circle-{side}"></div></div>'
                        f'<time datetime="{date.date().isoformat()}" class="date">{date_label(date)}</time>'
                        f'<p>{headline}</p>'
                        f'<a href="{link}" target="_blank" rel="noopener" aria-label="Read more: {html.escape(row["Headline"], quote=True)}">READ MORE</a>'
                        '</article>')
        listing.append({'@type': 'ListItem', 'position': i + 1, 'item': {
            '@type': 'CreativeWork', '@id': URL + '#' + ident,
            'url': URL + '#' + ident, 'name': row['Headline'],
            'about': 'Artificial intelligence', 'citation': row['Link'],
            'temporalCoverage': date.date().isoformat()}})
    if sections:
        sections.append('</div></section>')
    schema = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Organization', '@id': 'https://www.the-blueprint.ai/#organization',
         'name': 'The Blueprint', 'url': 'https://www.the-blueprint.ai'},
        {'@type': 'WebSite', '@id': URL + '#website', 'url': URL,
         'name': 'Generative AI Timeline', 'publisher': {'@id': 'https://www.the-blueprint.ai/#organization'}},
        {'@type': 'WebPage', '@id': URL + '#webpage', 'url': URL,
         'name': 'Generative AI Timeline', 'dateModified': modified,
         'isPartOf': {'@id': URL + '#website'}, 'mainEntity': {'@id': URL + '#milestones'}},
        {'@type': 'ItemList', '@id': URL + '#milestones', 'name': 'AI timeline milestones',
         'numberOfItems': len(rows), 'itemListOrder': 'https://schema.org/ItemListOrderDescending',
         'itemListElement': listing}]}
    # JSON-LD is script raw text: HTML entity escaping alone does not stop </script>.
    encoded = json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    replacements = {'COUNT': str(len(rows)), 'MODIFIED': modified,
                    'MODIFIED_LABEL': date_label(revision_date(modified)),
                    'SCHEMA': encoded, 'EVENTS': '\n'.join(sections)}
    template = (ROOT / 'templates/index.html').read_text()
    return re.sub(r'@@([A-Z_]+)@@', lambda match: replacements[match[1]], template)


def render_sitemap(modified):
    revision_date(modified)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f'  <url><loc>{URL}</loc><lastmod>{modified}</lastmod></url>\n</urlset>\n')


def write_or_check(path, content, check):
    if path.exists() and path.read_bytes() == content.encode('utf-8'):
        return True
    if check:
        print(f'Stale generated file: {path.name}; run python3 scripts/build_site.py', file=sys.stderr)
        return False
    path.write_bytes(content.encode('utf-8'))
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = (ROOT / 'timeline.csv').read_bytes()
    rows, _, _, _ = read_csv(data)
    modified = json.loads((ROOT / 'site.json').read_text())['content_modified']
    # Preserve established CSV/browser interpretation, including the reported legacy URL quote.
    payload = json.dumps({'csv': data.decode(), 'rows': [[row[k] for k in FIELDS] for row in rows]})
    result = subprocess.run(['node', str(ROOT / 'scripts/check-browser-parser.mjs'),
                             str(ROOT / 'scripts/csv-parser.js'), '--json'],
                            input=payload, text=True, capture_output=True, check=True, timeout=15)
    normalized = json.loads(result.stdout)
    rows = [dict(row, Headline=parsed['headline'], Link=parsed['link']) for row, parsed in zip(rows, normalized)]
    outputs = [(ROOT / 'index.html', render_page(rows, modified)),
               (ROOT / 'sitemap.xml', render_sitemap(modified))]
    results = [write_or_check(path, content, args.check) for path, content in outputs]
    if not all(results):
        return 1
    print(f'{"Checked" if args.check else "Generated"} static page: {len(rows)} milestones; content modified {modified}.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as exc:
        print(f'Build failed: {exc}', file=sys.stderr)
        sys.exit(1)
