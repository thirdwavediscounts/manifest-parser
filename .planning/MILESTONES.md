# Project Milestones: Manifest Parser Extension

## v1.1 Metadata Fix + Verification (Shipped: 2026-01-29)

**Delivered:** Fixed metadata extraction (bid_price + shipping_fee) for all 11 retailers and AMZD CSV parsing issues, verified with Playwright E2E tests against live auction pages.

**Phases completed:** 10-13 (6 plans total)

**Key accomplishments:**
- Playwright E2E test infrastructure for Chrome extension testing with persistent Chromium context
- Fixed B-Stock Classic shipping extraction using .auction-data-label sibling traversal (ACE, BY, JCP, QVC)
- Config-driven __NEXT_DATA__ JSON extraction for 5 B-Stock Next.js retailers (AMZ, ATT, COSTCO, RC, TGT)
- Quote-aware raw CSV line splitting preserving embedded newlines in AMZD manifests
- __parsed_extra handling and no-drop row policy for misaligned AMZD columns
- 13 Amazon shipping fee selectors with reverse regex and body text fallbacks

**Stats:**
- 41 files created/modified
- 13,145 lines of TypeScript
- 4 phases, 6 plans
- 1 day (v1.0 to v1.1)

**Git range:** `feat(10-01)` → `docs(13)`

**What's next:** TBD

---

## v1.0 MVP (Shipped: 2026-01-28)

**Delivered:** Chrome extension that downloads and processes liquidation auction manifests from 11 retailers into a unified CSV format with auction metadata.

**Phases completed:** 1-9 (17 plans total)

**Key accomplishments:**
- Unified CSV format with field mappings for 11 retailers
- AMZD right-anchor parsing for misaligned columns
- Data processing pipeline (dedup, sort, clean)
- Auction metadata extraction (bid_price, shipping_fee) from DOM
- Smart file naming with abbreviation within ~50 char limit
- Raw manifest metadata appending

**Stats:**
- 4 phases, 17 plans
- 2 days from start to ship

**Git range:** `feat(01-01)` → `docs(09)`

**What's next:** v1.1 Metadata Fix + Verification

---
