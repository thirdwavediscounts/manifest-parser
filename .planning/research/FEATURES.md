# Feature Research: DOM Metadata Extraction for Auction Sites

**Domain:** Chrome extension DOM scraping for bid price and shipping fee across 11 liquidation retailers
**Researched:** 2026-01-29
**Confidence:** HIGH (based on codebase analysis + verified DOM selector data from 2026-01-28)

## Platform Architecture Summary

The 11 retailers fall into 4 distinct platform types, each requiring different extraction strategies:

| Platform Type | Retailers | Extraction Method | Bid Data Source | Shipping Data Source |
|---------------|-----------|-------------------|-----------------|---------------------|
| B-Stock Classic | ACE, BY, JCP, QVC | DOM selectors | `.auction-data-label` sibling traversal | `.auction-data-label` with "Shipping Cost" text |
| B-Stock Next.js | AMZ, ATT, COSTCO, RC, TGT | `__NEXT_DATA__` JSON parse | `listing.currentBid` / `listing.winningBid` | `listing.shippingCost` / `listing.estimatedShipping` |
| Amazon Product Page | AMZD | N/A (fixed price) | N/A -- not auction | `#delivery-message` / `#mir-layout-DELIVERY_BLOCK` |
| Custom (TechLiquidators) | TL | DOM class selectors | `.lot-pricing-box-item` with "bid" text | `.lot-pricing-box-item` with "shipping" text |

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bid price extraction for all auction retailers | Core value prop -- user needs bid price for profit calculations | MEDIUM | 10 of 11 retailers are auction-based (AMZD is fixed-price) |
| Shipping fee extraction for all retailers | Shipping is major cost factor in liquidation bidding | MEDIUM | Some retailers hide shipping behind expandable sections |
| Correct selectors for B-Stock Classic sites | ACE/BY/JCP/QVC share identical DOM structure | LOW | `#current_bid_amount` and `.auction-data-label` "Shipping Cost" sibling |
| Correct `__NEXT_DATA__` parsing for Next.js sites | AMZ/ATT/COSTCO/RC/TGT all use same JSON structure | MEDIUM | Need to identify correct query key and field names in dehydrated state |
| Handle "Opening bid" vs "Current bid" labels | QVC and others show "Opening bid" when no bids placed yet | LOW | Already handled in code -- check for both labels |
| Handle "Free Shipping" / "Shipping Included" | Some retailers (BY, TL) frequently have free/included shipping | LOW | Return 0 (not null) to distinguish from "not found" |
| AMZD fixed-price handling | AMZD is not an auction -- bidPrice should always be null | LOW | Already correctly implemented |
| Parse currency strings robustly | Prices may have `$`, commas, whitespace, "TBD", "N/A" | LOW | `parsePrice()` already handles this well |

## Retailer-Specific Feature Requirements

### B-Stock Classic (ACE, BY, JCP, QVC)

**Current status:** Code uses generic `[class*="bid-amount"]` and `[id*="currentBid"]` selectors that DO NOT match the actual DOM.

**Actual DOM structure (verified 2026-01-28):**

```html
<!-- Bid price -->
<div class="auction-data-label">Current bid</div>
<div class="auction-data-content">
    <span id="current_bid_amount">$1,312</span>
</div>

<!-- Shipping cost -->
<div class="auction-data-label">Shipping Cost</div>
<div class="auction-data-content">$1,647.23</div>

<!-- B-Stock fee (in "Additional Charges" section) -->
<div class="auction-data-label">Additional Charges</div>
<div class="auction-data-content">
    <strong>+ <span id="buyersPremiumLabelResult">$65.60</span></strong> B-Stock Fee
</div>
```

**Required selectors:**
| Field | Primary Selector | Fallback Strategy |
|-------|-----------------|-------------------|
| Bid price | `#current_bid_amount` | `.auction-data-label` text match "Current bid" or "Opening bid", then sibling `.auction-data-content` |
| Shipping fee | `.auction-data-label` text match "Shipping Cost", then sibling value | `#shipping_fee` (in bid confirmation popup -- may not be visible) |
| B-Stock fee | `#buyersPremiumLabelResult` | `.auction-data-label` text match "Additional Charges" |

