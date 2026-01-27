# Phase 5: Auction Metadata Extraction - Research

**Researched:** 2026-01-27
**Domain:** DOM metadata extraction from liquidation auction pages
**Confidence:** MEDIUM

## Summary

Phase 5 implements extraction of bid_price and shipping_fee from auction listing pages during tab processing. The codebase already has a robust pattern for metadata extraction via `extractMetadata()` functions in retailer modules, which run in ISOLATED world within browser tabs. The existing pattern successfully extracts retailer name, listing name, and auction end time.

The new bid_price and shipping_fee extraction follows the same pattern but requires new CSS selectors for each retailer type. Based on codebase analysis, three retailer types need support: B-Stock (with multiple sub-sites), TechLiquidators, and Amazon Direct (AMZD). The architecture is well-suited for this addition, requiring:
1. Extending `MetadataResult` interface to include bid/shipping fields
2. Adding extraction logic to each retailer's `extractMetadata()` function
3. Updating popup.ts to pass extracted values to `AuctionMetadata`

**Primary recommendation:** Extend the existing `extractMetadata()` pattern in each retailer module to extract bid_price and shipping_fee, with retry logic for elements that load asynchronously.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.scripting.executeScript | Chrome Extension API | Execute extraction functions in page context | Official Chrome extension API for content scripts |
| DOM APIs | Browser native | CSS selector queries, text extraction | Standard web APIs, no dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS selectors | XPath | XPath more powerful but CSS selectors sufficient for this use case |
| Manual DOM traversal | cheerio/jsdom | Not applicable - runs in real browser context |

**Installation:**
No new dependencies needed. Uses existing Chrome Extension APIs and DOM APIs.

## Architecture Patterns

### Recommended Extension to Existing Pattern

The codebase already has a well-defined pattern in `src/retailers/types.ts`:

```typescript
// Current MetadataResult interface - EXTEND this
export interface MetadataResult {
  retailer: string
  listingName: string
  auctionEndTime: string | null
  // Phase 5 additions:
  bidPrice: number | null     // NEW
  shippingFee: number | null  // NEW
}
```

### Pattern 1: Retailer Module Extension
**What:** Add bid/shipping extraction to existing `extractMetadata()` functions
**When to use:** All retailer modules that support tab processing
**Example:**
```typescript
// Pattern from existing bstock.ts extractMetadata - extend with price extraction
extractMetadata: function () {
  // ... existing retailer/listing extraction ...

  // NEW: Extract bid price
  const bidPrice = extractBidPrice()

  // NEW: Extract shipping fee
  const shippingFee = extractShippingFee()

  return {
    retailer,
    listingName,
    auctionEndTime,
    bidPrice,      // NEW
    shippingFee    // NEW
  }

  // Helper functions inside extractMetadata (runs in ISOLATED world)
  function extractBidPrice(): number | null {
    // Try multiple selectors for robustness
    const selectors = [
      '.current-bid-amount',
      '[data-test="current-bid"]',
      '.bid-price .amount'
    ]
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        return parsePrice(el.textContent)
      }
    }
    return null  // Default to null (will become 0 in output)
  }

  function parsePrice(text: string | null): number | null {
    if (!text) return null
    // Remove currency symbols, commas, whitespace
    const cleaned = text.replace(/[$,\s]/g, '').trim()
    const value = parseFloat(cleaned)
    return isNaN(value) ? null : value
  }
}
```

### Pattern 2: Retry Logic for Async Elements
**What:** Retry extraction if elements not immediately available
**When to use:** Pages with JavaScript-rendered content
**Example:**
```typescript
// Status text feedback during extraction (in popup.ts)
updateProgress((processed / totalToProcess) * 100, 'Extracting metadata...')

// Extraction with retry in extractMetadata function
function extractWithRetry(selector: string, maxAttempts: number = 3): string | null {
  // Note: extractMetadata runs synchronously in ISOLATED world
  // For async elements, the retry happens at popup.ts level
  const el = document.querySelector(selector)
  return el?.textContent ?? null
}
```

### Pattern 3: Metadata Flow to CSV
**What:** Pass extracted metadata through to unified output
**When to use:** After tab processing completes
**Example:**
```typescript
// In popup.ts processUrlInTab, after extractMetadata:
const metadata: AuctionMetadata = {
  auctionUrl: urlItem.url,
  bidPrice: result.bidPrice ?? 0,     // Use 0 if null per requirements
  shippingFee: result.shippingFee ?? 0 // Use 0 if null per requirements
}

// transformToUnified already handles metadata on first row:
const unifiedRows = transformToUnified(items, metadata)
```

