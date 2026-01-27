# Phase 5: Auction Metadata Extraction - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract bid price, shipping fee, auction title, and end time from auction listing pages during tab processing. Integrate metadata into the unified CSV output (first row only, except auction_title goes in filename).

</domain>

<decisions>
## Implementation Decisions

### Data Extraction Targets
- Extract: bid_price, shipping_fee, auction_url (columns), auction_title (filename), auction_end_time
- bid_price: Extract current/winning bid amount (not minimum bid or buy-now)
- shipping_fee: If "TBD" or not found, use 0
- auction_title: Goes in filename (same pattern as existing logic)
- auction_url: Always available — no auction URL means nothing to process

### Retailer Variations
- Support three retailer types: B-Stock, TechLiquidators, Amazon Direct (AMZD)
- B-Stock: Separate extraction logic per sub-site (different properties have different selectors)
- TechLiquidators: Consistent page structure across listings
- AMZD: Metadata on same page as manifest download
- Use existing site detection logic in codebase (no new URL detection)

### Missing Data Handling
- bid_price not found: Default to 0
- shipping_fee not found: Default to 0
- Partial extraction failures: Console log only (no user notification)
- No retry exhaustion popup — silently use defaults after retries

### Extraction Timing
- Extract metadata BEFORE manifest download (strictly sequential)
- Wait for full page load before extraction attempt
- Retry logic: 2 retries (3 total attempts) with 2-3 second delays
- Per-tab extraction as each tab is processed (not batch)
- Show status text: "Extracting metadata..." during extraction

### Claude's Discretion
- Exact CSS selectors for each retailer/sub-site
- Specific retry delay timing within 2-3 second range
- How to detect "full page load" per retailer
- Internal data structure for passing metadata to CSV generation

</decisions>

<specifics>
## Specific Ideas

- Auction title in filename matches existing naming pattern
- B-Stock sub-sites may include: bstock.com, liquidation.amazon.com, directliquidation.com, and others
- Status text feedback keeps user informed during extraction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-auction-metadata-extraction*
*Context gathered: 2026-01-27*
