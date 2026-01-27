# Phase 4: Data Processing Pipeline - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean, deduplicate, and sort manifest data for consistent output. This is internal data transformation — processing happens after retailer parsing and before CSV generation. Cleaning, deduplication, and sorting are applied to the unified format rows.

</domain>

<decisions>
## Implementation Decisions

### Data Cleaning Rules
- Trim leading/trailing whitespace from ALL fields
- Remove non-printable characters only (control chars, zero-width chars) — keep punctuation and symbols
- Empty/null-ish values become empty strings ("") — no placeholders like "N/A"
- unit_retail uses minimal decimals (current behavior: "5" stays "5", not "5.00")
- item_number: strip all whitespace (spaces should not appear in identifiers)

### Duplicate Detection
- Duplicate key: item_number only (price differences don't prevent merge)
- Case-insensitive matching: "ABC123" and "abc123" are the same item
- Leading zeros stripped FOR COMPARISON ONLY: "00123" and "123" match
- Output preserves longer format: merged row keeps "00123" not "123"
- Rows with empty/missing item_number: NEVER merged — each stays as separate row
- Processing order: clean first, then deduplicate on cleaned values

### Merge Conflict Resolution
- Quantities: SUM across all duplicate rows (3 + 2 = 5)
- product_name: use value from row with HIGHEST quantity
- unit_retail: use HIGHEST price (regardless of quantity)
- item_number: keep LONGER format (preserves leading zeros)
- Tiebreaker (equal quantities): use values from FIRST seen row in file
- No merge tracking — output doesn't indicate rows were combined

### Sorting Behavior
- Primary sort: unit_retail DESCENDING (highest-value items first)
- Secondary sort: product_name ALPHABETICAL (A-Z, case-insensitive)
- Null/empty unit_retail: placed at END (after all priced items)
- Case-insensitive sorting for product_name

### Claude's Discretion
- Specific non-printable characters to strip
- Implementation approach for case-insensitive comparison
- Edge case handling not covered above

</decisions>

<specifics>
## Specific Ideas

- Item numbers should never have whitespace — always strip it
- Leading zeros in item_number should be preserved in output even when merged with shorter version
- Cleaning happens before deduplication so comparisons work on normalized data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-data-processing-pipeline*
*Context gathered: 2026-01-27*
