# Pitfalls Research

**Domain:** Chrome extension DOM scraping, CSV parsing, E2E testing against live auction sites
**Researched:** 2026-01-29
**Confidence:** HIGH (codebase-verified issues + verified web sources)

## Critical Pitfalls

### Pitfall 1: Content Script Extracts Before Dynamic DOM Values Are Populated

**What goes wrong:**
Selectors like `#current_bid_amount` and `#shipping_fee` return empty strings or 0 because the content script runs before client-side JavaScript populates those elements. The element exists in the HTML skeleton but its `textContent` is empty. This is the root cause of 9/11 retailers returning 0 for bid_price and/or shipping_fee.

**Why it happens:**
Chrome's default `document_idle` fires after DOMContentLoaded but before all AJAX calls complete. B-Stock auction pages populate bid/shipping values via JavaScript after initial page render. The `#shipping_fee` element specifically lives inside a bid confirmation popup that is never rendered unless the user clicks "Place Bid."

**How to avoid:**
- Poll or use `MutationObserver` with a timeout (max 5 seconds) waiting for `#current_bid_amount` to contain a `$` character, not merely exist in the DOM.
- For `#shipping_fee` in the popup: this element may never populate without user interaction. Investigate alternative data sources -- look for the value in page JavaScript variables, hidden inputs, or API responses visible in the Network tab.
- Return `null` (not `0`) when extraction fails so downstream code can distinguish "not found" from "genuinely $0.00."

**Warning signs:**
- Values work intermittently (race condition between script injection and AJAX completion).
- `document.querySelector('#shipping_fee')` returns an element but `.textContent` is `""`.
- Works on page reload but not first navigation.

**Phase to address:**
Selector fix phase. Must audit each retailer's timing behavior on live pages before writing new selectors.

---

### Pitfall 2: Next.js `__NEXT_DATA__` JSON Path Differs Per Retailer

**What goes wrong:**
B-Stock Next.js sites (AMZ, ATT, COSTCO, RC, TGT) embed auction data in `<script id="__NEXT_DATA__">`, but the JSON structure varies by retailer. Hardcoding a single JSON path like `props.pageProps.auction.currentBid` works for one retailer but silently returns `undefined` for another where the path is `props.pageProps.auctionDetail.bidAmount`.

**Why it happens:**
Each B-Stock Next.js storefront may use different page component names and data shapes. The `__NEXT_DATA__` tag is reliably present on initial page load (it is a DOM element, not a JS variable, so content scripts can read it directly). But the internal JSON structure is not standardized across storefronts.

**How to avoid:**
- Map JSON paths per retailer. Inspect `__NEXT_DATA__` on a live page for each of the 5 Next.js retailers and document the exact path to bid price and shipping fee.
- Use defensive traversal with optional chaining: `data?.props?.pageProps?.auction?.currentBid`.
- Add a validation step: if the extracted value is `undefined` or not a number, log which JSON path was attempted and return `null`.
- Store JSON paths in retailer config (not inline code) so they can be updated without code changes.

**Warning signs:**
- One Next.js retailer works, others return `undefined`.
- Extraction returns the wrong value (grabbing a different numeric field).

**Phase to address:**
Selector fix phase. Requires live page inspection for each Next.js retailer.

---

### Pitfall 3: AMZD CSV Row Loss from Embedded Newlines in Product Titles

**What goes wrong:**
Amazon Direct CSVs contain product titles with embedded newlines that are not properly quoted. PapaParse treats each newline as a row boundary, splitting one data row into 2-3 fragment rows. Fragment rows fail ASIN detection and get discarded, explaining the loss of ~400 rows from a 1000+ row manifest.

**Why it happens:**
The AMZD manifest source exports fields with newlines but does not wrap them in double quotes per RFC 4180. The current `readCsv` function passes raw text to PapaParse with default settings. PapaParse correctly interprets unquoted newlines as row terminators. The `skipEmptyLines: true` setting then discards some fragments, and `parseAmzdRow` discards others that lack an ASIN.

**How to avoid:**
- Pre-process the raw CSV before PapaParse: identify lines that do not contain an ASIN (regex `B0[A-Z0-9]{8}`) and merge them with the preceding line.
- Alternatively, parse with `header: false` first, then reconstruct rows by scanning for ASIN boundaries. Each ASIN marks the start of a new logical row.
- After parsing, validate: compare `results.data.length` against expected row count. Log a warning if the count is significantly lower than the number of ASINs found via regex in the raw text.
- Check `results.errors` for `TooFewFields` entries -- these indicate split rows.

