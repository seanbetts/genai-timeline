# The Blueprint: Generative AI Timeline

A curated timeline of generative AI milestones, research, products, industry developments, and societal consequences from [The Blueprint](https://www.the-blueprint.ai).

[View the timeline](https://timeline.the-blueprint.ai)

## Project structure

| File or directory | Purpose |
| --- | --- |
| `timeline.csv` | Canonical events: `Date`, `Headline`, `Link` |
| `index.html`, `styles.css`, `scripts.js` | Generated static page, styling and progressive search |
| `sources/` | Locally hosted historical source documents |
| `scripts/timeline.py` | Validate, preview and apply CSV batches |
| `scripts/build_site.py`, `templates/index.html`, `site.json` | Static publication generator, page template and explicit content revision date |
| `scripts/csv-parser.js`, `scripts/check-browser-parser.mjs` | Shared publication parser and compatibility check for proposed CSV data |
| `.agents/skills/updating-genai-timeline/` | Reusable content-update skill |
| `docs/timeline-editorial.md` | Editorial scope and research guidance |
| `docs/timeline-updates/` | Research windows and accepted, rejected or unresolved candidates |
| `AGENTS.md` | Repository instructions for coding agents |

The page displays events newest first, grouped by year, with search over headlines and formatted dates. The CSV generally runs oldest first; the helper preserves existing ordering anomalies rather than silently rearranging history.

## View locally

Generate the static page after changes, then serve the directory with any static HTTP server:

```bash
python3 scripts/build_site.py
python3 -m http.server 8000
```

Open `http://localhost:8000`.

The page serves every milestone and source link directly in its HTML. JavaScript only filters existing entries, so timeline content also works without it. Local generation uses local CSV data and makes no network requests. The CSV remains canonical; edit `templates/index.html` for page structure, then regenerate `index.html`.

## Generating the page

After an approved content update, set `content_modified` in `site.json` to the actual revision date (`YYYY-MM-DD`), then run:

```bash
python3 scripts/build_site.py
python3 scripts/build_site.py --check
```

Commit the generated `index.html` and `sitemap.xml` alongside their source changes. `--check` never writes and fails if either generated file is stale. CI validates the data, checks freshness and runs the tests. This check reports failures; it is not a deployment gate for GitHub Pages, so run it before pushing. The revision date describes an editorial content change, not the newest event's date or each deployment.

Milestone links use a hash of the headline: inserting entries or correcting dates/sources preserves their anchors. Editing a headline changes its anchor. Existing `#2026` style year links remain valid. Milestone IDs support direct links without adding visible permalink controls. The original page layout, search placeholder and filtering behavior are preserved.

`robots.txt` advertises the sitemap. JSON-LD describes the visible timeline; it does not imply eligibility for a particular search result feature. Sharing previews use the original `genai-timeline-logo.png` asset. The original browser tab title is retained.

## Updating the data

The helper requires **Python 3.10+** and **Node.js 18+**, with no third-party packages. Run the commands below from the repository root; the helper's default CSV and site-script paths also work when it is invoked from another directory.

Research and agree candidates using the [editorial guidance](docs/timeline-editorial.md) and [update records](docs/timeline-updates/). An update record's `research_window.through` is independent of the newest event selected for inclusion.

Validate the current data:

```bash
python3 scripts/timeline.py validate
```

Create a JSON batch containing complete event objects. For an addition, the shape is:

```json
{
  "additions": [
    {
      "Date": "06/11/2026",
      "Headline": "Example announcement - replace with an approved, verified event",
      "Link": "https://example.com/announcement"
    }
  ],
  "updates": []
}
```

This is a format example, not a real event to add. For a correction, put a complete original event in `match` and the complete corrected event in `replacement`:

```json
{
  "additions": [],
  "updates": [
    {
      "match": {
        "Date": "06/11/2026",
        "Headline": "Example announcement - replace with an approved, verified event",
        "Link": "https://example.com/announcement"
      },
      "replacement": {
        "Date": "07/11/2026",
        "Headline": "Example announcement with a corrected date",
        "Link": "https://example.com/announcement"
      }
    }
  ]
}
```

Preview a saved batch without modifying the CSV:

```bash
python3 scripts/timeline.py preview /tmp/timeline-batch.json --out /tmp/timeline-plan.json
```

Review the printed diff. The plan contains SHA-256 digests of the current and proposed CSV. Preview refuses to overwrite an existing output file; use a new filename for each reviewed plan.

After the specific changes are approved, apply that plan and validate:

```bash
python3 scripts/timeline.py apply /tmp/timeline-plan.json
python3 scripts/timeline.py validate
```

Apply refuses a stale source or a result that differs from the preview. If the source or batch changes, generate and review a new plan. It writes atomically, preserves existing row bytes and file mode, inserts new or date-corrected rows chronologically, and retains LF/CRLF and trailing-newline conventions. The helper has no delete command.

After applying an approved batch, update `site.json` and regenerate/check the page as above.

Each field must be non-empty, dates must be real `DD/MM/YYYY` calendar dates, and each event must occupy one physical line. Duplicate headlines are compared without case or whitespace differences. Distinct events may share a source URL. New links must be HTTP(S) with no whitespace, double quotes or angle brackets. Existing legacy URL quote issues and date-order anomalies are reported as warnings and need separate review; they are not silently fixed. Validation does not check remote link availability or establish factual accuracy.

Preview, apply and publication share `scripts/csv-parser.js`. The Node checker compares its interpretation with the Python CSV reader before generation. Existing legacy source-URL quote handling is preserved in rendered output and remains a warning in CSV validation.

Record accepted decisions, specific exclusions, unresolved evidence and publication status in a dated JSON file under `docs/timeline-updates/`. Existing records are examples, not an automated approval mechanism.

## Reusable skill

The canonical skill is versioned in [.agents/skills/updating-genai-timeline](.agents/skills/updating-genai-timeline/SKILL.md). `AGENTS.md` points agents to it. To expose it in a local Codex skills directory, create a symlink to that directory if the skill name is free:

```bash
mkdir -p "$HOME/.codex/skills"
ln -s "$PWD/.agents/skills/updating-genai-timeline" "$HOME/.codex/skills/updating-genai-timeline"
```

Do not overwrite an existing skill. Keep the checkout available while the symlink is installed. Invoke it with `$updating-genai-timeline` or request a timeline content update normally.

## Checks and publishing

```bash
python3 -m unittest discover -s tests -v
python3 scripts/timeline.py validate
python3 scripts/build_site.py --check
git diff --check
```

The tests use temporary CSV files; they do not edit the canonical timeline or fetch websites. Keep changes scoped and review Git hooks before committing or pushing. A commit, a push, remote CSV readback and live-site verification are separate outcomes. Pushing generated HTML to GitHub `main` publishes through GitHub Pages. Confirm the served HTML and site behavior before claiming the live timeline is updated. Use Search Console URL Inspection after publication to verify Google's view; analytics installation alone does not establish Search Console verification.