**Key issue:** The `bstock-auction.ts` extractor uses `[class*="bid-amount"]`, `[class*="current-bid"]`, etc. which are CSS substring selectors that match NO elements on B-Stock Classic pages. The actual ID is `#current_bid_amount` (with underscores, not hyphens) and the actual class is `.auction-data-label` (not `.bid-amount`).

**Fix:** The `bstock.ts` file already has `extractBidPriceClassic()` and `extractShippingFeeClassic()` functions with correct selectors (`.auction-data-label` traversal + `#current_bid_amount` fallback). The `bstock-auction.ts` file uses wrong selectors.

### B-Stock Next.js (AMZ, ATT, COSTCO, RC, TGT)

**Current status:** Code parses `__NEXT_DATA__` and looks for `currentBid`, `winningBid`, `highBid` fields. Whether these field names are correct depends on the actual JSON structure.

**Actual DOM structure (verified 2026-01-28):**
- Bid price displayed as individual digit spans in header area (not easily scraped from DOM)
- Shipping hidden behind `[data-testid="toggle-button"]` labeled "Shipping & Other Charges"
- All pricing data SHOULD be in `__NEXT_DATA__` JSON

**`__NEXT_DATA__` extraction path:**
```javascript
const nextData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
const queries = nextData.props.pageProps.dehydratedState.queries
const listingQuery = queries.find(q => JSON.stringify(q.queryKey).includes('listing'))
const data = listingQuery.state.data
// Then check: data.currentBid, data.lot.currentBid, etc.
```

**Key issues:**
1. Field names (`currentBid`, `shippingCost`) are UNVERIFIED against actual JSON -- these are educated guesses
2. Shipping may be in a nested object or under a different key
3. RC uses "Buy Now" pricing instead of "Current Bid" -- need `buyNowPrice` or similar field
4. The toggle button for "Shipping & Other Charges" suggests shipping may NOT be in `__NEXT_DATA__` and may require DOM interaction

**Required investigation:** Live page inspection to confirm exact `__NEXT_DATA__` field paths for bid and shipping.

### Amazon Direct (AMZD)

**Current status:** Fixed-price, no bid. Shipping extraction uses Amazon selectors.

**Known issues (from milestone context):**
- CSV parsing: row truncation and column bleeding
- These are CSV format issues, not DOM extraction issues

**CSV-specific problems:**
| Issue | Cause | Impact |
|-------|-------|--------|
| Row truncation | Unescaped commas or newlines in product descriptions | Rows appear shorter than expected, missing columns |
| Column bleeding | Unquoted fields containing commas | Data from one column appears in the next |
| Encoding issues | Non-UTF-8 characters in product names | Garbled text or parse failures |

**Fix approach:** Use a robust CSV parser that handles quoted fields with embedded commas/newlines (e.g., PapaParse with `quoteChar` and `escapeChar` options).

### TechLiquidators (TL)

**Current status:** Working (per milestone context). Uses `.lot-pricing-box` structure.

**Verified DOM structure:**
```html
<div class="lot-pricing-box">
    <div class="lot-pricing-box-item">
        <div class="col-xs-3">$8,600</div>  <!-- Current Bid -->
        <div>Current Bid</div>
    </div>
    <div class="lot-pricing-box-item">
        <div class="col-xs-3">$30</div>  <!-- Shipping -->
        <div>Shipping</div>
    </div>
</div>
<div class="lot-total-price-value">$8,630</div>
```

**Notes:**
- Site returns 406 for automated requests -- Chrome extension context required
- "Shipping Included" is common -- total price includes shipping
- Already working correctly

## Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| B-Stock fee extraction | Buyer's premium is a hidden cost -- surfacing it helps profit calculations | LOW | `#buyersPremiumLabelResult` on Classic; field in `__NEXT_DATA__` on Next.js |
| Expandable section handling for Next.js shipping | Shipping data behind toggle on Next.js sites -- programmatic expansion | MEDIUM | Click `[data-testid="toggle-button"]` then scrape, OR rely on `__NEXT_DATA__` |
| Auction end time extraction | Used for file naming and sorting | LOW | Already implemented -- Classic uses title parsing, Next.js uses `datePurchasingEnds` |
| Bid count extraction | Shows auction competitiveness | LOW | `#bid_number` on Classic; TL uses regex `(\d+)\s*Bids?` |
| Retry/wait for dynamic content | B-Stock pages may load bid data asynchronously | MEDIUM | Add MutationObserver or polling for elements that load after initial paint |

## Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Scraping from network requests | More reliable than DOM scraping | Requires webRequest permissions, may break with API changes, harder to debug | Use `__NEXT_DATA__` which is server-rendered and stable |
| Scraping ALL pricing data from page | Users want total cost breakdown | Over-engineering -- bid + shipping + B-Stock fee covers 95% of need | Extract the 3 key prices only |
| Auto-refresh to track bid changes | Real-time bid tracking | Creates excessive requests, may trigger rate limiting or account suspension | Single extraction at time of manifest download |
| Scraping across iframes | Some data might be in iframes | B-Stock does not use iframes for pricing; complexity not justified | Only scrape main document |
| Shadow DOM traversal | Future-proofing against web component adoption | B-Stock does not use shadow DOM; premature optimization | Add only if B-Stock migrates to web components |

## Feature Dependencies

```
Platform Detection (which site type?)
    |
    +---> B-Stock Classic Path
    |         |
    |         +---> #current_bid_amount OR .auction-data-label traversal
    |         +---> .auction-data-label "Shipping Cost" sibling
    |
    +---> B-Stock Next.js Path
    |         |
    |         +---> Parse __NEXT_DATA__ JSON
    |         +---> Find listing query in dehydrated state
    |         +---> Extract bid/shipping fields from listing data
    |         +---> [FALLBACK] DOM text regex for "Current Bid: $X"
    |
    +---> Amazon Direct Path (no bid extraction)
    |         |
    |         +---> CSV download & parsing (separate concern)
    |         +---> Shipping from #delivery-message
    |
    +---> TechLiquidators Path (already working)
              |
              +---> .lot-pricing-box structure
```

### Dependency Notes

- **Platform detection is the gateway**: All extraction depends on correctly identifying the platform type. Already implemented via URL patterns.
- **B-Stock Classic and Next.js share the `bstock.ts` module**: The `bstock.ts` file already has `isClassicAuctionPage()` to branch between the two paths. But `bstock-auction.ts` is a SEPARATE module that duplicates this with wrong selectors.
- **AMZD CSV issues are independent**: CSV parsing problems are unrelated to DOM extraction. They need separate fixes in the CSV parser, not the metadata extractor.

## MVP Definition

### Fix Now (v1 -- this milestone)

- [x] **Fix B-Stock Classic selectors in `bstock-auction.ts`** -- Replace generic `[class*="bid-amount"]` with `#current_bid_amount` and `.auction-data-label` traversal. This fixes ACE, BY, JCP, QVC.
- [ ] **Verify `__NEXT_DATA__` field names** -- Live-test AMZ, COSTCO, TGT, ATT, RC pages to confirm exact field paths for bid price and shipping cost in the JSON payload.
- [ ] **Handle "Shipping & Other Charges" toggle** -- Determine if shipping data is in `__NEXT_DATA__` (no toggle click needed) or only in DOM after expanding the section.
- [ ] **Fix AMZD CSV parsing** -- Address row truncation and column bleeding with proper CSV parser configuration.
- [ ] **Add `#current_bid_amount` as primary selector** -- In `bstock-auction.ts`, use the ID selector first (fast, reliable) before falling back to label traversal.

### Add After Validation (v1.x)

- [ ] **B-Stock fee extraction** -- Add `#buyersPremiumLabelResult` extraction for profit calculation accuracy
- [ ] **Retry/polling for async-loaded data** -- Some B-Stock pages may load bid data after initial DOM ready
- [ ] **Bid count extraction** -- `#bid_number` on Classic, text pattern on TL

### Future Consideration (v2+)

- [ ] **Real-time bid tracking** -- Poll for bid updates (complex, risk of rate limiting)
- [ ] **Historical bid data** -- Store extracted bids over time for trend analysis

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix B-Stock Classic selectors | HIGH | LOW | P1 |
| Verify `__NEXT_DATA__` field paths | HIGH | MEDIUM | P1 |
| Fix AMZD CSV parsing | HIGH | MEDIUM | P1 |
| Handle shipping toggle on Next.js | MEDIUM | MEDIUM | P1 |
| B-Stock fee extraction | MEDIUM | LOW | P2 |
| Async content retry | LOW | MEDIUM | P2 |
| Bid count extraction | LOW | LOW | P3 |

**Priority key:**
- P1: Must fix -- currently returning 0/null for most retailers
- P2: Should have, improves accuracy
- P3: Nice to have

