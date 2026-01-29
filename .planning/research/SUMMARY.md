# Project Research Summary

**Project:** Manifest Parser Extension - v1.1 Metadata Fix
**Domain:** Chrome Extension DOM Scraping for Auction Site Metadata
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

This Chrome extension scrapes bid prices and shipping fees from 11 liquidation retailers across 4 distinct platform architectures. The critical issue is that 9 of 11 retailers currently return $0 for metadata due to incorrect CSS selectors and unverified JSON extraction paths. Research confirms this is fundamentally a data investigation task, not an architecture problem.

The recommended approach has three pillars: (1) Use `__NEXT_DATA__` JSON parsing for B-Stock Next.js retailers (AMZ, TGT, RC, COSTCO, ATT) instead of DOM selectors - this requires verifying actual field names against live pages; (2) Fix B-Stock Classic selectors (ACE, BY, JCP, QVC) to use `#current_bid_amount` and `.auction-data-label` traversal instead of generic class matchers; (3) Address AMZD CSV parsing issues (row truncation from embedded newlines, column bleeding from unquoted commas) separately from DOM extraction. The existing right-anchor extraction strategy for AMZD is sound but needs validation against real data.

Key risks are: timing issues where content scripts extract before dynamic content loads, Next.js JSON field paths varying by retailer without documentation, and CSV parsing edge cases masking data loss. Mitigation involves MutationObserver polling with timeouts for dynamic content, per-retailer JSON path mapping with defensive traversal, and pre-processing AMZD CSVs before PapaParse. E2E testing against live auction sites should use HTML snapshots for deterministic tests, with manual live verification as a pre-release gate.

## Key Findings

### Recommended Stack

Chrome extension content scripts with a two-world execution pattern (ISOLATED for DOM access, MAIN for JavaScript interception) are the right architecture. The critical insight is that B-Stock Next.js sites embed all auction data in `__NEXT_DATA__` JSON, making structured data extraction far more reliable than CSS selectors.

**Core technologies:**
- **`__NEXT_DATA__` JSON parsing**: Primary extraction method for B-Stock Next.js retailers - data is server-rendered and survives all layout redesigns
- **MutationObserver + polling**: Wait for dynamic DOM elements to populate on non-Next.js pages - event-driven approach more reliable than fixed delays
- **Playwright with persistent context**: E2E testing framework for Chrome extensions - must run headed with `--load-extension` flag
- **PapaParse**: CSV parsing library - already in use, but AMZD files need pre-processing before parsing
- **Tiered selector strategy**: Structured data (JSON) > data-* attributes > ID selectors > fallback chains > regex patterns

**Version requirements:**
- Playwright latest (new addition for E2E verification)
- Vitest 1.2.2 (existing, for snapshot tests)
- No new runtime dependencies needed

### Expected Features

Research reveals a clear feature hierarchy based on 4 platform types:

**Must have (table stakes):**
- Bid price extraction for all 10 auction retailers (AMZD is fixed-price)
- Shipping fee extraction for all 11 retailers
- Correct selectors for B-Stock Classic sites (ACE, BY, JCP, QVC) - `#current_bid_amount` and `.auction-data-label` sibling traversal
- Verified `__NEXT_DATA__` field paths for Next.js sites (AMZ, ATT, COSTCO, RC, TGT) - requires live page inspection
- Handle "Opening bid" vs "Current bid" labels (QVC shows "Opening bid" when no bids yet)
- Handle "Free Shipping" / "Shipping Included" - return 0 (not null) to distinguish from extraction failure
- Parse currency strings robustly - handle $, commas, whitespace, "TBD", "N/A"

**Should have (competitive):**
- B-Stock fee extraction (`#buyersPremiumLabelResult` on Classic, JSON field on Next.js) - buyer's premium is hidden cost
- Expandable section handling for Next.js shipping - data behind `[data-testid="toggle-button"]` toggle
- Retry/polling for async-loaded data - some B-Stock pages load bid data after initial render
- Bid count extraction (`#bid_number` on Classic, regex pattern on TechLiquidators)

