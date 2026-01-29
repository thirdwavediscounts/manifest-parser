# Phase 13: AMZD CSV + Metadata Fix + E2E - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix Amazon Direct raw CSV downloads so all rows are preserved with correct columns, fix metadata extraction (shipping_fee), and E2E verify. Raw mode passes through manifest content untouched — only appending 3 metadata columns. Unified format mode fixes column bleeding via right-anchor recovery.

</domain>

<decisions>
## Implementation Decisions

### Embedded newline handling
- Claude's discretion on approach (pre-process vs parser config)
- Log a console warning when rows are recovered from embedded newlines
- Preserve embedded newlines in output (properly quoted fields), don't strip them
- Newline fix applies to **unified format mode only** — raw mode is byte-for-byte pass-through

### Column bleeding recovery
- Only applies to unified format mode — raw mode does not touch manifest content
- Use right-anchor extraction to recover correct values from `__parsed_extra` fields
- If recovery fails for a row, include the row with empty fields (don't drop rows)

### Raw mode pass-through
- Manifest content is byte-for-byte pass-through — no cleaning, no newline fixes, no column adjustments
- Append 3 columns: `auction_url`, `bid_price`, `shipping_fee` (with headers on header row)
- Match source delimiter when appending columns
- Failed metadata extraction uses `0` as the value (not empty, not null)
- Metadata values are auction-level (same for every row)

### Claude's Discretion
- Embedded newline detection/fix approach (pre-process vs parser)
- AMZD shipping_fee DOM selector strategy
- E2E test verification approach

</decisions>

<specifics>
## Specific Ideas

- "When manifest file is downloaded do not edit or clean it, just add the auction_url, bid_price, shipping_fee"
- Raw mode is sacred — the user wants the original data exactly as the retailer provided it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-amzd-csv-metadata-fix-e2e*
*Context gathered: 2026-01-29*
