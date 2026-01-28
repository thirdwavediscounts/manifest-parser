# Phase 8: Metadata DOM Audit - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Document and validate bid price and shipping fee DOM selectors for each retailer. Verify that selectors work against current retailer page structures. This phase audits and documents existing extraction logic — it does not add new retailers or change extraction behavior.

</domain>

<decisions>
## Implementation Decisions

### Verification Approach
- Live E2E tests against actual retailer pages
- Full metadata flow testing: page load → selectors → parsed values
- Run on demand (manually, when investigating issues or before releases)
- On failure: log which selector broke (no screenshots needed)

### Documentation Format
- Both inline code comments AND separate reference markdown file
- Reference file location: docs/SELECTORS.md (primary, discoverable)
- Also mirror in .planning/ for planning context
- Reference file includes full audit trail: selectors, example HTML snippets, last verified date, known issues
- Inline comments: descriptive style — explain what element is targeted and why the selector works

### Fallback Strategies
- When bid price selector finds nothing: log warning + return null
- No backup selectors — document only the current working selector
- When retailer site structure changes: manual update required (developer investigates)
- Surface failures to user: status message in popup ("Could not extract bid price from [retailer]")

### Retailer Coverage
- All 10 standard retailers: ACE, AMZ, ATT, COSTCO, BY, JCP, QVC, RC, TGT, TL
- Plus AMZD (Amazon Direct)
- Document in alphabetical order
- AMZD special note: fixed-price (no bidding), shipping usually shows as "free delivery"
- Assume all retailers have both bid price and shipping fee — attempt extraction for both

### Claude's Discretion
- Exact CSS selector syntax choices
- E2E test framework/tooling selection
- Reference file internal organization (tables vs sections)
- How to structure inline comments consistently

</decisions>

<specifics>
## Specific Ideas

- AMZD is fixed-price, not an auction — bidPrice always null is expected
- AMZD shipping typically shows "free delivery"
- Status message should follow existing popup status pattern: "Could not extract bid price from [retailer]..."
- E2E tests should validate the full pipeline, not just selector existence

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-metadata-dom-audit*
*Context gathered: 2026-01-28*
