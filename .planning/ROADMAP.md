# Roadmap: Manifest Parser Extension

## Milestones

- v1.0 MVP - Phases 1-9 (shipped 2026-01-28)
- v1.1 Metadata Fix + Verification - Phases 10-13 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-9) - SHIPPED 2026-01-28</summary>

### Phase 1: Unified Format Foundation
**Goal**: Establish the unified CSV output structure that all retailer data transforms into
**Requirements**: OUT-01, OUT-02, OUT-04
**Plans**: 2/2 complete

Plans:
- [x] 01-01-PLAN.md — TDD: Core unified format types and transformation
- [x] 01-02-PLAN.md — Integrate unified format into download pipeline

### Phase 2: Standard Retailer Mappings
**Goal**: Map 10 retailers with standard column patterns to unified format
**Requirements**: MAP-01, MAP-02, MAP-04, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09, MAP-10, MAP-11
**Plans**: 2/2 complete

Plans:
- [x] 02-01-PLAN.md - TDD: Retailer field mapping configuration with null-value handling
- [x] 02-02-PLAN.md - Integrate retailer mappings with parsing pipeline

### Phase 3: AMZD Special Handling
**Goal**: Parse Amazon Direct manifests with misaligned columns correctly
**Requirements**: MAP-03, AMZD-01, AMZD-02, AMZD-03, AMZD-05, AMZD-06
**Plans**: 2/2 complete

Plans:
- [x] 03-01-PLAN.md — TDD: AMZD parser core functions
- [x] 03-02-PLAN.md — Integrate AMZD parser into pipeline

### Phase 4: Data Processing Pipeline
**Goal**: Clean, deduplicate, and sort manifest data for consistent output
**Requirements**: PROC-01, PROC-02, PROC-03, PROC-04, PROC-05
**Plans**: 2/2 complete

Plans:
- [x] 04-01-PLAN.md — TDD: Data cleaning and deduplication functions
- [x] 04-02-PLAN.md — TDD: Sorting and pipeline integration

### Phase 5: Auction Metadata Extraction
**Goal**: Extract bid price and shipping fee from auction listing pages
**Requirements**: META-01, META-02, META-03
**Plans**: 2/2 complete

Plans:
- [x] 05-01-PLAN.md — Extend MetadataResult and implement extraction in retailer modules
- [x] 05-02-PLAN.md — Integrate extracted metadata into popup and CSV output

### Phase 6: UI Integration
**Goal**: User can choose between raw files and unified format at download time
**Requirements**: OUT-03
**Plans**: 1/1 complete

Plans:
- [x] 06-01-PLAN.md — Add format toggle to popup UI and wire processing path

### Phase 7: File Naming Optimization
**Goal**: Smart title truncation that maximizes readability within ~50 character limit
**Requirements**: NAME-01, NAME-02, NAME-03, NAME-04
**Plans**: 2/2 complete

Plans:
- [x] 07-01-PLAN.md — TDD: Filename utility functions
- [x] 07-02-PLAN.md — Integrate with popup.ts generateListingFilename

### Phase 8: Metadata DOM Audit
**Goal**: Document and validate bid price and shipping fee DOM selectors for each retailer
**Requirements**: META-04, META-05
**Plans**: 2/2 complete

Plans:
- [x] 08-01-PLAN.md — Create SELECTORS.md documentation
- [x] 08-02-PLAN.md — Create E2E test infrastructure for selector validation

### Phase 9: Raw Manifest Enhancement
**Goal**: Append auction metadata columns to raw manifest downloads
**Requirements**: RAW-01, RAW-02, RAW-03
**Plans**: 2/2 complete

Plans:
- [x] 09-01-PLAN.md — TDD: appendMetadataToManifest function
- [x] 09-02-PLAN.md — Integrate metadata appending into raw download pipeline

</details>

### v1.1 Metadata Fix + Verification (In Progress)

**Milestone Goal:** Fix metadata extraction returning 0 for 9 of 11 retailers, fix AMZD CSV parsing issues, and E2E verify each retailer group against live auction pages as fixes are applied.

#### Phase 10: Playwright E2E Infrastructure
**Goal**: Set up Playwright test infrastructure for Chrome extension E2E testing — used by all subsequent phases
**Depends on**: Nothing (first phase)
**Requirements**: E2E-01
**Success Criteria** (what must be TRUE):
  1. Playwright launches Chromium with extension loaded via persistent context
  2. Test can navigate to a live auction URL and access the extension popup
  3. Test can verify metadata extraction results from the extension
  4. TL (already working) passes as smoke test to validate infrastructure
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Install Playwright, create extension helpers, TL smoke test

