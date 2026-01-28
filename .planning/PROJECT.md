# Manifest Parser Extension

## What This Is

A Chrome extension that downloads and processes liquidation auction manifests from multiple retailers (B-Stock, TechLiquidators, Amazon Direct, etc.). Users can load URLs from Google Sheets, process auction pages to extract manifests, and download them as organized ZIP files. The extension handles the complexity of different retailer formats and provides a unified workflow for liquidation buyers.

## Core Value

**Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format** — enabling quick analysis of auction inventory without manual data cleanup.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — v1 milestone -->

- ✓ Load auction URLs from Google Sheets — v1
- ✓ Process multiple URLs in batch — v1
- ✓ Extract manifests from B-Stock auction pages — v1
- ✓ Extract manifests from TechLiquidators pages — v1
- ✓ Extract manifests from Amazon Direct pages — v1
- ✓ Download raw manifest files (CSV/XLSX) — v1
- ✓ Create ZIP archives with multiple manifests — v1
- ✓ Upload local manifest files for processing — v1
- ✓ Proxy configuration for TechLiquidators — v1
- ✓ Persist popup state across close/open — v1
- ✓ Unified CSV format with field mappings for 11 retailers — v1
- ✓ Data processing pipeline (dedup, sort, clean) — v1
- ✓ UI toggle between raw and unified format — v1
- ✓ Smart file naming with abbreviation — v1
- ✓ Raw manifest metadata appending — v1
- ✓ TL metadata extraction (bid_price + shipping_fee) — v1

### Active

<!-- v1.1 — Fix metadata extraction and AMZD parsing, E2E verify all retailers -->

**Bug Fixes:**
- [ ] AMZD raw CSV download truncated (1000+ rows → ~600) — rows lost during download/extraction
- [ ] AMZD raw CSV has columns bleeding together — data from multiple fields merged into single cells
- [ ] Metadata values showing 0 for most retailers when they should have real values

**Metadata Extraction Fixes (bid_price + shipping_fee per retailer):**
- [ ] TGT — bid_price and shipping_fee both broken (returning 0)
- [ ] RC — bid_price and shipping_fee both broken (returning 0)
- [ ] QVC — shipping_fee broken (bid_price works)
- [ ] COSTCO (B/P) — bid_price and shipping_fee both broken (returning 0)
- [ ] JCP — bid_price and shipping_fee both broken (returning 0)
- [ ] BY — bid_price and shipping_fee both broken (returning 0)
- [ ] AMZ — bid_price and shipping_fee both broken (returning 0)
- [ ] ACE — shipping_fee broken (bid_price works)
- [ ] AMZD — bid_price and shipping_fee both broken (returning 0)

**E2E Verification:**
- [ ] Each retailer verified against live auction pages with correct DOM selectors
- [ ] Metadata extraction confirmed producing correct values per retailer
- [ ] Raw download verified to preserve all manifest rows

### Out of Scope

- Combined single CSV from all manifests — user wants separate files, same format
- Mobile app — Chrome extension only
- Non-auction retailers — focus on liquidation auctions
- Real-time price tracking — single snapshot at processing time
- Unified format fixes — focus on raw mode and metadata in this milestone

## Context

**Existing Codebase:**
- TypeScript Chrome extension (Manifest V3)
- Plugin-based retailer system with registry pattern
- Per-retailer extractors handle DOM scraping for metadata
- CSV/XLSX parsing via papaparse and xlsx libraries
- v1 milestone complete (9 phases, 17 plans)

**Retailer Codes:**
ACE, AMZ, AMZD, ATT, COSTCO (B or P), BY, JCP, QVC, RC, TGT, TL

**Current Metadata Status:**
| Retailer | bid_price | shipping_fee |
|----------|-----------|--------------|
| TL | ✓ Working | ✓ Working |
| ACE | ✓ Working | ✗ Returns 0 |
| QVC | ✓ Working | ✗ Returns 0 |
| TGT | ✗ Returns 0 | ✗ Returns 0 |
| RC | ✗ Returns 0 | ✗ Returns 0 |
| COSTCO | ✗ Returns 0 | ✗ Returns 0 |
| JCP | ✗ Returns 0 | ✗ Returns 0 |
| BY | ✗ Returns 0 | ✗ Returns 0 |
| AMZ | ✗ Returns 0 | ✗ Returns 0 |
| AMZD | ✗ Returns 0 | ✗ Returns 0 |

**Known AMZD Issues:**
- Raw CSV download truncated — only ~600 of 1000+ rows
- Column data bleeding together in downloaded CSV (visible in screenshot: merged price/qty fields)

## Constraints

- **Tech stack**: TypeScript, Chrome Extension Manifest V3, existing architecture
- **Compatibility**: Must work with existing URL processing flow and ZIP export
- **No breaking changes**: Raw file download and unified format must continue working
- **Testing**: Live auction URLs available for E2E verification

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate CSVs per manifest, not combined | User preference — easier to track per-auction | ✓ Good |
| Right-anchor parsing for AMZD | Most reliable approach for misaligned columns | ⚠️ Revisit — rows still broken |
| Multiply AMZD lot item price by 4.5 | Domain knowledge — accurate unit retail calculation | — Pending |
| Auction metadata only on first row | Reduces redundancy, cleaner output | ✓ Good |
| E2E verify with live URLs | Real DOM structures change; need current selectors | — Pending |

---
*Last updated: 2026-01-29 after v1.1 milestone initialization*
