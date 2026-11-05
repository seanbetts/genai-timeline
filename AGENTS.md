# Working in this repository

This is The Blueprint's static Generative AI Timeline. `timeline.csv` is the canonical event data; `index.html`, `styles.css`, and `scripts.js` render it. There is no build step or package installation.

## Timeline content work

Use the repository skill at [.agents/skills/updating-genai-timeline/SKILL.md](.agents/skills/updating-genai-timeline/SKILL.md) for research, coverage reviews, and content updates. Its editorial guidance and dated decision records preserve the timeline's scope and the editor's choices. This does not apply to unrelated UI work.

Use `python3 scripts/timeline.py validate` and the preview/apply workflow documented in [README.md](README.md#updating-the-data). Do not use ad hoc whole-file CSV rewrites. Preserve unrelated edits and existing historical choices. Additions need editorial authorization; specific entries already approved in the chat do not need repeat approval.

The helper reports legacy ordering and source-URL warnings without silently changing them. New entries and replacements must pass stricter validation. Source/date verification and editorial selection remain human/agent work, not claims made by the validator.

## Verification

- Helper or checker changes: `python3 -m unittest discover -s tests -v`.
- CSV changes: `python3 scripts/timeline.py validate` and inspect the preview/diff.
- Skill changes: use the available skill-creator validator and a realistic read-only application scenario.
- Human documentation changes: check examples and links; no prose-matching tests.

## Publication

`scripts.js` fetches `https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv`. This is also true when the page is served locally: distinguish local CSV checks, browser evidence, remote readback, and live-site verification.

Commit and push are separate actions requiring user authorization. Check Git hooks for side effects before either. Do not infer publication permission from approval to research or edit. Do not claim the live site changed without readback.