**Defer (v2+):**
- Real-time bid tracking - creates excessive requests, risk of rate limiting
- Historical bid data - store extracted bids over time for trend analysis

**Anti-features (do not build):**
- Scraping from network requests - requires webRequest permissions, harder to debug than `__NEXT_DATA__`
- Auto-refresh to track bid changes - may trigger account suspension
- Shadow DOM traversal - B-Stock doesn't use shadow DOM, premature optimization

### Architecture Approach

The codebase uses a hub-and-spoke architecture where popup.ts (1350 lines) orchestrates tab lifecycle, script injection, and ZIP creation. Content scripts run in two execution worlds: ISOLATED for DOM extraction, MAIN for JavaScript interception (blob capture for Amazon downloads).

**Major components:**
1. **Popup (popup.ts)** — UI, orchestration, tab management, ZIP creation; currently monolithic
2. **Retailer Modules (retailers/sites/)** — Site-specific extraction logic; exports `extractMetadata()` and `downloadManifest()`
3. **Service Worker (service-worker.ts)** — File download/parse via message passing; handles DOWNLOAD_MANIFEST, PARSE_FILE, FETCH_PAGE_TITLES
4. **Parsers (parsers/)** — CSV/XLSX reading with field mapping; AMZD uses right-anchor extraction for misaligned columns
5. **Unified Transform (unified/)** — ManifestItem[] to UnifiedManifestRow[] pipeline with clean/dedup/sort
6. **ZIP Export (utils/)** — JSZip creation, raw metadata appending to first CSV row

**Critical data flow:**
DOM -> `extractMetadata()` [ISOLATED] -> MetadataResult {bidPrice, shippingFee} -> popup.ts -> `?? 0` null coalescing -> output CSV. The `?? 0` conversion at 5 distinct locations is the primary source of the "0 values" bug - output cannot distinguish "actually $0" from "extraction failed."

**Anti-patterns identified:**
- Monolithic popup.ts mixing UI, orchestration, and data processing
- Duplicated `conditionToAbbrev()` in 3+ files with slight variations
- Silent metadata failure (null -> 0 conversion hides extraction errors)
- Two CSV parsers (PapaParse for manifest parsing, hand-rolled for raw metadata appending)

### Critical Pitfalls

1. **Content script extracts before dynamic DOM values are populated** — Selectors like `#current_bid_amount` return empty strings because scripts run before AJAX completes. The `#shipping_fee` element lives in an un-rendered popup that never loads without user interaction. Use MutationObserver polling (max 5s timeout) waiting for elements to contain `$` character, not merely exist. Return `null` (not `0`) when extraction fails.

2. **Next.js `__NEXT_DATA__` JSON path differs per retailer** — B-Stock Next.js sites embed auction data in `__NEXT_DATA__`, but JSON structure varies by retailer. Hardcoding `props.pageProps.auction.currentBid` works for one retailer but returns `undefined` for another where path is `props.pageProps.auctionDetail.bidAmount`. Map JSON paths per retailer, use defensive traversal with optional chaining, validate extracted values are numeric.

3. **AMZD CSV row loss from embedded newlines in product titles** — Amazon CSVs contain unquoted newlines that PapaParse treats as row boundaries, splitting one data row into 2-3 fragments. Fragment rows fail ASIN detection and get discarded. Pre-process raw CSV before PapaParse: identify lines without ASIN and merge with preceding line. Validate row count against ASIN count in raw text.

4. **AMZD column bleeding from unquoted commas in titles** — Product titles like "Duracell Coppertop AA, 28 Count Pack" shift all columns right. Right-anchor extraction is already implemented and correct. Validate extracted values: price should be $0.01-$100,000, qty should be positive integer.

5. **E2E tests against live auction sites are non-deterministic** — Auctions end (URLs 404), bid prices change, B-Stock deploys UI updates, rate limiting blocks extension. Use snapshot fixtures (save HTML snapshots for automated tests) + manual live verification (pre-release gate). Never gate CI on live site availability.

## Implications for Roadmap