**Warning signs:**
- Row count after parsing is 40-60% of expected.
- `results.errors` contains many `TooFewFields` entries.
- Some rows have ASIN but no price, or price but no ASIN.

**Phase to address:**
AMZD parser fix phase. This must be fixed before metadata extraction since it affects raw data integrity.

---

### Pitfall 4: AMZD Column Bleeding from Unquoted Commas in Titles

**What goes wrong:**
Product titles like `"Duracell Coppertop AA, 28 Count Pack"` contain commas that shift all subsequent columns right. Price appears in the quantity column, quantity in the next column, etc.

**Why it happens:**
Source CSV does not quote fields containing commas. The existing `amzd-parser.ts` uses right-anchor extraction to handle this (reading qty and price from fixed positions relative to the end of the row), which is the correct approach.

**How to avoid:**
- Right-anchor extraction is already implemented and is sound. Validate it by adding sanity checks: extracted price should be numeric and in a reasonable range ($0.01 - $100,000), qty should be a positive integer.
- If `extractRightAnchored` returns a value that fails sanity checks, log a warning with the raw cell values for debugging.
- Test against the actual AMZD CSV in `csvs/AMZD_161-Units-Pc-Electronics-Wireless-RD.csv`.

**Warning signs:**
- Price values are unreasonably large (title fragment parsed as number).
- Quantity contains text fragments.
- Row cell count varies significantly (visible in `TooManyFields` errors).

**Phase to address:**
AMZD parser fix phase. Validate right-anchor positions against real data.

---

### Pitfall 5: E2E Tests Against Live Auction Sites Are Non-Deterministic

**What goes wrong:**
Tests pass today, fail tomorrow. Auctions end (URLs 404), bid prices change minute-to-minute, B-Stock deploys UI updates, rate limiting blocks the extension. CI pipelines become noise generators.

**Why it happens:**
Live auction sites are not controlled test environments. There is no way to freeze page content, guarantee URL availability, or prevent site updates.

**How to avoid:**
- **Snapshot fixtures:** Save HTML snapshots of real auction pages for each retailer type. Load from local files during automated tests. Tests become deterministic.
- **Live verification as manual gate:** Keep a separate script that runs against current Google Sheet URLs. Run manually before release, not in CI. Update snapshots when pages change.
- **Two-tier strategy:**
  1. Automated (CI): Unit tests parse known HTML strings + snapshot fixtures. Fast, deterministic.
  2. Manual (pre-release): Live URL verification confirms selectors still work. Updates snapshots.
- Never gate CI on live site availability.

**Warning signs:**
- Tests pass locally but fail in CI with no code changes.
- Team starts ignoring failures ("probably the site is down").
- Same test alternates pass/fail across runs.

**Phase to address:**
E2E verification phase. Create snapshot fixtures first, then do one-time live verification to seed them.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Returning `0` for failed extraction | No error handling code | Cannot distinguish "free shipping" from "extraction failed"; silently loses data | Never -- use `null` for not-found |
| Single `readCsv` for all retailers | Simple code | AMZD needs pre-processing that other retailers do not; one function cannot serve both | Never for AMZD -- give it a dedicated parser entry point |
| Hardcoded CSS selectors | Fast to write | Breaks on site redesign with no warning | Always necessary, but isolate in per-retailer config objects |
| `skipEmptyLines: true` | Cleaner PapaParse output | Masks row loss from embedded newlines | Only acceptable if row count is validated after parse |
| No PapaParse error inspection | Simpler code path | `TooFewFields` and `TooManyFields` errors go unnoticed, hiding data corruption | Never -- always log or inspect `results.errors` |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Content script timing | Extracting immediately at `document_idle` | Wait for target elements to have non-empty content (poll/MutationObserver with timeout) |
| `__NEXT_DATA__` extraction | Assuming identical JSON structure across all Next.js retailers | Map JSON paths per retailer; validate extracted values |
| PapaParse + AMZD | Using default parse settings on non-standard CSV | Pre-process raw text (merge split rows, handle unquoted commas) before PapaParse |
| `chrome.scripting.executeScript` | Injecting right after `tabs.create` | Wait for `tabs.onUpdated` with `status: "complete"` before injecting |
| B-Stock Classic `#shipping_fee` | Querying on page load | Element is inside an un-rendered popup; content is empty until popup activates |
| PapaParse `header: true` | Trusting auto-detected headers | AMZD misaligned rows create phantom headers; parse headerless first for AMZD |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling DOM without timeout | Tab hangs, extension unresponsive | Max 5s timeout on all wait loops | When element never appears (auction ended, wrong page) |
| Opening 20+ tabs for batch processing | Chrome throttles background tabs, scripts timeout | Process 3-5 tabs concurrently, queue the rest | Over ~10 concurrent tabs |
| Synchronous CSV parse of 1000+ row AMZD | UI freezes | Use PapaParse `worker: true` or chunk processing | Files over ~500 rows |

