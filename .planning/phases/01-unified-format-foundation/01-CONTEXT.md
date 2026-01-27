# Phase 1: Unified Format Foundation - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the unified CSV output structure that all retailer data transforms into. Define the transformation pipeline that converts manifest data into a consistent format. This phase builds the capability — retailer-specific mappings come in Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### CSV Structure
- Column order: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
- Headers in snake_case format
- Empty/missing values: empty string (no placeholder text)
- Quote fields only when needed (standard CSV behavior — quote if contains commas/quotes/newlines)
- Prices as raw numbers without currency symbols (29.99 not $29.99)
- Price decimals: minimum needed (29, 29.5, 29.99 — no forced 2 decimals)
- Quantity: always whole numbers (round/truncate decimals)

### First-Row Metadata
- All rows have consistent 7 columns
- Rows 2+ have empty values for auction_url, bid_price, shipping_fee columns
- Always include all 7 columns even if metadata unavailable (empty placeholders)
- auction_url is full URL (not just path/ID)
- Each manifest comes from one auction (no multi-source handling needed)

### File Naming & Output
- Follow existing naming convention in the extension
- Phase 1 default: unified format only (raw becomes available via toggle in Phase 6)
- Output location: same as current downloads
- Separate files per manifest (not combined)
- No notification on save (silent)
- File conflicts: browser default behavior
- Target usage: Retool import

### Error & Edge Cases
- Missing item_number: include row with empty item_number column
- Empty manifest (no data rows): create CSV with headers only
- Parse failure: download both raw file + error log explaining the issue
- Invalid/unparseable prices: leave unit_retail empty

### Claude's Discretion
- Character encoding (UTF-8 recommended for Retool)
- Line ending format (doesn't matter for Retool)
- Internal error log format

</decisions>

<specifics>
## Specific Ideas

- Final destination is Retool app import — optimize for that
- Existing extension naming conventions should be preserved

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-unified-format-foundation*
*Context gathered: 2026-01-27*
