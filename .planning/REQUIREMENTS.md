# Requirements: Manifest Parser Extension

**Defined:** 2026-01-27
**Core Value:** Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format

## v1 Requirements

Requirements for unified manifest format feature. Each maps to roadmap phases.

### Unified Output Format

- [x] **OUT-01**: Output manifests in unified CSV format with headers: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
- [x] **OUT-02**: auction_url, bid_price, shipping_fee appear only on first row of each manifest
- [x] **OUT-03**: User can toggle between raw file download OR unified format in popup UI
- [x] **OUT-04**: Each manifest stays as separate CSV file (not combined into one)

### Per-Retailer Field Mapping

- [x] **MAP-01**: ACE mapping — item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-02**: AMZ mapping — item_number=ASIN, product_name=Item Description, unit_retail=Unit Retail
- [ ] **MAP-03**: AMZD mapping — item_number=ASIN, product_name=Item Title, unit_retail=Lot item price x 4.5
- [x] **MAP-04**: ATT mapping — item_number=UPC (blank if "not available"), product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-05**: COSTCO mapping — item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-06**: BY mapping — item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-07**: JCP mapping — item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-08**: QVC mapping — item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-09**: RC mapping — item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-10**: TGT mapping — item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [x] **MAP-11**: TL mapping — item_number=UPC, product_name=Product Name, unit_retail=Orig. Retail

### Auction Metadata Extraction

- [x] **META-01**: Extract bid_price from auction listing page during tab processing
- [x] **META-02**: Extract shipping_fee from auction listing page during tab processing
- [x] **META-03**: Capture auction_url (the URL being processed) for each manifest

### Data Processing

- [ ] **PROC-01**: Trim whitespace from all field values
- [ ] **PROC-02**: Remove/clean special characters from field values
- [ ] **PROC-03**: Deduplicate rows with same identifier — combine quantities
- [ ] **PROC-04**: When deduplicating, use product_name and unit_retail from row with highest quantity
- [ ] **PROC-05**: Sort output by highest unit_retail first, then alphabetical by product_name

### AMZD Special Handling

- [ ] **AMZD-01**: Implement right-anchor parsing for misaligned columns
- [ ] **AMZD-02**: Locate Lot item price at column -2 from right
- [ ] **AMZD-03**: Locate Qty at column -3 from right
- [ ] **AMZD-04**: Locate Seller Name at column -4 from right (ignore value)
- [ ] **AMZD-05**: Find ASIN by scanning row for B0XXXXXXXXX pattern
- [ ] **AMZD-06**: Merge split Item Title columns (everything between ASIN and Seller Name)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Output Options

- **OUT-V2-01**: Option to combine all manifests into single CSV
- **OUT-V2-02**: Custom column ordering in output
- **OUT-V2-03**: Export to Excel format (not just CSV)

### Additional Retailers

- **RET-V2-01**: Support for additional B-Stock sub-retailers as discovered

## Out of Scope

| Feature | Reason |
|---------|--------|
| Combined single CSV from all manifests | User preference — separate files per auction |
| Mobile app | Chrome extension only for now |
| Non-auction retailers | Focus on liquidation auctions |
| Real-time price tracking | Single snapshot at processing time |
| Historical data storage | User manages their own files |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OUT-01 | Phase 1 | Complete |
| OUT-02 | Phase 1 | Complete |
| OUT-03 | Phase 6 | Complete |
| OUT-04 | Phase 1 | Complete |
| MAP-01 | Phase 2 | Complete |
| MAP-02 | Phase 2 | Complete |
| MAP-03 | Phase 3 | Pending |
| MAP-04 | Phase 2 | Complete |
| MAP-05 | Phase 2 | Complete |
| MAP-06 | Phase 2 | Complete |
| MAP-07 | Phase 2 | Complete |
| MAP-08 | Phase 2 | Complete |
| MAP-09 | Phase 2 | Complete |
| MAP-10 | Phase 2 | Complete |
| MAP-11 | Phase 2 | Complete |
| META-01 | Phase 5 | Complete |
| META-02 | Phase 5 | Complete |
| META-03 | Phase 5 | Complete |
| PROC-01 | Phase 4 | Pending |
| PROC-02 | Phase 4 | Pending |
| PROC-03 | Phase 4 | Pending |
| PROC-04 | Phase 4 | Pending |
| PROC-05 | Phase 4 | Pending |
| AMZD-01 | Phase 3 | Pending |
| AMZD-02 | Phase 3 | Pending |
| AMZD-03 | Phase 3 | Pending |
| AMZD-04 | Phase 3 | Pending |
| AMZD-05 | Phase 3 | Pending |
| AMZD-06 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after roadmap creation*