## "Looks Done But Isn't" Checklist

- [ ] **Selector returns element:** Verify `.textContent` is non-empty and contains expected format (starts with `$`, is numeric)
- [ ] **CSV parses successfully:** Verify row count matches expected; check `results.errors` for `TooFewFields` / `TooManyFields`
- [ ] **Metadata value is a number:** Verify it is not `0` when it should have a real value; `null` means not-found, `0` means genuinely zero
- [ ] **Right-anchor extraction returns value:** Verify price is numeric and in range $0.01-$100,000; qty is positive integer
- [ ] **E2E test passes today:** Save the HTML as a snapshot fixture so it passes deterministically tomorrow
- [ ] **`__NEXT_DATA__` parsed:** Verify the JSON contains auction-specific fields (not a 404 page or generic shell)
- [ ] **AMZD row count:** Compare parsed rows against ASIN count in raw text; should be within 5%

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Selectors return 0 for all retailers | LOW | Audit live pages, update selectors/timing, re-test |
| `__NEXT_DATA__` JSON paths wrong | LOW | Inspect live page JSON, update per-retailer path config |
| AMZD rows truncated | MEDIUM | Add pre-processing step to merge split rows before PapaParse |
| AMZD columns bleeding | LOW | Validate and adjust right-anchor offsets against real CSV |
| E2E tests all flaky | MEDIUM | Replace live tests with HTML snapshot fixtures |
| Silent 0 returns masking failures | LOW | Change return type from `number` to `number | null`, update callers |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Content script timing (Pitfall 1) | Selector fix | Each B-Stock Classic retailer returns non-zero bid_price on live page |
| `__NEXT_DATA__` paths (Pitfall 2) | Selector fix | Each Next.js retailer returns correct bid/shipping from JSON |
| AMZD row truncation (Pitfall 3) | AMZD parser fix | Parsed row count within 5% of ASIN count in raw text |
| AMZD column bleeding (Pitfall 4) | AMZD parser fix | Right-anchor values match manual CSV inspection |
| E2E flakiness (Pitfall 5) | E2E verification | Snapshot-based tests pass deterministically; live check passes manually |
| Silent 0 returns (debt pattern) | Selector fix | Extraction returns `null` for not-found, `0` only for genuine zero |

## Sources

- [PapaParse GitHub: CSV broken in 5.4.1 (column bleeding)](https://github.com/mholt/PapaParse/issues/998) -- HIGH confidence
- [PapaParse GitHub: Missing/extra column detection](https://github.com/mholt/PapaParse/issues/653) -- HIGH confidence
- [PapaParse common parsing issues](https://app.studyraid.com/en/read/11463/359371/common-parsing-issues) -- MEDIUM confidence
- [Chrome: content_scripts manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) -- HIGH confidence
- [GMass: Getting content script timing right](https://www.gmass.co/blog/timing-gmail-chrome-extension-content-script/) -- MEDIUM confidence
- [6 Lessons from production Chrome extension scraping](https://dev.to/amin_mashayekhan/6-lessons-learned-from-building-a-production-grade-chrome-extension-with-web-scraping-2jmn) -- MEDIUM confidence
- [From flaky E2E tests to confident development](https://medium.com/connecteam-engineering/from-flaky-e2e-tests-to-confident-development-rethinking-our-testing-strategy-1ed5bf62b834) -- MEDIUM confidence
- [NextScraper: extracting __NEXT_DATA__ from Chrome extension](https://github.com/peterrauscher/NextScraper) -- MEDIUM confidence
- Codebase: `src/parsers/amzd-parser.ts`, `src/parsers/csv-reader.ts` -- HIGH confidence (direct inspection)

---
*Pitfalls research for: Chrome extension DOM scraping, CSV parsing, E2E testing*
*Researched: 2026-01-29*