Based on research, the metadata fix should be decomposed into 3 independent workstreams:

### Phase 1: B-Stock Classic Selector Fix
**Rationale:** Simplest fix with highest impact - corrects 4 of 9 broken retailers with straightforward CSS selector changes.
**Delivers:** ACE, BY, JCP, QVC return correct bid_price and shipping_fee
**Addresses:**
- Fix `bstock-auction.ts` selectors to use `#current_bid_amount` (not `[class*="bid-amount"]`)
- Use `.auction-data-label` text match for "Current bid"/"Opening bid" -> sibling `.auction-data-content`
- Use `.auction-data-label` text match for "Shipping Cost" -> sibling value
**Avoids:** Pitfall 1 (dynamic content timing) by using server-rendered elements that exist on page load

### Phase 2: B-Stock Next.js JSON Verification
**Rationale:** Requires live page inspection but fixes 5 retailers with one pattern once verified.
**Delivers:** AMZ, ATT, COSTCO, RC, TGT return correct bid_price and shipping_fee from `__NEXT_DATA__`
**Uses:**
- Browser DevTools inspection of `__NEXT_DATA__` JSON structure
- Per-retailer JSON path mapping in config object
- Defensive traversal with optional chaining
**Implements:** Structured data extraction (most reliable pattern from STACK.md)
**Avoids:** Pitfall 2 (JSON path variance) by mapping paths per retailer instead of hardcoding

### Phase 3: AMZD CSV Parsing Fix
**Rationale:** Independent of DOM extraction; addresses separate data integrity issue.
**Delivers:** AMZD manifests parse without row truncation or column bleeding
**Addresses:**
- Pre-process raw CSV to merge split rows (embedded newlines)
- Validate right-anchor extraction values (price range, qty is integer)
- Compare parsed row count against ASIN count in raw text
**Avoids:** Pitfall 3 (row loss from newlines) and Pitfall 4 (column bleeding from commas)

### Phase 4: E2E Verification (Optional)
**Rationale:** Snapshot-based tests provide deterministic validation; live verification is manual gate.
**Delivers:**
- HTML snapshot fixtures for each retailer type
- Automated tests against snapshots
- Manual live verification script
**Uses:** Playwright with `--load-extension` for Chrome extension testing
**Avoids:** Pitfall 5 (E2E flakiness) by separating automated deterministic tests from manual live checks

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** B-Stock Classic is simpler (pure CSS, no JSON parsing), validates the extraction pattern before tackling Next.js
- **Phase 3 independent:** AMZD parsing is separate concern from DOM extraction; can run in parallel
- **Phase 4 optional:** E2E tests prevent regression but aren't required to fix current bugs; should follow fixes, not block them

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Next.js):** Requires live page inspection to confirm exact JSON field paths - cannot be determined from codebase analysis alone
- **Phase 3 (AMZD):** Need to test pre-processing logic against actual malformed CSV in `csvs/AMZD_161-Units-Pc-Electronics-Wireless-RD.csv`

Phases with standard patterns (skip research-phase):
- **Phase 1 (Classic):** CSS selector fixes are well-documented, selectors already verified in RETAILER-SELECTORS.md
- **Phase 4 (E2E):** Playwright extension testing pattern is standard, documented in official Chrome/Playwright guides

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `__NEXT_DATA__` extraction pattern confirmed by multiple sources, codebase already attempts it |
| Features | HIGH | Based on codebase analysis + verified DOM selectors from RETAILER-SELECTORS.md (2026-01-28) |
| Architecture | HIGH | Full source code analysis, complete data flow trace from DOM to output CSV |
| Pitfalls | HIGH | Root causes identified through code analysis, confirmed by web scraping best practices |

**Overall confidence:** HIGH

### Gaps to Address

- **Next.js JSON field names are unverified:** The current code searches for `currentBid`, `winningBid`, `shippingCost` but these are educated guesses. Phase 2 must inspect live pages to confirm exact field names in `__NEXT_DATA__.props.pageProps.dehydratedState.queries[].state.data`.

