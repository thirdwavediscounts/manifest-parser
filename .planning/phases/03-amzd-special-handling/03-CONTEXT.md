# Phase 3: AMZD Special Handling - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse Amazon Direct (AMZD) manifests with misaligned columns correctly. Extract prices, quantities, ASINs, and product names despite column inconsistencies caused by commas in titles. Calculate unit_retail using a fixed multiplier.

</domain>

<decisions>
## Implementation Decisions

### Right-anchor extraction
- **AMZD-only feature** — other retailers use standard header-based extraction
- Try header-based extraction first, fall back to right-anchor when misalignment detected
- **Misalignment detection:** If row has more cells than headers (any extra cells), use right-anchor
- Right-anchor positions: price at -2, qty at -3, seller at -4 from end
- Positions are specific to AMZD, no need to make configurable

### Price calculation
- **Fixed multiplier:** unit_retail = Lot item price * 4.5
- Rationale: AMZD unit retails are inaccurate, need 3.5-4.5x to match actual listing prices. Using 4.5 as fixed value.
- **Missing/invalid price:** Leave unit_retail blank (not 0)
- **Rounding:** 2 decimal places (standard currency format)

### Title/product name
- Use `Item Title` column directly — don't worry about merging split columns
- **Fallback chain:** Item Title → Model → Brand
- If all missing, product_name is blank

### Error handling
- **Missing ASIN:** Leave item_number blank, still include row
- **Empty rows:** Skip rows with no usable data (no ASIN, no title, no price)
- **Unrecognized format:** Show error to user (don't silently fail or fall back)
- **Logging:** Log warnings for rows with issues (missing data, bad format) for debugging

### Claude's Discretion
- Exact misalignment detection logic
- How to identify "empty" vs "partially filled" rows
- ASIN pattern matching implementation (B0XXXXXXXXX)
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- The 4.5 multiplier comes from manual verification against actual Amazon listings
- Right-anchor extraction is a fallback, not the primary method — trust headers when they work
- AMZD manifests can have well-formed columns (like the sample in csvs/) or misaligned ones

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-amzd-special-handling*
*Context gathered: 2026-01-27*
