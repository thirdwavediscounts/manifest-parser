---
phase: "04"
plan: "02"
subsystem: "data-processing"
tags: ["sorting", "pipeline", "processing", "integration"]
dependency-graph:
  requires: ["04-01"]
  provides: ["sortRows", "processRows", "integrated-pipeline"]
  affects: ["05-01", "05-02"]
tech-stack:
  added: []
  patterns: ["pipeline-composition", "immutable-sort", "case-insensitive-comparison"]
key-files:
  created: []
  modified:
    - "src/unified/processing.ts"
    - "src/unified/transform.ts"
    - "src/unified/index.ts"
    - "tests/unified/processing.test.ts"
    - "tests/unified/transform.test.ts"
decisions:
  - id: "D04-02-01"
    description: "Zero-value unit_retail sorts to end (treat as lowest priority)"
  - id: "D04-02-02"
    description: "Metadata assigned to first row of sorted output (highest-value item)"
  - id: "D04-02-03"
    description: "processRows pipeline: cleanRow map -> deduplicateRows -> sortRows"
metrics:
  duration: "4 minutes"
  completed: "2026-01-27"
---

# Phase 4 Plan 2: Sorting and Pipeline Integration Summary

**One-liner:** Row sorting by unit_retail DESC with full processing pipeline integrated into transformToUnified.

## What Was Built

### sortRows Function
- Primary sort: `unit_retail` DESCENDING (highest value first)
- Secondary sort: `product_name` ASCENDING, case-insensitive
- Zero-value items placed at END of sorted output
- Immutable: returns new array, does not mutate input
- Uses `localeCompare` for proper alphabetical sorting

### processRows Pipeline Function
Chains three operations in sequence:
1. `cleanRow` - applied via map to each row
2. `deduplicateRows` - merge items with same normalized item_number
3. `sortRows` - sort by value descending

### transformToUnified Integration
- Now applies `processRows` internally before returning
- Metadata (auction_url, bid_price, shipping_fee) assigned to FIRST processed row
- First row is now highest-value item after sorting
- Behavior change: metadata no longer on first INPUT row, now on first OUTPUT row

## Key Implementation Details

### Sort Comparator Logic
```typescript
// Zero-value items sort last
if (aRetail === 0 && bRetail !== 0) return 1
if (aRetail !== 0 && bRetail === 0) return -1

// Non-zero items: descending by unit_retail
if (aRetail !== bRetail) return bRetail - aRetail

// Equal unit_retail: ascending by product_name (case-insensitive)
return a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase())
```

### Pipeline Composition
```typescript
export function processRows(rows: UnifiedManifestRow[]): UnifiedManifestRow[] {
  const cleanedRows = rows.map(cleanRow)
  const deduplicatedRows = deduplicateRows(cleanedRows)
  return sortRows(deduplicatedRows)
}
```

## Test Coverage

### sortRows Tests (13 new tests)
- Primary sort by unit_retail descending
- Secondary sort by product_name ascending
- Case-insensitive product_name comparison
- Zero-value items at end
- Stable sort preserves equal-key order
- Immutability verification

### processRows Tests (8 new tests)
- Pipeline composition verification
- Clean + deduplicate + sort order
- Empty input handling
- Integration with real-world dirty data scenarios

### Updated Transform Tests
- 2 tests updated to expect sorted output
- Metadata now verified on highest-value item

## Commits

| Hash | Type | Description |
|------|------|-------------|
| deffa32 | test | Add failing tests for sortRows and processRows (RED) |
| f2e3b1d | feat | Implement sortRows and processRows functions (GREEN) |
| 4da2845 | feat | Integrate processRows into transformToUnified |

## Decisions Made

1. **[D04-02-01] Zero-value unit_retail sorts to end**
   - Rationale: Items with no value are lowest priority for analysis
   - Alternative: Could sort them by name at beginning - rejected as less useful

2. **[D04-02-02] Metadata assigned to first sorted row**
   - Rationale: After sorting, first row is highest-value item - most relevant for metadata
   - Breaking change: Metadata no longer on first input row
   - This is intentional per requirements

3. **[D04-02-03] Pipeline order: clean -> deduplicate -> sort**
   - Rationale: Clean first to normalize for dedup, sort last for final output
   - Dedup must happen before sort to avoid sorting duplicates

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
All 238 tests pass
TypeScript compiles without errors
Extension builds successfully (363.64 kB service worker)
```

## Next Phase Readiness

Phase 4 (Data Processing Pipeline) is now complete:
- [x] 04-01: Data cleaning and deduplication
- [x] 04-02: Sorting and pipeline integration

Ready for Phase 5 (Enhanced Export Features):
- Export filename generation
- Download trigger integration
- All processing infrastructure in place