### Anti-Patterns to Avoid
- **Parsing HTML with regex:** Use DOM APIs instead; the code runs in real browser context
- **Blocking on slow elements:** Use timeouts, default to 0 if extraction fails
- **Hard-coded selectors only:** Use multiple fallback selectors for robustness
- **Alerting on extraction failure:** Console log only per requirements

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price parsing | Custom regex | Reuse existing `parsePrice` patterns in amzd-parser.ts | Already handles currency symbols, commas, edge cases |
| Tab communication | Custom messaging | Existing `chrome.scripting.executeScript` pattern | Already proven in codebase |
| Retry delays | setInterval loops | Simple Promise-based delays with timeout | Cleaner, avoids memory leaks |

**Key insight:** The codebase already has working patterns for all the infrastructure needed. Phase 5 is about extending existing `extractMetadata()` functions, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Element Not Found Due to Lazy Loading
**What goes wrong:** Bid price element loads via JavaScript after initial page load
**Why it happens:** Many auction sites use React/Vue with async data fetching
**How to avoid:** Existing `waitForTabLoad()` includes POST_LOAD_DELAY_MS (1500ms). Add retry logic with 2-3 second delays (per requirements)
**Warning signs:** Extraction works locally but fails in extension context

### Pitfall 2: Different Page Layouts per B-Stock Sub-Site
**What goes wrong:** Selector works for QVC but not JCPenney
**Why it happens:** B-Stock hosts multiple retailers with different page templates
**How to avoid:** Use multiple selector patterns, test across sub-sites
**Warning signs:** Extraction works for some URLs but not others from same domain

### Pitfall 3: TBD or "Calculated at Checkout" Shipping
**What goes wrong:** Shipping shows "TBD" or "Calculated at checkout", not a number
**Why it happens:** Shipping depends on destination, only known after purchase
**How to avoid:** Per requirements, if "TBD" or not found, use 0
**Warning signs:** Shipping extraction returns NaN or throws errors

### Pitfall 4: Currency Symbol Variations
**What goes wrong:** "$1,234.56" vs "1234.56 USD" vs "USD 1,234.56"
**Why it happens:** Different retailers format prices differently
**How to avoid:** Strip all non-numeric except decimal, use parseFloat
**Warning signs:** Some prices extracted, others return NaN

### Pitfall 5: Stale Closure Variables
**What goes wrong:** extractMetadata() references variables from outer scope that don't exist in page context
**Why it happens:** Function serialized and executed in different context
**How to avoid:** Keep all helper functions inside extractMetadata(), no outer references
**Warning signs:** "X is not defined" errors in console

## Code Examples

Verified patterns from existing codebase:

### Price Parsing (from amzd-parser.ts)
```typescript
// Source: src/parsers/amzd-parser.ts lines 111-123
function parsePrice(value: unknown): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return 0
  }
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}
```

### Multiple Selector Fallback (from existing extractMetadata patterns)
```typescript
// Source: Pattern derived from bstock.ts extractMetadata
function extractWithFallback(selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el?.textContent?.trim()) {
      return el.textContent.trim()
    }
  }
  return null
}
```

### Tab Processing Flow (from popup.ts)
```typescript
// Source: src/popup/popup.ts lines 1037-1061
// Step 1: Extract metadata from content script (isolated world)
const metadataResult = await chrome.scripting.executeScript({
  target: { tabId },
  func: retailerModule.extractMetadata,
})

if (metadataResult[0]?.result) {
  const metadata = metadataResult[0].result
  retailer = metadata.retailer
  listingName = metadata.listingName
  auctionEndTime = metadata.auctionEndTime
  // Phase 5: Also extract bidPrice and shippingFee
}
```

