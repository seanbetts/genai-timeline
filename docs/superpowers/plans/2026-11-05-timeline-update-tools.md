# Timeline update tools implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation; follow the approved design below.

**Goal:** Make future editorial research and CSV updates repeatable, reviewable, and mechanically reliable.

**Architecture:** A repository-owned skill links to editorial guidance and an update record. A Python CLI validates CSV, previews JSON batches into digest-bound plans, and applies those plans after checking the current source. A small Node checker runs the existing site's CSV parser against proposed data.

**Tech stack:** Python 3.10+ standard library, Node.js 18+, Markdown and JSON. No website runtime or dependency changes.

**Spec:** The user approved the skill/helper/update-record design in chat and requested AGENTS.md and README.md. The skill captures editorial judgement, a category/month coverage audit, source/date verification, candidate decisions, and separate commit/push authorization.

## Decisions

- Reuse the clean current checkout; no branch, commit, or push is part of this request.
- Canonical skill: `.agents/skills/updating-genai-timeline`; install a local discovery symlink in `~/.codex/skills` if that name is free.
- `scripts/timeline.py validate`, `preview BATCH --out PLAN`, and `apply PLAN` default to this repository's CSV regardless of caller directory.
- Batch format: `additions` contains complete Date/Headline/Link objects; optional `updates` contains exact `match` and complete `replacement` objects. No deletion command.
- Preview is read-only for the CSV and prints a diff; the plan contains source/result SHA-256 digests and the requested changes. Apply recomputes and verifies both digests before an atomic write.
- Preserve existing row bytes, relative order, newline style, trailing-newline convention, and file mode; insert new/moved rows chronologically. Report historical ordering anomalies without silently sorting them.
- Reject malformed fields, impossible dates, embedded line breaks incompatible with the site, invalid URLs, normalized duplicate headlines, ambiguous/conflicting updates, stale plans, and preview output paths that already exist.
- Retain the editor's research-through date independently of the latest selected event. Seed one update record from the actual committed additions, not a reconstructed claim of independent fact verification.

## Review focus

1. Preview and failed apply leave the source byte-identical.
2. A stale or modified plan cannot silently apply a different result.
3. Historical formatting/order survives additions and date corrections.
4. Proposed data is readable by the real site parser, with no website code edits.
5. Ledger distinguishes included, rejected, unresolved, and researched-through; specific exclusions remain specific.

## Task 1: CSV helper

Files: `scripts/timeline.py`, `scripts/check-browser-parser.mjs`, `tests/test_timeline.py`.

- [x] Write CLI integration tests for malformed data, preview/apply, preservation, duplicates, date-moving updates, stale/modified plans, and browser-parser failures.
- [x] Run `python3 -m unittest discover -s tests -v` and observe failure before implementation.
- [x] Implement the CLI and browser checker; rerun the full suite.
- [x] Validate the real CSV and confirm its SHA-256 is unchanged.

## Task 2: Skill and project guidance

Files: `.agents/skills/updating-genai-timeline/SKILL.md`, `agents/openai.yaml`, `docs/timeline-editorial.md`, `docs/timeline-updates/2026-11-05.json`, `AGENTS.md`, `README.md`.

- [x] Use the real session's incomplete first shortlist and a read-only baseline exercise to identify useful guidance.
- [x] Write the concise skill and editorial criteria, with one realistic batch example in the README.
- [x] Seed all accepted/rejected/unresolved decisions from this chat and existing commits.
- [x] Validate the skill and run a fresh-context application/review of the complete result.
- [x] Fix material findings, run all checks, and install the local discovery symlink.

## Verification

- `python3 -m unittest discover -s tests -v`
- `python3 scripts/timeline.py validate`
- Skill creator `quick_validate.py` on the canonical skill directory.
- JSON parse/readback, local Markdown links, `git diff --check`, and byte identity of `timeline.csv` against HEAD.

## Evidence

Implementation and review results will be recorded below. No commits or pushes authorized for this tooling work.

- Task 1: 14 CLI integration tests pass. The initial run failed with the missing helper, and targeted legacy-URL tests failed before the preservation behaviour was implemented.
- Task 2 baseline: the fresh read-only exercise already proposed broad research and specific rejections correctly. No synthetic discipline failure was claimed; the skill is a concise repository reference. This session's earlier incomplete shortlist supplies the actual coverage lesson.
- Ruling: Existing URL quote inconsistencies are warnings on inherited rows and exact-match identities, while additions and replacements reject them. This permits current data to remain byte-identical and allows a separately approved correction; legacy issues remain visible until addressed.
- Ruling: Preserve historical order rather than sort the entire file; the validator reports two inherited inversions. This avoids unrelated historical changes.
- Ruling: Use a repository-owned canonical skill with a local discovery symlink; moving/removing the checkout would require recreating that link.

- Final review: fresh reviewer ran the 14-test suite and all three skill application scenarios. No Critical/Important findings were reported; malformed URL ports were identified as a minor gap.
- Final: Ruling: Treat malformed ports as a correctness issue under the helper's new-source URL contract. Added `test_malformed_source_ports_cannot_be_previewed`, observed RED, validated numeric/range ports, then suite 15/15 GREEN. No deferred findings.
- Final review scope: historical factual accuracy and remote source availability were not re-audited; this task adds tooling. Backfilled decisions were checked against this chat and commits by the author. Live rendering and publishing are outside this unchanged-data task. Plans detect stale/inconsistent edits, not cryptographic editorial authorization. Global installation was independently read back by the author after review.
- Skill creator validation passed using an isolated `uv run --with pyyaml` environment; the helper itself still has no Python package dependencies.
- Both README JSON examples successfully previewed and applied against disposable copies. Local Markdown links and ledger accepted/rejected/unresolved records passed readback.
- Canonical CSV SHA-256 remains `448559c033a8bbf3970c56589ec7b5eb67d6f664d26c5ed002b5c7704b245b8d`, identical to HEAD. Local discovery symlink installed and verified. No commit or push performed.
