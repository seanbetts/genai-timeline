# Static timeline SEO implementation plan

**Goal:** Publish crawlable static timeline content with progressive search.
**Spec:** ../specs/2026-11-05-static-seo-design.md
**Architecture:** CSV -> validated generator -> committed HTML and sitemap. DOM-based search.
**Constraints:** Existing Python 3.10+/Node18+, no packages or framework. Preserve CSV bytes. No commit/push.

## Review focus
Escaped user content; reproducible output; stale output in CI; no-JS visibility; search plus hash navigation on mobile.

- [x] Write generator contract tests: static entries and source links, stable unique IDs, XSS escaping including JSON-LD, correct ordering, stale-output detection, explicit revision-date sitemap.
- [x] Run tests to establish failures; implement template/generator and move CSV compatibility parser out of browser code. Retain helper checks against that generator parser.
- [x] Add progressive search, labels, year navigation and anchor semantics; maintain style at desktop/mobile sizes.
- [x] Add robots, metadata, JSON-LD and social card; update maintenance docs/skill and CI freshness checks.
- [x] Run helper/generator tests, validate canonical CSV and generated freshness, and exercise search, empty results, anchors, no-JS, mobile layout and console health in a browser.
- [x] Independent final review; fix findings; report local-only status.

## Evidence and rulings

- User's “Let's do it” authorised the static-site recommendation and identified changes in the preceding audit; implementation proceeded within that scope. No commit or push.
- 20 unittest contracts pass; generator freshness check and canonical CSV validation pass. CSV SHA-256 remains `448559c033a8bbf3970c56589ec7b5eb67d6f664d26c5ed002b5c7704b245b8d`.
- Browser plugin not available; used regular Playwright CLI. Desktop 1440×1000 and mobile 390×844 screenshots inspected. Search “ChatGPT” gives 30 entries; empty results work; following a milestone fragment restores all 388 entries. No-JavaScript context displays all 388 entries and hides unavailable search.
- Existing Google Analytics request fails DNS in this browser environment; no application errors observed. No live publication, Google indexing or Core Web Vitals claim.
- Fresh read-only reviewer found no Important issues; identified potential sticky-header overlap. Increased desktop offset to 205px; browser measurements show header bottom187px, year/milestone top221px, and mobile header127px/target156px. Same-document reload restored old scroll position; fresh navigation verified corrected anchor placement.
- Shared parser moved into scripts/csv-parser.js and is used by both helper validation and publication; existing --browser-script argument remains supported for fixtures/compatibility. Legacy malformed quote is interpreted consistently without changing source CSV.
- Skill validator passes; read-only future-update scenario confirms date update, regeneration/check and generated files must accompany approved CSV edits. CI catches stale output but is not a GitHub Pages deployment gate, documented explicitly.
- Social artwork is code-authored and rendered to a 1200×630 PNG with Playwright; no image-generation service or new runtime package needed.

## Scope correction after local inspection

The editor rejected the added visible content, navigation, permalink controls and changed search appearance. Restored original header markup, CSS, search placeholder and input type, headline paragraphs and empty-state copy. Removed introduced navigation, footer, introduction, visible permalink controls and search count. Search again alternates filtered entries from left to right and retains original substring matching. Generated static HTML and invisible SEO metadata remain. Prior assertions about authorisation of visible changes were an implementation error; the user explicitly requires visual and functional preservation. Corrections remain uncommitted for inspection.

Correction verification: 21 tests pass. Playwright comparison against the pre-SEO commit at 1440px and 390px confirms identical header/search geometry, original placeholder, and first 12 visible cards (text, dates, link/circle positions and card bounds), both unfiltered and searching ChatGPT. Empty-state copy also matches. Local server remains on 8873; no commit or push of corrections.

Following editor approval, restored the original browser title and sharing image, updated image dimensions to the original asset, and removed the unused replacement artwork and its template. Retained meta description, structured data, sitemap, robots.txt and static generation.
