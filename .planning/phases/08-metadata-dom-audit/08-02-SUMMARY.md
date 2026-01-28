---
phase: 08-metadata-dom-audit
plan: 02
subsystem: testing
tags: [e2e, selectors, jsdom, vitest, metadata]
dependency-graph:
  requires: ["08-01"]
  provides: ["e2e-selector-tests", "html-fixtures"]
  affects: []
tech-stack:
  added: ["jsdom", "@types/jsdom"]
  patterns: ["snapshot-based-testing", "dom-selector-validation"]
key-files:
  created:
    - tests/e2e/metadata-selectors.test.ts
    - tests/fixtures/retailer-pages/bstock-auction.html
    - tests/fixtures/retailer-pages/techliquidators.html
    - tests/fixtures/retailer-pages/amazon-direct.html
    - tests/fixtures/retailer-pages/bstock-marketplace.html
  modified:
    - package.json
    - package-lock.json
decisions:
  - id: D08-02-01
    description: Use jsdom for DOM testing instead of live page testing
  - id: D08-02-02
    description: Group fixtures by selector source (4 files for 11 retailers)
  - id: D08-02-03
    description: Test file renamed to .test.ts to match vitest pattern
metrics:
  duration: 5 min
  completed: 2026-01-28
---

# Phase 08 Plan 02: E2E Selector Validation Tests Summary

E2E test infrastructure for validating bid/shipping selectors against HTML fixtures using jsdom.

## What Was Built

### E2E Test File (tests/e2e/metadata-selectors.test.ts)

Created comprehensive E2E test suite with:

- **26 test cases** covering all 11 retailers
- **Selector extraction functions** mirroring retailer module logic
- **Failure logging** identifying which selector failed
- **Helper functions** for fixture loading and result logging

Test structure:
```
describe('Metadata Selector Validation')
  describe('B-Stock Auction Pages')     # ACE, BY, JCP, QVC
  describe('TechLiquidators')           # TL
  describe('Amazon Direct')             # AMZD (fixed-price)
  describe('B-Stock Marketplace')       # AMZ, ATT, COSTCO, TGT, RC
  describe('Selector Fallback Behavior')
```

### HTML Fixture Files (tests/fixtures/retailer-pages/)

Created 4 fixture files covering all retailer page types:

| Fixture | Retailers | Elements |
|---------|-----------|----------|
| bstock-auction.html | ACE, BY, JCP, QVC | bid-amount, shipping, freight |
| techliquidators.html | TL | bid-amount, shipping, freight |
| amazon-direct.html | AMZD | delivery-message, free delivery |
| bstock-marketplace.html | AMZ, ATT, COSTCO, TGT, RC | __NEXT_DATA__, DOM fallbacks |

### Package Updates

- Added `test:e2e` script: `vitest run tests/e2e --testTimeout=30000`
- Installed jsdom and @types/jsdom for DOM testing

## Key Implementation Details

### Selector Coverage

Each retailer tests both bid price and shipping fee extraction:

- **B-Stock Auction**: CSS selectors + regex fallback patterns
- **B-Stock Marketplace**: __NEXT_DATA__ JSON + DOM fallback
- **TechLiquidators**: CSS selectors + regex fallback patterns
- **AMZD**: Shipping only (bidPrice always null for fixed-price)

### Failure Logging

When selectors fail, logs include:
```
SELECTOR FAILED: [retailer] [field] - selector '[selector]' found no match.
Check src/retailers/sites/ for selector definitions.
```

### AMZD Special Handling

AMZD tests correctly verify:
- bidPrice returns null (fixed-price, not auction)
- shippingFee detects free delivery (returns 0)

## Verification Results

```
Test Files: 1 passed (1)
Tests:      26 passed (26)
Duration:   807ms
```

All selectors extract values correctly from fixtures:
- ACE/BY/JCP/QVC: bidPrice $1,250, shippingFee $150
- TL: bidPrice $850, shippingFee $125
- AMZD: bidPrice null, shippingFee 0 (free)
- AMZ/ATT/COSTCO/TGT/RC: bidPrice $1,875, shippingFee $225

## Deviations from Plan

### [Rule 3 - Blocking] Test file renamed to match vitest pattern

- **Found during:** Task 2
- **Issue:** Plan specified `metadata-selectors.e2e.ts` but vitest only matches `.test.ts`
- **Fix:** Renamed to `metadata-selectors.test.ts`
- **Files modified:** tests/e2e/metadata-selectors.test.ts
- **Commit:** 0e04096

## Commits

| Commit | Description |
|--------|-------------|
| 0e04096 | test(08-02): add E2E test file for metadata selector validation |
| 016d7d4 | test(08-02): add HTML fixtures and test:e2e script |

## Usage

Run E2E tests on-demand:
```bash
npm run test:e2e
```

Run with verbose output:
```bash
npm run test:e2e -- --reporter=verbose
```

## Next Phase Readiness

Phase 08 (Metadata DOM Audit) is now complete:
- 08-01: Selector documentation (SELECTORS.md + inline comments)
- 08-02: E2E test infrastructure (this plan)

Ready for Phase 9 (Raw Manifest Enhancement) when planned.
