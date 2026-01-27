---
phase: 05
plan: 01
title: "Bid Price and Shipping Fee Extraction"
subsystem: retailers
tags: [metadata, extraction, auction, pricing]

dependency-graph:
  requires: [01-01, 01-02]
  provides: [bidPrice-extraction, shippingFee-extraction]
  affects: [05-02, popup-display]

tech-stack:
  added: []
  patterns: [parsePrice-helper, DOM-fallback-extraction, __NEXT_DATA__-parsing]

file-tracking:
  key-files:
    created: []
    modified:
      - src/retailers/types.ts
      - src/retailers/sites/bstock.ts
      - src/retailers/sites/bstock-auction.ts
      - src/retailers/sites/techliquidators.ts
      - src/retailers/sites/amazon.ts

decisions:
  - id: D05-01-01
    decision: "bidPrice and shippingFee use number | null type"
    rationale: "Distinguish 'not found' (null) from valid price (0)"
  - id: D05-01-02
    decision: "All helper functions defined inside extractMetadata()"
    rationale: "ISOLATED world serialization requires no outer scope references"
  - id: D05-01-03
    decision: "AMZD bidPrice always null"
    rationale: "Amazon Direct is fixed-price, not auction"
  - id: D05-01-04
    decision: "Free shipping returns 0, not found returns null"
    rationale: "Semantic distinction between free and unknown"

metrics:
  duration: "3 minutes"
  tasks: 2
  commits: 2
  lines-added: ~1250
  lines-removed: ~130
  completed: 2026-01-27
---

# Phase 05 Plan 01: Bid Price and Shipping Fee Extraction Summary

Extended MetadataResult interface and implemented bidPrice/shippingFee extraction across all 4 retailer modules.

## One-liner

Auction metadata extraction: bidPrice and shippingFee fields added to MetadataResult with __NEXT_DATA__ and DOM fallback parsing.

## Changes Made

### Task 1: Extend MetadataResult Interface

**File:** `src/retailers/types.ts`

Added two new fields to MetadataResult:
- `bidPrice: number | null` - Current bid amount (null if not found or not applicable)
- `shippingFee: number | null` - Shipping cost (null if TBD or not found)

Using `null` allows distinguishing "not found" from "0" (valid free shipping or zero price).

### Task 2: Implement Extraction in All Retailer Modules

**Common parsePrice helper** (defined inside each extractMetadata):
```typescript
function parsePrice(text: string | null): number | null {
  if (!text) return null
  const cleaned = text.replace(/[$,\s]/g, '').trim()
  if (!/^\d/.test(cleaned)) return null  // Handles TBD, N/A, etc.
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}
```

**bstock.ts (B-Stock Marketplace):**
- Primary: __NEXT_DATA__ extraction for `currentBid`, `winningBid`, `highBid`, `shippingCost`, `freightCost`
- Fallback: DOM selectors `[data-testid*="bid"]`, `[class*="shipping"]`, etc.
- All specialized handlers (Costco, Amazon, Target, ATT, RC) now include bidPrice/shippingFee in returns

**bstock-auction.ts (B-Stock Auction Pages):**
- DOM-based extraction with label pattern matching
- Patterns: "Current Bid: $X,XXX", "Shipping: $XXX", "Free Shipping"
- No __NEXT_DATA__ available on these older pages

**techliquidators.ts:**
- DOM-based extraction similar to bstock-auction
- Searches for bid/shipping labels in page text
- Uses bodyText pattern matching

**amazon.ts (Amazon Direct):**
- bidPrice always returns null (AMZD is fixed-price, not auction)
- shippingFee extracted from delivery/shipping section
- Detects "FREE Shipping" and returns 0

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D05-01-01 | bidPrice/shippingFee use `number \| null` | Distinguish not-found from valid 0 price |
| D05-01-02 | Helpers inside extractMetadata() | ISOLATED world requires no outer scope |
| D05-01-03 | AMZD bidPrice = null | Fixed-price, not auction |
| D05-01-04 | Free shipping = 0, not found = null | Semantic distinction |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASS
- bidPrice in all 4 retailer files: PASS
- shippingFee in all 4 retailer files: PASS
- MetadataResult interface includes both fields: PASS

## Commits

| Hash | Message |
|------|---------|
| da24643 | feat(05-01): extend MetadataResult with bidPrice and shippingFee |
| 83cd732 | feat(05-01): implement bid price and shipping fee extraction |

## Next Phase Readiness

**Phase 05-02** can proceed:
- MetadataResult interface extended
- All retailer modules return bidPrice/shippingFee
- Price parsing handles currency, commas, TBD values
- Null semantics allow popup to convert to 0 when needed for display

**No blockers identified.**
