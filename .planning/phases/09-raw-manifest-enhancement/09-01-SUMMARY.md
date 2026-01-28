---
phase: 09-raw-manifest-enhancement
plan: 01
subsystem: data-processing
tags: [csv, xlsx, metadata, base64, tdd]

# Dependency graph
requires:
  - phase: 01-unified-format-foundation
    provides: AuctionMetadata type definition
provides:
  - appendMetadataToManifest function for raw file enhancement
affects: [09-02 UI integration, raw file download workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [base64 decode, xlsx to csv conversion, metadata column append]

key-files:
  created:
    - src/utils/raw-metadata.ts
    - tests/utils/raw-metadata.test.ts
  modified: []

key-decisions:
  - "D09-01-01: Use ?? 0 for null bidPrice/shippingFee (defensive default)"
  - "D09-01-02: Always output CSV regardless of input format (XLSX -> CSV)"
  - "D09-01-03: Metadata values on first data row only, empty strings for subsequent rows"

patterns-established:
  - "Raw metadata append: Parse input -> Append columns -> Re-encode as CSV with BOM"
  - "TDD workflow: Failing tests -> Implementation -> Verify"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 9 Plan 1: Raw Metadata Append Summary

**TDD-developed function that appends auction_url, bid_price, shipping_fee columns to raw manifest files, converting XLSX to CSV with UTF-8 BOM**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T07:38:11Z
- **Completed:** 2026-01-28T07:42:10Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files created:** 2

## Accomplishments
- Created appendMetadataToManifest function with full TDD coverage (12 tests)
- Handles both CSV and XLSX/XLS input formats
- Outputs CSV with UTF-8 BOM for Excel/Retool compatibility
- Proper CSV escaping for URLs with commas, quoted fields

## Task Commits

TDD workflow commits:

1. **RED: Failing tests** - `c58873e` (test)
   - 12 tests covering CSV input, XLSX input, edge cases
2. **GREEN: Implementation** - `2fabfc1` (feat)
   - Full implementation passing all tests

## Files Created

- `src/utils/raw-metadata.ts` - Main function: appendMetadataToManifest
  - parseCSV: Parse CSV string into rows
  - parseXLSX: Parse XLSX binary to rows using xlsx library
  - appendMetadataColumns: Add 3 metadata columns
  - escapeCSVField: Proper CSV quoting
- `tests/utils/raw-metadata.test.ts` - 287 lines, 12 tests
  - CSV input tests (7 tests)
  - XLSX input tests (2 tests)
  - Edge case tests (3 tests)

## Decisions Made

1. **D09-01-01: Use ?? 0 for null bidPrice/shippingFee**
   - Rationale: Defensive default per CONTEXT.md guidance
   - Null values become "0" in output, not empty strings

2. **D09-01-02: Always output CSV regardless of input format**
   - Rationale: Consistent output format for Retool import
   - XLSX/XLS inputs are converted to CSV

3. **D09-01-03: Metadata values on first data row only**
   - Rationale: Matches unified format behavior
   - Subsequent rows get empty strings for metadata columns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TDD workflow proceeded smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- appendMetadataToManifest function ready for integration
- Function exported and importable from src/utils/raw-metadata.ts
- Ready for Plan 09-02 (UI integration to use this function in raw download workflow)

---
*Phase: 09-raw-manifest-enhancement*
*Plan: 01*
*Completed: 2026-01-28*