- **B-Stock Classic `#shipping_fee` may be inaccessible:** This element is in a bid confirmation popup that never renders on page load. Research suggests using `.auction-data-label` "Shipping Cost" sibling instead (visible on main page), which the code already does in `bstock.ts` but not in `bstock-auction.ts`.

- **AMZD CSV pre-processing logic needs implementation:** No existing pre-processor for embedded newlines. Phase 3 must implement ASIN boundary detection to merge split rows before PapaParse.

- **Timing for dynamic content load unknown:** The 1500ms `POST_LOAD_DELAY_MS` may be insufficient for slow-loading auctions. Phase 1/2 should add polling with 5s timeout instead of fixed delay.

- **Null-to-zero conversion hides failures:** The `?? 0` operator at 5 locations converts extraction failures to 0. Consider returning `null` through pipeline and displaying "N/A" in output, or adding diagnostic logging so users can distinguish "free shipping" from "extraction failed."

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:**
  - `/home/sean/Projects/manifest-parser/src/popup/popup.ts` - Main orchestration (1350 lines)
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/bstock.ts` - B-Stock unified extractor (correct Classic selectors, unverified Next.js fields)
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/bstock-auction.ts` - B-Stock Classic extractor (wrong selectors)
  - `/home/sean/Projects/manifest-parser/src/parsers/amzd-parser.ts` - AMZD-specific parsing with right-anchor
  - `/home/sean/Projects/manifest-parser/docs/RETAILER-SELECTORS.md` - Verified DOM selectors (2026-01-28)
  - `/home/sean/Projects/manifest-parser/docs/retailer-selectors-data.json` - Structured selector data with DOM details
- **Chrome official docs:**
  - [Content Scripts Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
  - [Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- **MDN Web Docs:**
  - [Content Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)

### Secondary (MEDIUM confidence)
- [Playwright Chrome Extension E2E Testing (DEV Community)](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl) - Community pattern
- [BrowserStack Playwright Extension Testing Guide](https://www.browserstack.com/guide/playwright-chrome-extension) - Vendor docs
- [Scraping Next.js Sites in 2025 (Trickster Dev)](https://www.trickster.dev/post/scraping-nextjs-web-sites-in-2025/) - Community expertise
- [CSS Selector Resilience Guide (Rebrowser)](https://rebrowser.net/blog/css-selector-cheat-sheet-for-web-scraping-a-complete-guide) - Industry guide
- [PapaParse GitHub: CSV column bleeding issues](https://github.com/mholt/PapaParse/issues/998)
- [PapaParse GitHub: Missing/extra column detection](https://github.com/mholt/PapaParse/issues/653)
- [GMass: Getting content script timing right](https://www.gmass.co/blog/timing-gmail-chrome-extension-content-script/)
- [6 Lessons from production Chrome extension scraping](https://dev.to/amin_mashayekhan/6-lessons-learned-from-building-a-production-grade-chrome-extension-with-web-scraping-2jmn)

### Tertiary (LOW confidence)
- [Next.js v13 Scraping (Hacker News)](https://news.ycombinator.com/item?id=37883999) - Community discussion
- [Building Scrapers That Survive Redesigns (HasData)](https://medium.com/@hasdata/how-to-build-an-e-commerce-scraper-that-survives-a-website-redesign-86216e96cbd9) - Single blog post
- [From flaky E2E tests to confident development](https://medium.com/connecteam-engineering/from-flaky-e2e-tests-to-confident-development-rethinking-our-testing-strategy-1ed5bf62b834)
- [NextScraper: extracting __NEXT_DATA__ from Chrome extension](https://github.com/peterrauscher/NextScraper)
- [B-Stock Solutions - How It Works](https://canvasbusinessmodel.com/blogs/how-it-works/b-stock-solutions-how-it-works)
- [B-Stock Shipping Methods](https://bstock.com/blog/buying-basics-auction-lot-shipping-methods/)
- [Common CSV Import Errors - Flatfile](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/)
- [Common CSV Errors - Row Zero](https://rowzero.com/blog/common-csv-errors)

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
