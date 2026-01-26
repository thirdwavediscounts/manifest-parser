# Manifest Parser Extension

## What This Is

A Chrome extension that downloads and processes liquidation auction manifests from multiple retailers (B-Stock, TechLiquidators, Amazon Direct, etc.). Users can load URLs from Google Sheets, process auction pages to extract manifests, and download them as organized ZIP files. The extension handles the complexity of different retailer formats and provides a unified workflow for liquidation buyers.

## Core Value

**Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format** — enabling quick analysis of auction inventory without manual data cleanup.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing functionality -->

- ✓ Load auction URLs from Google Sheets — existing
- ✓ Process multiple URLs in batch — existing
- ✓ Extract manifests from B-Stock auction pages — existing
- ✓ Extract manifests from TechLiquidators pages — existing
- ✓ Extract manifests from Amazon Direct pages — existing
- ✓ Download raw manifest files (CSV/XLSX) — existing
- ✓ Create ZIP archives with multiple manifests — existing
- ✓ Upload local manifest files for processing — existing
- ✓ Proxy configuration for TechLiquidators — existing
- ✓ Persist popup state across close/open — existing

### Active

<!-- Current scope. Building toward these. -->

**Unified CSV Format:**
- [ ] Output manifests in unified format: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
- [ ] auction_url, bid_price, shipping_fee appear only on first row of each manifest
- [ ] User can choose between raw files OR unified format at download time

**Per-Retailer Field Mapping:**
- [ ] ACE: item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [ ] AMZ: item_number=ASIN, product_name=Item Description, unit_retail=Unit Retail
- [ ] AMZD: item_number=ASIN, product_name=Item Title, unit_retail=Lot item price × 4.5
- [ ] ATT: item_number=UPC (blank if "not available"), product_name=Item Description, unit_retail=Unit Retail
- [ ] COSTCO: item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [ ] BY: item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [ ] JCP: item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [ ] QVC: item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [ ] RC: item_number=Item #, product_name=Item Description, unit_retail=Unit Retail
- [ ] TGT: item_number=UPC, product_name=Item Description, unit_retail=Unit Retail
- [ ] TL: item_number=UPC, product_name=Product Name, unit_retail=Orig. Retail

**Auction Metadata Extraction:**
- [ ] Extract bid_price from auction listing page
- [ ] Extract shipping_fee from auction listing page
- [ ] auction_url is the URL being processed

**Data Processing:**
- [ ] Trim whitespace from all fields
- [ ] Remove/clean special characters
- [ ] Deduplicate: same identifier → combine quantities, use product_name and unit_retail from row with highest qty
- [ ] Sort: highest unit_retail first, then alphabetical by product_name

**AMZD Special Handling:**
- [ ] Right-anchor parsing for misaligned columns (prices at -2, qty at -3, seller at -4 from right)
- [ ] Find ASIN by B0XXXXXXXXX pattern scan
- [ ] Merge split Item Title columns back together

### Out of Scope

- Combined single CSV from all manifests — user wants separate files, same format
- Mobile app — Chrome extension only
- Non-auction retailers — focus on liquidation auctions
- Real-time price tracking — single snapshot at processing time

## Context

**Existing Codebase:**
- TypeScript Chrome extension (Manifest V3)
- Plugin-based retailer system with registry pattern
- Existing field mapping infrastructure in `src/parsers/base-parser.ts`
- Per-retailer parsers already exist (bstock-parser, techliquidators-parser)
- CSV/XLSX parsing via papaparse and xlsx libraries

**Retailer Codes:**
ACE, AMZ, AMZD, ATT, COSTCO (B or P), BY, JCP, QVC, RC, TGT, TL

**Known Complexity:**
- AMZD manifests have inconsistent column alignment due to product titles containing commas/extra content
- Different retailers use different identifiers (UPC, ASIN, Item #)
- Unit retail field names vary by retailer

## Constraints

- **Tech stack**: TypeScript, Chrome Extension Manifest V3, existing architecture
- **Compatibility**: Must work with existing URL processing flow and ZIP export
- **No breaking changes**: Raw file download must remain available as option

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate CSVs per manifest, not combined | User preference — easier to track per-auction | — Pending |
| Right-anchor parsing for AMZD | Most reliable approach for misaligned columns | — Pending |
| Multiply AMZD lot item price by 4.5 | Domain knowledge — accurate unit retail calculation | — Pending |
| Auction metadata only on first row | Reduces redundancy, cleaner output | — Pending |

---
*Last updated: 2026-01-27 after initialization*