#### Phase 11: B-Stock Classic Selector Fix + E2E
**Goal**: ACE, BY, JCP, and QVC return correct bid_price and shipping_fee — verified E2E against live pages
**Depends on**: Phase 10
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04, SEL-05, SEL-06, SEL-07, SEL-08, E2E-02 (partial), E2E-03 (partial)
**Success Criteria** (what must be TRUE):
  1. ACE auction page extraction returns a real dollar amount for bid_price (not 0)
  2. ACE auction page extraction returns a real dollar amount for shipping_fee (not 0)
  3. BY, JCP auction pages each return correct bid_price and shipping_fee values
  4. QVC bid_price continues working; QVC shipping_fee now returns correct value (not 0)
  5. Playwright E2E tests pass for all 4 Classic retailers (bid_price + shipping_fee each)
**Plans**: 1/1 complete

Plans:
- [x] 11-01: Fix B-Stock Classic selectors and E2E verify against live pages

#### Phase 12: B-Stock Next.js JSON Fix + E2E
**Goal**: AMZ, ATT, COSTCO, RC, and TGT return correct bid_price and shipping_fee via `__NEXT_DATA__` — verified E2E
**Depends on**: Phase 10
**Requirements**: SEL-09, SEL-10, SEL-11, SEL-12, SEL-13, SEL-14, SEL-15, SEL-16, SEL-17, SEL-18, E2E-02 (partial), E2E-03 (partial)
**Success Criteria** (what must be TRUE):
  1. AMZ auction page extraction returns correct bid_price and shipping_fee from `__NEXT_DATA__`
  2. TGT auction page extraction returns correct bid_price and shipping_fee from `__NEXT_DATA__`
  3. COSTCO, RC, ATT auction pages each return correct bid_price and shipping_fee
  4. Per-retailer JSON path mapping exists (not hardcoded single path for all)
  5. Playwright E2E tests pass for all 5 Next.js retailers (bid_price + shipping_fee each)
**Plans**: 2 plans

Plans:
- [ ] 12-01: Inspect live Next.js pages and map JSON paths per retailer
- [ ] 12-02: Implement verified JSON extraction + E2E tests for all 5 Next.js retailers

#### Phase 13: AMZD CSV + Metadata Fix + E2E
**Goal**: Amazon Direct raw CSV downloads preserve all rows with correct columns, metadata works — verified E2E
**Depends on**: Phase 10
**Requirements**: CSV-01, CSV-02, CSV-03, SEL-19, SEL-20, E2E-02 (partial), E2E-03 (partial), E2E-04
**Success Criteria** (what must be TRUE):
  1. AMZD raw CSV download contains all rows from source manifest (no truncation from embedded newlines)
  2. AMZD columns do not bleed together (right-anchor extraction handles `__parsed_extra` data)
  3. Raw mode passes through manifest data without cleaning/sorting, only appending 3 metadata columns
  4. AMZD shipping_fee extraction returns correct value from Amazon product page
  5. Playwright E2E tests pass for AMZD (metadata + row count verification)
**Plans**: 2 plans

Plans:
- [ ] 13-01: Fix AMZD CSV parsing (row truncation + column bleeding)
- [ ] 13-02: Fix AMZD metadata extraction + E2E verify

## Progress

**Execution Order:**
Phase 10 first (infrastructure). Then Phases 11, 12, 13 can execute in parallel.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Unified Format Foundation | v1.0 | 2/2 | Complete | 2026-01-27 |
| 2. Standard Retailer Mappings | v1.0 | 2/2 | Complete | 2026-01-27 |
| 3. AMZD Special Handling | v1.0 | 2/2 | Complete | 2026-01-27 |
| 4. Data Processing Pipeline | v1.0 | 2/2 | Complete | 2026-01-27 |
| 5. Auction Metadata Extraction | v1.0 | 2/2 | Complete | 2026-01-27 |
| 6. UI Integration | v1.0 | 1/1 | Complete | 2026-01-27 |
| 7. File Naming Optimization | v1.0 | 2/2 | Complete | 2026-01-28 |
| 8. Metadata DOM Audit | v1.0 | 2/2 | Complete | 2026-01-28 |
| 9. Raw Manifest Enhancement | v1.0 | 2/2 | Complete | 2026-01-28 |
| 10. Playwright E2E Infrastructure | v1.1 | 1/1 | Complete | 2026-01-29 |
| 11. B-Stock Classic Fix + E2E | v1.1 | 1/1 | Complete | 2026-01-29 |
| 12. B-Stock Next.js Fix + E2E | v1.1 | 0/2 | Not started | - |
| 13. AMZD CSV + Metadata Fix + E2E | v1.1 | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-27*
*Updated: 2026-01-29 — Added v1.1 milestone (phases 10-13, 6 plans, E2E integrated per phase)*
*Total requirements: 65+ | Total phases: 13 | Total plans: 23*
