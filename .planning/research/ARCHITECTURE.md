# Architecture Research

**Domain:** Chrome Extension - Liquidation Manifest Parser (Current Codebase Analysis)
**Researched:** 2026-01-29
**Confidence:** HIGH (full source code analysis)

## System Overview

```
+------------------------------------------------------------------+
|                     POPUP (popup.ts ~1350 lines)                  |
|  UI + Orchestration + Tab Management + ZIP Creation               |
|  +----------+  +--------------+  +------------+  +-----------+   |
|  | Google   |  | URL List &   |  | Process    |  | ZIP Export|   |
|  | Sheets   |  | Selection    |  | Pipeline   |  | & Download|   |
|  +----------+  +--------------+  +-----+------+  +-----------+   |
+----------------------------------------|-------------------------+
                                         |
  Tab Processing (also in popup.ts)      |
  +--------------------------------------+
  | processUrlInTab()                    |
  |  1. chrome.tabs.create()             |
  |  2. waitForTabLoad() + 1500ms delay  |
  |  3. executeScript(ISOLATED) --> extractMetadata()
  |  4. executeScript(MAIN) ------> downloadManifest()
  |  5. chrome.tabs.remove()             |
  +--------------------------------------+
                                         |
+-----------------------------------------+-------------------------+
|                SERVICE WORKER (service-worker.ts)                  |
|  +---------------+  +--------------+  +----------------+          |
|  | DOWNLOAD_     |  | PARSE_FILE   |  | FETCH_PAGE_    |          |
|  | MANIFEST      |  | (base64->    |  | TITLES         |          |
|  | (URL->parse)  |  |  parse)      |  | (URL->retailer)|          |
|  +-------+-------+  +------+-------+  +----------------+          |
|          |                 |                                       |
|  +-------+-----------------+--------+                              |
|  | Parsers                          |                              |
|  |  base-parser.ts (field mapping)  |                              |
|  |  amzd-parser.ts (ASIN + 4.5x)   |                              |
|  |  bstock-parser.ts                |                              |
|  |  csv-reader.ts (PapaParse)       |                              |
|  |  xlsx-reader.ts (SheetJS)        |                              |
|  +----------------------------------+                              |
+--------------------------------------------------------------------+
                                         |
+--------------------------------------------------------------------+
|              RETAILER MODULES (retailers/sites/)                    |
|  +------------+  +------------------+  +----------------+          |
|  | bstock.ts  |  | bstock-auction.ts|  | amazon.ts      |          |
|  | (Next.js   |  | (Classic auction |  | (AMZD fixed-   |          |
|  |  + Classic)|  |  JCP/QVC/ACE/BY) |  |  price pages)  |          |
|  +------------+  +------------------+  +----------------+          |
|  Each exports: extractMetadata() + downloadManifest()              |
+--------------------------------------------------------------------+
                                         |
+--------------------------------------------------------------------+
|                   TRANSFORM + EXPORT                                |
|  +------------------+  +--------------+  +----------------+        |
|  | unified/         |  | zip-export.ts|  | raw-metadata.ts|        |
|  |  transform.ts    |  | (JSZip)      |  | (append cols   |        |
|  |  processing.ts   |  |              |  |  to raw CSVs)  |        |
|  |  (clean/dedup/   |  |              |  |                |        |
|  |   sort pipeline) |  |              |  |                |        |
|  +------------------+  +--------------+  +----------------+        |
+--------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| Popup | UI, orchestration, tab lifecycle, ZIP creation | `src/popup/popup.ts` (1350 lines) |
| Service Worker | File download/parse via messages | `src/background/service-worker.ts` |
| Retailer Registry | URL matching, module lookup | `src/retailers/registry.ts`, `index.ts` |
| Retailer Modules | Site-specific DOM extraction + manifest download | `src/retailers/sites/*.ts` |
| Parsers | CSV/XLSX reading, field mapping, row extraction | `src/parsers/*.ts` |
| Unified Transform | ManifestItem[] -> UnifiedManifestRow[] pipeline | `src/unified/*.ts` |
| ZIP/Export | ZIP creation, raw metadata appending | `src/utils/zip-export.ts`, `raw-metadata.ts` |

## Data Flow: Metadata Extraction (bid_price, shipping_fee)

### Complete Trace: DOM -> Content Script -> Background -> Output

```
PAGE DOM (auction listing)
    |
    v
extractMetadata() [ISOLATED world, in browser tab]
    |
    |  B-Stock Marketplace (bstock.ts):
    |    1. Parse __NEXT_DATA__ script element -> listingQuery.state.data
    |    2. Search for bidPrice in: data.currentBid, data.winningBid,
    |       data.highBid, data.currentPrice, data.bidAmount, data.lot.*
    |    3. Search for shipping in: data.shippingCost, data.estimatedShipping,
    |       data.freightCost, data.shipping, data.deliveryCost, data.lot.*
    |    4. DOM fallback: regex on document.body.innerText
    |
    |  B-Stock Classic (bstock.ts isClassicAuctionPage=true):
    |    1. .auction-data-label with "Current bid"/"Opening bid" text
    |       -> sibling .auction-data-content div value
    |    2. Fallback: #current_bid_amount
    |    3. .auction-data-label with "Shipping Cost" -> sibling value
    |
    |  B-Stock Auction (bstock-auction.ts):
    |    1. CSS: [class*="bid-amount"], [class*="current-bid"], etc.
    |    2. CSS: [class*="shipping"], [class*="freight"], etc.
    |    3. Regex fallback on body text for both
    |
    |  Amazon Direct (amazon.ts):
    |    1. bidPrice: always null (fixed-price, not auction)
    |    2. shippingFee: #delivery-message, [data-csa-c-content-id*="shipping"],
    |       #deliveryBlockMessage, #mir-layout-DELIVERY_BLOCK,
    |       [class*="delivery"], [class*="shipping"]
    |    3. Regex fallback on body text
    |
    v
Returns: MetadataResult { bidPrice: number|null, shippingFee: number|null }
    |
    v
chrome.scripting.executeScript() result received in popup.ts
    |
    |  if (metadataResult[0]?.result) {
    |    bidPrice = metadata.bidPrice     // number | null
    |    shippingFee = metadata.shippingFee  // number | null
    |  }
    |  // ON FAILURE: bidPrice/shippingFee stay null (initialized above)
    |
    v
TabProcessResult returned to handleProcess()
    |
    +-- RAW MODE:
    |   rawEntries.push({
    |     bidPrice: result.bidPrice ?? 0,      // *** null -> 0 HERE ***
    |     shippingFee: result.shippingFee ?? 0  // *** null -> 0 HERE ***
    |   })
    |   |
    |   v
    |   createZipFromRawFiles() -> appendMetadataToManifest()
    |   |  bidPrice = metadata.bidPrice ?? 0    // *** SECOND null -> 0 ***
    |   |  shippingFee = metadata.shippingFee ?? 0
    |   |  Appended to first data row of CSV
    |   v
    |   OUTPUT: CSV with auction_url, bid_price, shipping_fee columns
    |
    +-- UNIFIED MODE:
        const metadata: AuctionMetadata = {
          bidPrice: result.bidPrice ?? 0,      // *** null -> 0 HERE ***
          shippingFee: result.shippingFee ?? 0  // *** null -> 0 HERE ***
        }
        |
        v
        transformToUnified(items, metadata)
          -> processedRows[0].bid_price = formatPrice(metadata.bidPrice)
          -> processedRows[0].shipping_fee = formatPrice(metadata.shippingFee)
        |
        v
        generateUnifiedCsv() -> CSV string with metadata on first row only
```

## Root Cause Analysis: Where Values Become 0

### Cause 1: Selectors Don't Match -> null -> ?? 0 -> Output Shows 0

**Confidence: HIGH** -- This is the most likely root cause.

The extraction functions return `null` when no selector matches. The `?? 0` operator converts null to 0. Five distinct locations apply this conversion:

| Location | Code | Line (approx) |
|----------|------|----------------|
| popup.ts (raw mode) | `bidPrice: result.bidPrice ?? 0` | 623 |
| popup.ts (raw mode) | `shippingFee: result.shippingFee ?? 0` | 624 |
| popup.ts (unified mode) | `bidPrice: result.bidPrice ?? 0` | 652 |
| popup.ts (unified mode) | `shippingFee: result.shippingFee ?? 0` | 653 |
| raw-metadata.ts | `const bidPrice = metadata.bidPrice ?? 0` | 149 |

**Why selectors fail:**

For **B-Stock Marketplace** (Next.js pages): The code searches `__NEXT_DATA__` for field names like `currentBid`, `winningBid`, `shippingCost`. These are GUESSED field names -- never verified against actual `__NEXT_DATA__` JSON structure. If the actual fields are named differently (e.g., `currentBidAmount`, `shippingRate`), extraction returns null.

For **B-Stock Classic** pages: Selectors like `.auction-data-label` are based on observed DOM. If B-Stock changes their CSS classes, extraction breaks silently.

For **B-Stock Auction** pages: Generic selectors like `[class*="bid-amount"]` may not match any elements on the actual auction page.

For **Amazon**: Amazon frequently changes their DOM structure. Selectors like `#delivery-message` may no longer exist.

### Cause 2: executeScript Fails -> Metadata Stays null -> 0

**Confidence: MEDIUM**

If `chrome.scripting.executeScript()` throws (CSP restrictions, page not loaded, tab closed), the catch block logs the error but bidPrice/shippingFee remain at their initial `null` values from the variable declarations at line 1182-1183.

### Cause 3: Timing -- Page Not Fully Rendered

**Confidence: MEDIUM**

`POST_LOAD_DELAY_MS = 1500ms` after tab status = 'complete'. But:
- Next.js hydration may take longer
- AJAX-loaded auction data may not be in DOM yet
- `__NEXT_DATA__` script tag may be present but query data may not be populated yet

### Cause 4: Direct File URLs Get Hardcoded 0

**Confidence: HIGH** -- This is by design, not a bug.

For URLs that don't need tab processing (direct .csv/.xlsx links), `popup.ts` lines 696-699 hardcode 0:
```typescript
const metadata: AuctionMetadata = {
  auctionUrl: urlItem.url,
  bidPrice: 0,       // Hardcoded, no extraction attempted
  shippingFee: 0,    // Hardcoded, no extraction attempted
}
```

## AMZD Manifest Download: Where Rows Could Be Lost

### Complete AMZD Path

```
Amazon product page (MAIN world)
    |
    v
downloadManifest() [amazon.ts]
    |  1. Hook URL.createObjectURL to capture blobs
    |  2. Hook document.createElement('a') to block browser download
    |  3. Find "Download CSV" link and click it
    |  4. Wait for blob capture (100ms polling, 6s timeout)
    |  5. FileReader.readAsDataURL(blob) -> base64
    |
    v                           *** TRUNCATION POINT 1 ***
TabProcessResult.manifestData   6s timeout: if blob not captured,
    |                           manifestData = null, entire file lost
    v
parseManifestFromBase64() -> chrome.runtime.sendMessage({type:'PARSE_FILE'})
    |
    v
Service Worker: handleParseFile()
    |  1. atob(base64) -> binary string
    |  2. Uint8Array -> ArrayBuffer
    |  3. TextDecoder.decode() -> CSV text string
    |
    v                           *** TRUNCATION POINT 2 ***
readCsv(text) [PapaParse]      PapaParse with header:true
    |  header: true             Misaligned rows get __parsed_extra
    |  skipEmptyLines: true     Fields shift right due to unquoted commas
    |
    v                           *** TRUNCATION POINT 3 ***
parseManifestData(rawData, 'amzd', filename)
    |  -> parseAmzdManifest()
    |  For each row:
    |    cells = Object.values(row)  // Does NOT include __parsed_extra!
    |    parsed = parseAmzdRow(row, cells, headers)
    |    if parsed is null -> ROW DROPPED
    |      null when: cells.length===0
    |      null when: !asin && !productName && unitRetail===0
    |
    v
ManifestItem[] (may have fewer items than original CSV rows)
    |
    v (Unified mode only)
transformToUnified() -> processRows()
    |  1. cleanRow() - strips non-printable chars
    |  2. deduplicateRows() - merges by normalized item_number
    |     *** TRUNCATION POINT 4: Dedup merges rows, reducing count ***
    |  3. sortRows() - by unit_retail DESC
    |
    v
UnifiedManifestRow[] or raw CSV with metadata columns
```

### Critical Truncation Points

| Point | Risk | Mechanism | Detection |
|-------|------|-----------|-----------|
| 1. Blob timeout | MEDIUM | 6s timeout fires before Amazon JS generates CSV blob | `manifestData = null`, entire manifest lost, logged as "No manifest data" |
| 2. PapaParse __parsed_extra | HIGH | AMZD CSVs have unquoted commas. `Object.values(row)` excludes `__parsed_extra` fields. Right-anchor extraction on truncated `cells` array may extract wrong values | Rows silently get wrong qty/price, or ASIN not found -> row dropped |
| 3. Row null filter | MEDIUM | `parseAmzdRow` returns null if no ASIN AND no product name AND unitRetail=0. Misalignment can cause all three conditions | Rows silently dropped, only visible in item count log |
| 4. Deduplication | LOW (by design) | Same normalized item_number rows merged, qty summed | Expected behavior, not a bug |
| 5. Raw CSV re-parse | MEDIUM | `raw-metadata.ts` uses hand-rolled CSV parser (not PapaParse). Different parsing logic for quotes/line-endings could produce different row counts | Raw mode may have different row count than unified mode for same input |

### Truncation Point 2 Deep Dive: PapaParse __parsed_extra

When PapaParse encounters a row with MORE fields than headers (due to unquoted commas in product titles), it:
1. Maps the first N fields to the N header columns
2. Puts overflow fields in a `__parsed_extra` array property

The AMZD parser then does:
```typescript
const cells = Object.values(row)  // Gets only header-mapped values
```

`Object.values()` on a PapaParse result object returns the header-mapped field values but does NOT include `__parsed_extra`. This means the `cells` array is SHORT -- it has the same count as headers, but the values are WRONG because fields shifted right due to extra commas.

The `parseAmzdRow()` function then:
- Checks `isAmzdMisaligned(cells, headers)` -- but cells.length === headers.length (both N), so this returns FALSE
- Uses header-based extraction instead of right-anchor extraction
- Gets WRONG values for qty and price

This means misaligned AMZD rows are NOT detected as misaligned, and header-based extraction produces wrong values. If the wrong values happen to produce a valid-looking row, it passes through with incorrect data. If they produce unitRetail=0 and no ASIN is found in the shifted cells, the row is dropped.

## Architectural Patterns

### Pattern 1: Two-World Script Execution

**What:** Metadata extraction runs in ISOLATED world (can read DOM), manifest download runs in MAIN world (can monkey-patch JS globals like URL.createObjectURL).
**When to use:** When you need both DOM access AND JavaScript interception on the same page.
**Trade-offs:** Two separate executeScript calls. Cannot share state between worlds without going through popup.

### Pattern 2: Blob Interception

**What:** Monkey-patch `URL.createObjectURL` and `document.createElement('a')` to capture dynamically generated file downloads without triggering the browser's download dialog.
**When to use:** When the site generates files via JavaScript (not direct URL downloads).
**Trade-offs:** Fragile -- depends on site using these specific APIs. Timeout-based, can miss slow operations. The 6-second timeout is a hard limit.

### Pattern 3: Null-to-Zero Coalescing

**What:** `value ?? 0` throughout the metadata pipeline converts "not found" to 0.
**Trade-offs:** Output cannot distinguish "actually $0" from "extraction failed". This is the primary source of the metadata=0 bug.

## Anti-Patterns Present

### Anti-Pattern 1: Monolithic Popup

**What people do:** All orchestration, tab management, file processing, and ZIP creation in one 1350-line popup.ts file.
**Why it's wrong:** Hard to test, hard to reason about, mixes UI concerns with data processing.
**Do this instead:** Separate tab orchestration, data processing, and UI into distinct modules.

### Anti-Pattern 2: Duplicated Condition Mapping

**What people do:** `conditionToAbbrev()` copied into bstock.ts, bstock-auction.ts, and amazon.ts with slight variations.
**Why it's wrong:** Inconsistent behavior across retailers; bug fixes need to be applied in 3+ places.
**Do this instead:** Single shared utility function imported by all retailer modules.

### Anti-Pattern 3: Silent Metadata Failure

**What people do:** When extractMetadata() returns null for bid/shipping, convert to 0 and continue.
**Why it's wrong:** User sees 0 in output and cannot tell if it is a real value or extraction failure.
**Do this instead:** Propagate null through pipeline, display "N/A" or flag in output, or log a user-visible warning.

### Anti-Pattern 4: Two CSV Parsers

**What people do:** PapaParse for manifest parsing (csv-reader.ts), hand-rolled CSV parser for raw metadata appending (raw-metadata.ts).
**Why it's wrong:** Different edge-case handling (quotes, line endings, BOM) can produce different results on same input.
**Do this instead:** Use PapaParse everywhere, or extract shared parsing logic.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Sheets API | OAuth2 via chrome.identity | Reads URLs from spreadsheet |
| Retailer websites | Tab navigation + script injection | Fragile: depends on DOM structure |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Popup <-> Service Worker | chrome.runtime.sendMessage | Async, returns Promise |
| Popup <-> Browser Tabs | chrome.scripting.executeScript | Two worlds: ISOLATED + MAIN |
| Retailer Modules <-> Popup | Function references passed to executeScript | Functions must be self-contained (no closures, no imports) |

## Recommended Project Structure

```
src/
+-- popup/               # UI layer
|   +-- popup.ts          # Entry point (should be slimmed down)
|   +-- popup.css
|   +-- index.html
+-- background/           # Service worker
|   +-- service-worker.ts  # Message handler, file download/parse
+-- retailers/            # Retailer module system
|   +-- types.ts           # RetailerModule interface
|   +-- registry.ts        # URL matching, module lookup
|   +-- index.ts           # Public API
|   +-- field-mappings.ts  # Column name mappings per retailer
|   +-- sites/
|       +-- bstock.ts      # B-Stock marketplace (Next.js + Classic)
|       +-- bstock-auction.ts  # B-Stock classic auction pages
|       +-- amazon.ts      # Amazon Direct
|       +-- techliquidators.ts
+-- parsers/              # File parsing
|   +-- types.ts           # ManifestItem, FieldMapping, etc.
|   +-- base-parser.ts     # Generic field mapping parser
|   +-- amzd-parser.ts     # AMZD-specific (ASIN, 4.5x, right-anchor)
|   +-- bstock-parser.ts
|   +-- techliquidators-parser.ts
|   +-- csv-reader.ts      # PapaParse wrapper
|   +-- xlsx-reader.ts     # SheetJS wrapper
+-- unified/              # Unified format transform
|   +-- types.ts           # UnifiedManifestRow, AuctionMetadata
|   +-- transform.ts       # ManifestItem[] -> UnifiedManifestRow[]
|   +-- processing.ts      # Clean, dedup, sort pipeline
|   +-- index.ts           # Public API
+-- utils/                # Shared utilities
|   +-- zip-export.ts      # ZIP creation (JSZip)
|   +-- raw-metadata.ts    # Append metadata columns to raw files
|   +-- csv-export.ts      # CSV generation
|   +-- filename-utils.ts  # Filename sanitization, truncation
|   +-- file-utils.ts
|   +-- proxy-config.ts
+-- content/              # Legacy content script detector (unused in main flow)
    +-- detector.ts
    +-- sites/
```

## Sources

All findings from direct source code analysis of:
- `src/popup/popup.ts` - Main orchestration (1350 lines)
- `src/background/service-worker.ts` - Message handling, file parsing
- `src/retailers/sites/bstock.ts` - B-Stock marketplace extraction
- `src/retailers/sites/bstock-auction.ts` - B-Stock classic auction extraction
- `src/retailers/sites/amazon.ts` - Amazon Direct extraction
- `src/retailers/types.ts` - RetailerModule interface (MetadataResult definition)
- `src/parsers/base-parser.ts` - Field mapping and row parsing
- `src/parsers/amzd-parser.ts` - AMZD-specific parsing with right-anchor
- `src/parsers/csv-reader.ts` - PapaParse wrapper
- `src/unified/transform.ts` - Unified CSV generation
- `src/unified/processing.ts` - Clean/dedup/sort pipeline
- `src/utils/zip-export.ts` - ZIP creation
- `src/utils/raw-metadata.ts` - Raw file metadata appending with hand-rolled CSV parser

---
*Architecture research for: manifest-parser Chrome extension*
*Researched: 2026-01-29*
