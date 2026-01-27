---
phase: 01-unified-format-foundation
plan: 01
subsystem: unified-output
tags: [tdd, transformation, csv, types]

dependency_graph:
  requires: []
  provides: [unified-types, unified-transform, unified-csv-generation]
  affects: [01-02, 02-01, 02-02, 05-02]

tech_stack:
  added: []
  patterns: [immutable-transform, csv-escaping, tdd-red-green-refactor]

key_files:
  created:
    - src/unified/types.ts
    - src/unified/transform.ts
    - src/unified/index.ts
    - tests/unified/transform.test.ts
  modified: []

decisions:
  - id: D01-01-01
    decision: "Metadata embedded in UnifiedManifestRow (bid_price, shipping_fee as strings)"
    rationale: "Keeps rows self-contained for CSV generation, strings allow empty values"
  - id: D01-01-02
    decision: "formatPrice uses Number(value.toFixed(2)) for minimal decimals"
    rationale: "29.00 becomes '29', 29.50 becomes '29.5' - cleaner Retool import"
  - id: D01-01-03
    decision: "UTF-8 BOM included for Excel/Retool compatibility"
    rationale: "Excel and many tools expect BOM for UTF-8 CSV files"

metrics:
  duration: "3 minutes"
  completed: "2026-01-27"
---

# Phase 01 Plan 01: Unified Format Types and Transformation Summary

TDD-based implementation of unified CSV format types and transformation functions for Retool import compatibility.

## What Was Built

### Core Types (src/unified/types.ts)
- **AuctionMetadata**: Interface for auction-level data (url, bid, shipping)
- **UnifiedManifestRow**: Interface matching CSV columns (7 fields in exact order)
- **UnifiedManifestOutput**: Composite type for complete output

### Transformation Functions (src/unified/transform.ts)
- **transformToUnified()**: Maps ManifestItem[] to UnifiedManifestRow[] with metadata on first row only
- **generateUnifiedCsv()**: Produces CSV string with proper escaping and UTF-8 BOM
- **formatPrice()**: Formats numbers with minimal decimals (29.00 -> "29")
- **escapeCSVField()**: Quotes fields containing commas/quotes/newlines

### Module Exports (src/unified/index.ts)
- Clean barrel export for public API: types and functions

## Key Behaviors

| Input | Output | Test Coverage |
|-------|--------|---------------|
| Empty items[] | Empty rows[] | Verified |
| 3 items + metadata | Metadata on row 1 only, empty on rows 2-3 | Verified |
| Price 29.00 | "29" (no trailing zeros) | Verified |
| Price 29.99 | "29.99" (decimals preserved) | Verified |
| Quantity 2.5 | 3 (rounded) | Verified |
| Name with comma | Properly quoted | Verified |
| null bid/shipping | Empty strings | Verified |

## Test Results

```
tests/unified/transform.test.ts
  transformToUnified (9 tests)
  generateUnifiedCsv (10 tests)
  integration (2 tests)

21 tests passing
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 3bc9731 | test | Add failing tests for unified format transformation (RED) |
| 21f75c2 | feat | Implement unified format transformation (GREEN) |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 01-02**: Integration into download pipeline
- Unified types and transform functions available via `import from './unified'`
- All success criteria from plan met
- No blockers

## Success Criteria Verification

- [x] TypeScript compiles without errors
- [x] transformToUnified correctly maps ManifestItem fields to UnifiedManifestRow fields
- [x] generateUnifiedCsv produces valid CSV with exactly 7 columns in correct order
- [x] Metadata appears only on first data row
- [x] Prices formatted as raw numbers (29.99, not $29.99)
- [x] Quantities are whole numbers
- [x] CSV properly escapes fields containing commas/quotes/newlines
