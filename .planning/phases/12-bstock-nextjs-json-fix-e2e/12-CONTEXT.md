# Phase 12: B-Stock Next.js JSON Fix + E2E - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix metadata extraction for 5 Next.js retailers (AMZ, ATT, COSTCO, RC, TGT) by mapping correct JSON paths in `__NEXT_DATA__`, then E2E verify each retailer. Per-retailer JSON path mapping — not a single hardcoded path for all.

</domain>

<decisions>
## Implementation Decisions

### JSON path mapping strategy
- Static config object mapping retailer to JSON paths (not dynamic discovery)
- Separate config file — not inline in extractMetadata(). Extraction logic imports from config
- Config includes metadata per path: last-verified date, example values, field descriptions (not just raw paths)
- Per-retailer config shape: Claude's discretion — shared structure if possible, per-retailer flexibility if live inspection reveals it's needed

### Fallback behavior
- When `__NEXT_DATA__` is missing entirely: Claude's discretion (return null or fall back to DOM)
- When a configured JSON path doesn't resolve: return null silently (no console warnings)
- Staleness detection: rely on E2E tests to catch regressions, no runtime detection needed
- Null behavior consistent across all retailers (Next.js and Classic): null when extraction fails, `?? 0` in CSV

### Extraction validation
- Basic sanity checks required: is it a number? Is it non-negative? Return null if invalid
- Unit handling (cents vs dollars): Claude determines the most reliable approach for 100% accuracy — must be strict and deterministic, no heuristics
- E2E validation depth: Claude's discretion on whether to cross-check JSON extraction against DOM-displayed values

### Retailer-specific quirks
- No known quirks upfront — let 12-01 live inspection discover differences
- Auth flag in config: support marking fields as auth-required so extraction returns null (not 0) when unauthenticated
- If a "Next.js" retailer doesn't have `__NEXT_DATA__`, fall back to Classic-style DOM scraping. Config specifies extraction method per retailer
- Update SELECTORS.md with JSON paths alongside existing DOM selectors (single source of truth)

### Claude's Discretion
- Per-retailer config shape (shared vs flexible) — based on live inspection
- Fallback when `__NEXT_DATA__` entirely missing
- Unit conversion approach (must be 100% accurate, not heuristic)
- E2E cross-check depth (JSON vs DOM comparison)
- Exact progress/logging during extraction

</decisions>

<specifics>
## Specific Ideas

- "We need strict logic for unit handling — 100% accurate data" (no guessing cents vs dollars)
- Config should be a separate file from extraction logic for easy path updates
- SELECTORS.md should document both DOM selectors and JSON paths in one place

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-bstock-nextjs-json-fix-e2e*
*Context gathered: 2026-01-29*
