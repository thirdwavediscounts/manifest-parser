# Phase 2: Standard Retailer Mappings - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Map 10 retailers (ACE, AMZ, ATT, COSTCO, BY, JCP, QVC, RC, TGT, TL) with standard column patterns to the unified format. Each retailer's manifest columns translate to: item_number, product_name, qty, unit_retail. AMZD (Amazon Direct with misaligned columns) is handled separately in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Missing Field Handling
- Use fallback columns when primary is missing (e.g., Item# if no UPC), blank if no fallback matches
- Fallback order is **retailer-specific** — each retailer config defines its own priority chain
- For product_name: fallback to Description if Title empty, then Model if still empty
- For qty: leave blank if missing (no default assumption)
- For unit_retail: leave blank if missing
- Skip rows where ALL key fields are empty (item_number, product_name, unit_retail all blank)
- Treat "not available" (ATT) as blank in item_number
- Define a null-value list: 'N/A', 'n/a', '-', 'none', '0000000000', 'not available' — all become blank

### Multi-Column Sources
- **No combining** — use only the primary column for each field, no Brand+Title merging
- Split columns (like 'Item Title 1', 'Item Title 2') — use first column only (AMZD merging is Phase 3)
- Multiple price columns — retailer config specifies which to use
- Multiple qty columns — retailer config specifies which to use

### Price Normalization
- Strip $ and commas, keep number as-is (don't auto-convert cents)
- Negative prices convert to positive (credits become absolute values)
- Minimal decimal places (12 stays 12, 12.90 → 12.9, no trailing zeros)
- Unparseable price values (TBD, Call for price, non-numeric) become blank

### Unmapped Columns
- **Ignore completely** — only output the 7 unified columns
- Unknown/unexpected column headers: warn in console but continue parsing
- If manifest has NO recognizable columns: output CSV with headers but empty data (minimal output)

</decisions>

<specifics>
## Specific Ideas

- Retailer-specific configuration for: fallback chains, price column selection, qty column selection
- Console warnings for unrecognized columns help debugging without breaking flow
- Null-value list should be case-insensitive

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-standard-retailer-mappings*
*Context gathered: 2026-01-27*
