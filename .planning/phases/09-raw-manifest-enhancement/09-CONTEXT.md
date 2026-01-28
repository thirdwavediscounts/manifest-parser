# Phase 9: Raw Manifest Enhancement - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Append auction metadata columns (auction_url, bid_price, shipping_fee) to raw manifest downloads. Raw files get the same metadata that unified format already has, preserving original manifest data while adding extracted auction information.

</domain>

<decisions>
## Implementation Decisions

### Column placement
- Append metadata as last 3 columns after all existing columns
- Fixed order: auction_url, bid_price, shipping_fee
- Header names match unified format: snake_case (auction_url, bid_price, shipping_fee)
- No conflict handling needed — raw manifests don't have these columns

### Value distribution
- Metadata values on first data row only
- Subsequent rows have blank/empty strings for metadata columns
- Single sheet assumption — manifests have one data sheet
- Extraction should be robust; fallback to 0 for null values (defensive)

### File format handling
- Always output CSV regardless of input format (XLSX → CSV)
- Include UTF-8 BOM for Excel/Retool compatibility
- Preserve original column order and names exactly, just append metadata
- Re-encode with proper CSV escaping/quoting

### AMZD handling
- Use lot price (total) as bid_price for AMZD, not 0
- AMZD is fixed-price, so lot price is the relevant "bid" value

### Claude's Discretion
- Column width handling if any XLSX-specific formatting needed
- Error handling for edge cases
- Implementation approach for CSV re-encoding

</decisions>

<specifics>
## Specific Ideas

- Workflow always goes through auction listing pages — direct URL and local upload scenarios not relevant
- Extraction "SHOULD" always succeed; robust extractors are the goal
- AMZD lot price preferred over 0 for meaningful analysis

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-raw-manifest-enhancement*
*Context gathered: 2026-01-28*
