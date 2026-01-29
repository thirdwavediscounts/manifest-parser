---
phase: 12-bstock-nextjs-json-fix-e2e
plan: 01
subsystem: extraction
tags: [bstock, nextjs, json-paths, config-driven, typescript]

requires:
  - phase: 05-retailer-modules
    provides: bstock.ts extractMetadata with ISOLATED world constraint
provides:
  - Per-retailer JSON path config at src/retailers/config/nextjs-paths.ts
  - Config-driven extraction in bstock.ts for all 5 Next.js retailers
  - resolvePath and extractFieldValue utility functions
affects: [12-02 E2E tests, future retailer additions]

tech-stack:
  added: []
  patterns: [config-driven extraction, inline config mirror for ISOLATED world]

key-files:
  created: [src/retailers/config/nextjs-paths.ts]
  modified: [src/retailers/sites/bstock.ts, docs/SELECTORS.md]

key-decisions:
  - "Inline config mirror in extractMetadata due to ISOLATED world — external file is source of truth for docs/tests"
  - "All 5 retailers share identical paths (verified from SELECTORS.md AMZ docs)"

patterns-established:
  - "Config-driven extraction: define paths in config, resolve with _resolvePath + _extractField"
  - "Inline config mirror pattern: external config file + inline copy with sync comment"

duration: 4min
completed: 2026-01-29
---

# Phase 12 Plan 01: Per-Retailer JSON Path Config Summary

**Config-driven __NEXT_DATA__ extraction with typed path mappings for AMZ/ATT/COSTCO/RC/TGT and strict cents-to-dollars conversion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-29T02:11:07Z
- **Completed:** 2026-01-29T02:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created typed per-retailer JSON path config with unit info, authRequired flags, and lastVerified dates
- Refactored bstock.ts extractBidPrice and extractShippingFeeNextJs to use config-driven path resolution
- Added sanity checks: bid > 0, shipping >= 0, return null on invalid values
- Updated SELECTORS.md with config source references for all 5 Next.js retailers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create per-retailer JSON path config file** - `d64c896` (feat)
2. **Task 2: Refactor bstock.ts to use config-driven extraction and update SELECTORS.md** - `9712b30` (refactor)

## Files Created/Modified
- `src/retailers/config/nextjs-paths.ts` - Per-retailer JSON path config with types and helpers
- `src/retailers/sites/bstock.ts` - Config-driven extraction replacing hardcoded paths
- `docs/SELECTORS.md` - Added config source references for AMZ, ATT, COSTCO, RC, TGT

## Decisions Made
- Inline config mirror in extractMetadata due to ISOLATED world constraint (D05-01-02) — external file serves as source of truth for documentation and E2E tests
- All 5 Next.js retailers share identical paths based on verified SELECTORS.md documentation

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config file ready for E2E test imports in plan 12-02
- bstock.ts extraction refactored and all 310 existing unit tests passing
- Playwright E2E tests have pre-existing version conflict (unrelated to this plan)

---
*Phase: 12-bstock-nextjs-json-fix-e2e*
*Completed: 2026-01-29*
