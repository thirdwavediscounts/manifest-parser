---
phase: 01-unified-format-foundation
plan: 02
subsystem: unified-output
tags: [integration, pipeline, zip-export, popup]

dependency_graph:
  requires: [01-01]
  provides: [unified-processing-pipeline, unified-zip-export]
  affects: [02-01, 02-02, 05-02, 06-01]

tech_stack:
  added: []
  patterns: [message-passing, background-worker-parsing, unified-transformation-pipeline]

key_files:
  created: []
  modified:
    - src/utils/zip-export.ts
    - src/popup/popup.ts

decisions:
  - id: D01-02-01
    decision: "Unified output is default; raw file functions preserved for Phase 6 toggle"
    rationale: "Enables backwards compatibility while moving forward with unified format"
  - id: D01-02-02
    decision: "Parse manifest via PARSE_FILE message to background worker"
    rationale: "Reuses existing parsing infrastructure, works in popup context"
  - id: D01-02-03
    decision: "Local uploads use 'local-upload' as auction_url"
    rationale: "Distinguishes uploaded files from URL-processed files in output"

metrics:
  duration: "4 minutes"
  completed: "2026-01-27"
---

# Phase 01 Plan 02: Unified Format Integration Summary

Integrated unified format transformation into the extension's download pipeline, enabling unified CSV output.

## What Was Built

### Unified ZIP Export (src/utils/zip-export.ts)
- **UnifiedZipEntry**: Interface for pre-transformed CSV content with filename, csvContent, retailer, sourceUrl
- **createZipFromUnifiedManifests()**: Creates ZIP from unified CSV entries with duplicate filename handling
- Preserved existing `createZipFromRawFiles` and `createZipFromManifests` for backwards compatibility

### Popup Processing Pipeline (src/popup/popup.ts)
- **parseManifestFromBase64()**: Helper to parse raw base64 data via PARSE_FILE message to background worker
- **handleProcess()**: Rewritten to use unified transformation pipeline:
  1. Download raw manifest via processUrlInTab() or downloadRawFile()
  2. Parse to ManifestItem[] via background worker (PARSE_FILE message)
  3. Create AuctionMetadata with auctionUrl (bidPrice/shippingFee null for Phase 1)
  4. Transform using transformToUnified() from unified module
  5. Generate CSV using generateUnifiedCsv()
  6. Create ZIP using createZipFromUnifiedManifests()

## Data Flow

```
URL/File -> Raw base64 -> PARSE_FILE message -> ManifestItem[]
         -> transformToUnified() -> UnifiedManifestRow[]
         -> generateUnifiedCsv() -> CSV string
         -> UnifiedZipEntry -> createZipFromUnifiedManifests() -> ZIP
```

## Key Links Verified

| From | To | Via | Pattern |
|------|-----|-----|---------|
| popup.ts | unified/transform.ts | import | `import { transformToUnified, generateUnifiedCsv }` |
| popup.ts | background worker | message | `chrome.runtime.sendMessage({ type: 'PARSE_FILE' })` |
| popup.ts | zip-export.ts | import | `createZipFromUnifiedManifests` |
| zip-export.ts | unified/types.ts | type reference | `UnifiedZipEntry` interface |

## Output Format

Each unified CSV contains exactly 7 columns:
1. item_number
2. product_name
3. qty
4. unit_retail
5. auction_url (first row only)
6. bid_price (empty - Phase 5)
7. shipping_fee (empty - Phase 5)

## Backwards Compatibility

- `createZipFromRawFiles()` preserved in zip-export.ts
- `createZipFromManifests()` preserved in zip-export.ts
- Phase 6 can add UI toggle to switch between unified and raw output

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 4660d78 | feat | Add unified format support to zip-export |
| 105e9f8 | feat | Wire unified transformation into popup processing |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npx tsc --noEmit` passes
- [x] `npm run build` succeeds
- [x] popup.ts imports and uses unified transformation
- [x] popup.ts sends PARSE_FILE message to background worker
- [x] zip-export.ts has createZipFromUnifiedManifests function
- [x] createZipFromRawFiles preserved (backwards compatibility)

## Success Criteria Verification

- [x] Processing a manifest URL produces a unified CSV in the output zip
- [x] CSV has exactly 7 columns: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
- [x] auction_url is populated with the processed URL
- [x] bid_price and shipping_fee are empty (Phase 5 will populate these)
- [x] Each manifest becomes a separate .csv file in the zip
- [x] TypeScript compiles and extension builds without errors
- [x] Existing createZipFromRawFiles function is preserved

## Next Phase Readiness

**Ready for Phase 2**: Retailer parsing improvements
- Unified pipeline is complete and functional
- Each retailer's parsed ManifestItem[] flows through transformation
- Phase 2 can focus on improving individual retailer parsers (TechLiquidators, B-Stock)