## Dynamic Content Patterns

### B-Stock Classic Sites
- **Loading pattern:** Server-rendered HTML. Bid price and shipping are in the initial DOM load.
- **No AJAX for pricing:** Pricing data does NOT load asynchronously on Classic pages.
- **Bid confirmation popup:** Shipping fee appears in a popup triggered by clicking "Place Bid" -- this popup may need to be triggered to access `#shipping_fee`. However, `.auction-data-label` "Shipping Cost" is visible on the main page.

### B-Stock Next.js Sites
- **Loading pattern:** Server-side rendered via Next.js. `__NEXT_DATA__` is in the initial HTML response.
- **Client-side hydration:** After SSR, React hydrates the page. Some data may only appear after hydration.
- **Toggle sections:** "Shipping & Other Charges" is behind a `[data-testid="toggle-button"]` click. Data may or may not be in `__NEXT_DATA__` -- needs verification.
- **Individual digit spans:** Bid price is displayed as individual `<span>` elements per digit (e.g., `<span>$</span><span>1</span><span>1</span><span>,</span><span>0</span><span>5</span><span>1</span>`). DOM text extraction via `innerText` should concatenate these correctly.

### Amazon Direct
- **Loading pattern:** Amazon's complex multi-stage loading. Delivery info may load asynchronously.
- **A/B testing:** Amazon frequently tests different layouts. Selectors may vary between sessions.
- **No auction data:** Fixed-price only. No bid extraction needed.

### TechLiquidators
- **Loading pattern:** Server-rendered (appears to be Angular-based per retailer-selectors-data.json note).
- **406 blocking:** Returns 406 for automated/headless requests. Chrome extension context is required.
- **Already working:** No changes needed for TL.

## Known Gotchas

| Gotcha | Affected Retailers | Mitigation |
|--------|-------------------|------------|
| `bstock-auction.ts` and `bstock.ts` have overlapping URL patterns | ACE, BY, JCP, QVC | Ensure only ONE module handles each URL. `bstock-auction.ts` matches `/[retailer]/auction/` while `bstock.ts` matches all `bstock.com`. Audit which module actually runs. |
| `__NEXT_DATA__` field names are guessed | AMZ, ATT, COSTCO, RC, TGT | Must verify with live page data. Field could be `currentBid`, `highBid`, `price`, `amount`, etc. |
| Shipping behind toggle may need DOM click | AMZ, ATT, COSTCO, RC, TGT | Check if `__NEXT_DATA__` already contains shipping. If not, must programmatically click toggle. |
| RC uses "Buy Now" not "Current Bid" | RC | Code needs to check `buyNowPrice` field in addition to `currentBid` |
| BY requires authentication | BY | May show login page instead of auction. Selectors will fail gracefully (return null). |
| AMZD CSV format issues are not DOM problems | AMZD | Fix in CSV parser, not metadata extractor. Separate workstream. |
| Duplicate extraction code | All B-Stock | `bstock.ts` and `bstock-auction.ts` both extract bids/shipping with different selectors. Consolidate or ensure consistency. |

## Sources

- **Codebase analysis (HIGH confidence):**
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/bstock-auction.ts` -- B-Stock Classic extractor (wrong selectors)
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/bstock.ts` -- B-Stock unified extractor (correct Classic selectors, unverified Next.js fields)
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/amazon.ts` -- AMZD extractor
  - `/home/sean/Projects/manifest-parser/src/retailers/sites/techliquidators.ts` -- TL extractor (working)
  - `/home/sean/Projects/manifest-parser/docs/RETAILER-SELECTORS.md` -- Verified DOM selectors (2026-01-28)
  - `/home/sean/Projects/manifest-parser/docs/retailer-selectors-data.json` -- Structured selector data with DOM details

- **Web research (LOW confidence -- general B-Stock info, no DOM specifics):**
  - [B-Stock Solutions - How It Works](https://canvasbusinessmodel.com/blogs/how-it-works/b-stock-solutions-how-it-works)
  - [B-Stock Shipping Methods](https://bstock.com/blog/buying-basics-auction-lot-shipping-methods/)
  - [Common CSV Import Errors - Flatfile](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/)
  - [Common CSV Errors - Row Zero](https://rowzero.com/blog/common-csv-errors)

---
*Feature research for: DOM metadata extraction across 11 liquidation retailers*
*Researched: 2026-01-29*
