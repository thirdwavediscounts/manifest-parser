---
phase: 08
plan: 01
subsystem: documentation
tags: [dom, selectors, css, regex, maintenance]

dependency-graph:
  requires: [05-01]
  provides: ["selector-documentation", "inline-code-comments"]
  affects: [09-xx]

tech-stack:
  added: []
  patterns: ["selector-documentation", "inline-comments"]

key-files:
  created:
    - docs/SELECTORS.md
    - .planning/codebase/SELECTORS.md
  modified:
    - src/retailers/sites/bstock.ts
    - src/retailers/sites/bstock-auction.ts
    - src/retailers/sites/techliquidators.ts
    - src/retailers/sites/amazon.ts

decisions:
  - id: D08-01-01
    decision: "Document selectors per retailer with CSS and regex patterns"
    rationale: "Enable maintenance when retailer sites change HTML structure"
  - id: D08-01-02
    decision: "AMZD section documents bidPrice always null (fixed-price, not auction)"
    rationale: "Prevent confusion about missing bid extraction for Amazon Direct"
  - id: D08-01-03
    decision: "Include maintenance guide in SELECTORS.md"
    rationale: "Enable future developers to update selectors independently"

metrics:
  duration: "4 minutes"
  completed: "2026-01-28"
---

# Phase 08 Plan 01: DOM Selector Documentation Summary

Comprehensive DOM selector reference documentation for all 11 retailers with inline code comments.

## What Was Built

### Task 1: SELECTORS.md Reference Documentation

Created `docs/SELECTORS.md` with:

1. **Per-retailer sections** (11 total: ACE, AMZ, AMZD, ATT, BY, COSTCO, JCP, QVC, RC, TGT, TL)
   - Bid price CSS selectors and fallback regex patterns
   - Shipping fee CSS selectors and fallback regex patterns
   - Example HTML snippets showing target elements
   - Notes explaining special behaviors
   - Source file references

2. **Fallback behavior documentation**
   - `null` = not found (empty CSV cell)
   - `0` = found and is zero (free shipping)

3. **Maintenance guide**
   - When to update the document
   - How to update selectors
   - Selector priority guidelines
   - Testing selectors in browser console

4. **Mirror copy** at `.planning/codebase/SELECTORS.md` for planning context

### Task 2: Inline Code Comments

Enhanced all 4 retailer module files with descriptive comments:

- `bstock.ts` - B-Stock marketplace selectors (AMZ, ATT, COSTCO, TGT, RC)
  - `__NEXT_DATA__` JSON extraction as primary source
  - DOM fallback selectors with class/id patterns

- `bstock-auction.ts` - B-Stock auction page selectors (ACE, BY, JCP, QVC)
  - CSS class/ID selectors for bid and shipping
  - Regex fallback patterns with example formats

- `techliquidators.ts` - TechLiquidators selectors (TL)
  - CSS selectors targeting TL-specific elements
  - Regex fallback patterns for body text search

- `amazon.ts` - Amazon Direct selectors (AMZD)
  - Documented bidPrice always null (fixed-price, not auction)
  - Amazon-specific shipping selectors (#delivery-message, etc.)

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D08-01-01 | Document selectors per retailer with CSS and regex patterns | Enable maintenance when retailer sites change HTML structure |
| D08-01-02 | AMZD section documents bidPrice always null | Prevent confusion about missing bid extraction for Amazon Direct |
| D08-01-03 | Include maintenance guide in SELECTORS.md | Enable future developers to update selectors independently |

## Deviations from Plan

None - plan executed exactly as written.

## Files Created/Modified

| File | Change |
|------|--------|
| `docs/SELECTORS.md` | Created - comprehensive selector reference (622 lines) |
| `.planning/codebase/SELECTORS.md` | Created - mirror copy for planning context |
| `src/retailers/sites/bstock.ts` | Enhanced - added selector comments |
| `src/retailers/sites/bstock-auction.ts` | Enhanced - added selector comments |
| `src/retailers/sites/techliquidators.ts` | Enhanced - added selector comments |
| `src/retailers/sites/amazon.ts` | Enhanced - added selector comments |

## Verification Results

- [x] docs/SELECTORS.md contains all 11 retailers (verified with grep)
- [x] .planning/codebase/SELECTORS.md mirrors the documentation
- [x] All 4 retailer module files have "Bid price selectors" comments
- [x] All 4 retailer module files have "Shipping selectors" comments
- [x] TypeScript compilation succeeds (npx tsc --noEmit)
- [x] No functional code changes (comments only in Task 2)

## Next Phase Readiness

Phase 8 (Metadata DOM Audit) is complete. The documentation provides:

1. **Maintenance capability** - Future developers can update selectors when sites change
2. **Debugging reference** - Comments in code explain what each selector targets
3. **Audit trail** - Last Verified date placeholders for manual verification