### Retry Logic Pattern
```typescript
// Pattern for popup.ts extraction with retry
async function extractMetadataWithRetry(
  tabId: number,
  retailerModule: RetailerModule,
  maxAttempts: number = 3,
  delayMs: number = 2500
): Promise<MetadataResult> {
  let lastResult: MetadataResult | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: retailerModule.extractMetadata,
    })

    if (result[0]?.result) {
      lastResult = result[0].result
      // Check if we got the values we need
      if (lastResult.bidPrice !== null || lastResult.shippingFee !== null) {
        return lastResult
      }
    }
  }

  // Return whatever we got (possibly with null values)
  return lastResult ?? {
    retailer: 'Unknown',
    listingName: 'Unknown',
    auctionEndTime: null,
    bidPrice: null,
    shippingFee: null
  }
}
```

## Retailer-Specific Extraction Notes

### B-Stock Marketplace (bstock.com/buy/listings/)

**Page structure:** Uses Next.js with `__NEXT_DATA__` containing auction data
**Existing extraction:** Already extracts seller name, lot title, end time from `__NEXT_DATA__`
**Bid price location:** Likely in `__NEXT_DATA__` under auction/listing data, or DOM element with bid amount
**Shipping fee location:** May be in listing details section or calculated separately

**Selector hints for B-Stock:**
- Current bid: Look for `currentBid`, `winningBid`, or `highBid` in `__NEXT_DATA__`
- Shipping: Look for `shippingCost`, `estimatedShipping`, or DOM elements in shipping section

### B-Stock Auction Pages (bstock.com/[retailer]/auction/)

**Page structure:** Older B-Stock template, no `__NEXT_DATA__`
**Existing extraction:** Parses page title for product/condition/time
**Bid price location:** DOM element showing current bid
**Shipping fee location:** DOM element in listing details

**Selector hints for B-Stock Auction:**
- Current bid: Elements containing "current bid", "high bid", "winning bid"
- Shipping: Elements containing "shipping", "freight", "delivery cost"

### TechLiquidators (techliquidators.com/detail/)

**Page structure:** Custom PHP/template-based
**Existing extraction:** Gets title from h1, condition from page text, time from PST display
**Bid price location:** Prominently displayed near product info
**Shipping fee location:** Listed in auction details section

**Selector hints for TechLiquidators:**
- Current bid: Near product image/title, likely labeled
- Shipping: In details section, may show "Estimated Shipping" or "Freight"

### Amazon Direct (amazon.com liquidation)

**Page structure:** Amazon product page template
**Existing extraction:** Uses page title and DOM for lot info
**Bid price location:** N/A - These are fixed price listings, not auctions
**Shipping fee location:** Listed in delivery section

**Note:** AMZD may not have bid_price (fixed price), but may have shipping info

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate content scripts | Unified retailer modules | Already in codebase | Single pattern for all extraction |
| Manual DOM parsing | `__NEXT_DATA__` for modern sites | B-Stock moved to Next.js | More reliable, structured data |

**Deprecated/outdated:**
- N/A - Current patterns are appropriate

## Open Questions

Things that could not be fully resolved:

1. **Exact CSS selectors for bid/shipping on each retailer**
   - What we know: General locations (near product info, in details section)
   - What's unclear: Exact class names, IDs, or data attributes
   - Recommendation: Inspect live auction pages during implementation, document discovered selectors

2. **B-Stock `__NEXT_DATA__` field names for bid/shipping**
   - What we know: `__NEXT_DATA__` contains structured auction data
   - What's unclear: Exact property names for current bid and shipping
   - Recommendation: Log `__NEXT_DATA__` content during development to discover fields

3. **AMZD bid price handling**
   - What we know: AMZD is fixed-price, not auction
   - What's unclear: Whether to use purchase price as bid_price or leave null
   - Recommendation: Per requirements, use 0 if not applicable (not an auction)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/retailers/sites/*.ts` - Existing extractMetadata patterns
- Codebase analysis: `src/unified/types.ts` - AuctionMetadata interface
- Codebase analysis: `src/popup/popup.ts` - Tab processing flow

### Secondary (MEDIUM confidence)
- Codebase analysis: `src/parsers/amzd-parser.ts` - Price parsing patterns
- Phase context: `05-CONTEXT.md` - User decisions on handling

### Tertiary (LOW confidence)
- CSS selectors for bid/shipping: Need live page inspection during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing Chrome Extension APIs and DOM APIs
- Architecture: HIGH - Extends well-established extractMetadata pattern
- Pitfalls: MEDIUM - Based on general web scraping experience, specific selectors TBD

**Research date:** 2026-01-27
**Valid until:** 60 days (stable extension architecture, but selector specifics may need validation)
