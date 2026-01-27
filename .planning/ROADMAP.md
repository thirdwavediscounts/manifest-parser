# Roadmap: Manifest Parser Extension

## Overview

Transform the existing Chrome extension from raw manifest downloads to producing clean, unified CSV output. The journey starts with establishing the unified format structure, then implements retailer-specific field mappings (with special handling for complex AMZD parsing), adds data processing (deduplication, sorting, cleaning), extracts auction metadata from pages, and concludes with UI integration for format selection.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Unified Format Foundation** - Establish unified CSV structure and transformation pipeline
- [x] **Phase 2: Standard Retailer Mappings** - Map 10 retailers with consistent column patterns
- [ ] **Phase 3: AMZD Special Handling** - Complex parsing for misaligned Amazon Direct manifests
- [ ] **Phase 4: Data Processing Pipeline** - Clean, deduplicate, and sort data
- [ ] **Phase 5: Auction Metadata Extraction** - Extract bid price and shipping from pages
- [ ] **Phase 6: UI Integration** - User toggle between raw and unified format

## Phase Details

### Phase 1: Unified Format Foundation
**Goal**: Establish the unified CSV output structure that all retailer data transforms into
**Depends on**: Nothing (first phase)
**Requirements**: OUT-01, OUT-02, OUT-04
**Success Criteria** (what must be TRUE):
  1. Processing a manifest produces CSV with headers: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
  2. auction_url, bid_price, shipping_fee columns are populated only on the first row (empty on subsequent rows)
  3. Each manifest file produces a separate CSV (not combined)
  4. Existing raw file download continues to work (no breaking changes)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — TDD: Core unified format types and transformation
- [x] 01-02-PLAN.md — Integrate unified format into download pipeline

### Phase 2: Standard Retailer Mappings
**Goal**: Map 10 retailers with standard column patterns to unified format
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-04, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09, MAP-10, MAP-11
**Success Criteria** (what must be TRUE):
  1. ACE manifest UPC becomes item_number, Item Description becomes product_name
  2. AMZ manifest ASIN becomes item_number, Unit Retail becomes unit_retail
  3. TL manifest UPC becomes item_number, Product Name becomes product_name, Orig. Retail becomes unit_retail
  4. All 10 retailers (ACE, AMZ, ATT, COSTCO, BY, JCP, QVC, RC, TGT, TL) produce unified output when processed
  5. ATT manifests with "not available" UPC result in blank item_number
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - TDD: Retailer field mapping configuration with null-value handling
- [x] 02-02-PLAN.md - Integrate retailer mappings with parsing pipeline

### Phase 3: AMZD Special Handling
**Goal**: Parse Amazon Direct manifests with misaligned columns correctly
**Depends on**: Phase 1
**Requirements**: MAP-03, AMZD-01, AMZD-02, AMZD-03, AMZD-04, AMZD-05, AMZD-06
**Success Criteria** (what must be TRUE):
  1. AMZD manifest prices extracted correctly from -2 column position (right-anchored)
  2. AMZD manifest quantities extracted correctly from -3 column position
  3. ASIN found by B0XXXXXXXXX pattern scan regardless of column position
  4. Split Item Title columns merged back into single product_name
  5. unit_retail calculated as Lot item price * 4.5
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — TDD: AMZD parser core functions (ASIN detection, right-anchor extraction, price calculation)
- [ ] 03-02-PLAN.md — Integrate AMZD parser into pipeline with integration tests

### Phase 4: Data Processing Pipeline
**Goal**: Clean, deduplicate, and sort manifest data for consistent output
**Depends on**: Phase 2, Phase 3
**Requirements**: PROC-01, PROC-02, PROC-03, PROC-04, PROC-05
**Success Criteria** (what must be TRUE):
  1. All field values have leading/trailing whitespace trimmed
  2. Special characters removed or cleaned from field values
  3. Rows with identical identifiers combined (quantities summed)
  4. When deduplicating, product_name and unit_retail come from row with highest quantity
  5. Output sorted by unit_retail descending, then product_name alphabetically
**Plans**: TBD

Plans:
- [ ] 04-01: Implement data cleaning functions
- [ ] 04-02: Implement deduplication and sorting logic

### Phase 5: Auction Metadata Extraction
**Goal**: Extract bid price and shipping fee from auction listing pages
**Depends on**: Phase 1
**Requirements**: META-01, META-02, META-03
**Success Criteria** (what must be TRUE):
  1. bid_price extracted from auction listing page during tab processing
  2. shipping_fee extracted from auction listing page during tab processing
  3. auction_url captured and included in unified output first row
  4. Metadata extraction works for B-Stock, TechLiquidators, and Amazon Direct pages
**Plans**: TBD

Plans:
- [ ] 05-01: Implement metadata extraction for each retailer type
- [ ] 05-02: Integrate metadata into unified output generation

### Phase 6: UI Integration
**Goal**: User can choose between raw files and unified format at download time
**Depends on**: Phase 4, Phase 5
**Requirements**: OUT-03
**Success Criteria** (what must be TRUE):
  1. Popup UI shows toggle/option for "Raw files" vs "Unified format"
  2. When "Raw files" selected, original CSV/XLSX downloaded as before
  3. When "Unified format" selected, processed CSV with unified columns downloaded
  4. User preference persisted across popup sessions
**Plans**: TBD

Plans:
- [ ] 06-01: Add format toggle to popup UI and wire up processing path

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Unified Format Foundation | 2/2 | Complete | 2026-01-27 |
| 2. Standard Retailer Mappings | 2/2 | Complete | 2026-01-27 |
| 3. AMZD Special Handling | 0/2 | Not started | - |
| 4. Data Processing Pipeline | 0/2 | Not started | - |
| 5. Auction Metadata Extraction | 0/2 | Not started | - |
| 6. UI Integration | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-27*
*Total requirements: 29 | Total phases: 6 | Total plans: 11 (estimated)*
