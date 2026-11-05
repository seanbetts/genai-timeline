---
name: updating-genai-timeline
description: Use when researching, reviewing, or applying content updates to The Blueprint Generative AI Timeline, including requests to catch up the timeline or assess coverage. Excludes website UI and general AI news questions.
---

# Updating the Generative AI Timeline

Maintain a curated historical record of meaningful changes in AI. Use the existing timeline as editorial evidence, with significance assessed against what was established at the time.

## Context

The canonical skill lives in `.agents/skills/updating-genai-timeline` in the repository. Resolve any local skill symlink to find that checkout. Run commands from its root.

Read [editorial guidance](../../../docs/timeline-editorial.md), the latest relevant records in [the update directory](../../../docs/timeline-updates/), and the current `timeline.csv`. `AGENTS.md` describes the repository and publication boundary.

## Research and review

- Set an explicit research window. Start from the last recorded research-through date, revisiting unresolved candidates and any known omissions. The latest selected event is a separate date, not proof of coverage.
- Use supplied presentations and announcements as candidates. Complete a month/category coverage pass before presenting a catch-up shortlist; review models, agents, creative tools, infrastructure, science, adoption, industry, law, and safety beyond the supplied companies.
- Verify source contents and event dates. Prefer primary sources; independently contextualise extraordinary capability or scientific claims. Distinguish announcement, preview, availability, agreement, completion, proposed result, and confirmed outcome.
- Compare candidates with existing entries and decision records. A rejection applies to its named event, not its company, author, model family, or later releases. Note significant changes that might justify reconsideration.
- Present dated draft headlines, source links, inclusion reasons, and material uncertainties. Check developments that complete existing stories. Describe the scope and gaps behind any coverage assessment.

## Apply accepted decisions

Prepare a JSON batch using the [README example](../../../README.md#updating-the-data). Additions and exact-match updates are supported; the helper performs no research or approval decisions.

```bash
python3 scripts/timeline.py validate
python3 scripts/timeline.py preview /tmp/timeline-batch.json --out /tmp/timeline-plan.json
python3 scripts/timeline.py apply /tmp/timeline-plan.json
python3 scripts/timeline.py validate
```

Show the preview before applying unapproved candidates. Existing approval of the specific entries is sufficient; do not ask for it again. If the CSV changes after preview, regenerate and review the plan. The helper preserves historical rows and reports legacy warnings; investigate those separately within the requested scope.

Create or update a dated JSON record in `docs/timeline-updates/` with the research window, category checks, accepted events and sources, specific rejections, unresolved candidates, and publication status. The current record is an example, not a fixed schema requiring every historical detail.

Report what changed, checks performed, unresolved issues, and whether the work is local, committed, pushed, or live-verified. Commit and push require their own user authorization; check hooks first. The page fetches CSV from GitHub `main`, including when served locally.
