# Manifest Parser Extension

## What This Is

A Chrome extension that downloads and processes liquidation auction manifests from multiple retailers (B-Stock, TechLiquidators, Amazon Direct, etc.). Users can load URLs from Google Sheets, process auction pages to extract manifests, and download them as organized ZIP files. The extension handles the complexity of different retailer formats and provides a unified workflow for liquidation buyers.

## Core Value

**Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format** — enabling quick analysis of auction inventory without manual data cleanup.

## Requirements

### Validated

<!-- Shipped and confirmed valuable -->

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
- ✓ Metadata extraction for all 11 retailers (bid_price + shipping_fee) — v1.1
- ✓ AMZD raw CSV preserves all rows (no truncation from embedded newlines) — v1.1
- ✓ AMZD columns don't bleed together (__parsed_extra handling) — v1.1
- ✓ Raw mode pass-through with line-level metadata append — v1.1
- ✓ Playwright E2E test infrastructure for Chrome extension — v1.1
- ✓ E2E verification of metadata extraction per retailer — v1.1

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- Combined single CSV from all manifests — user wants separate files, same format
- Mobile app — Chrome extension only
- Non-auction retailers — focus on liquidation auctions
- Real-time price tracking — single snapshot at processing time

## Context

**Existing Codebase:**
- TypeScript Chrome extension (Manifest V3)
- 13,145 lines of TypeScript across src/ and tests/
- Plugin-based retailer system with registry pattern
- Per-retailer extractors handle DOM scraping for metadata
- CSV/XLSX parsing via papaparse and xlsx libraries
- Playwright E2E test suite for live auction page verification
- v1.0 shipped (9 phases, 17 plans), v1.1 shipped (4 phases, 6 plans)

**Retailer Codes:**
ACE, AMZ, AMZD, ATT, COSTCO (B or P), BY, JCP, QVC, RC, TGT, TL

**Current Metadata Status:**
| Retailer | bid_price | shipping_fee |
|----------|-----------|--------------|
| TL | ✓ Working | ✓ Working |
| ACE | ✓ Working | ✓ Fixed (deferred behind auth) |
| QVC | ✓ Working | ✓ Fixed (deferred behind auth) |
| TGT | ✓ Fixed (__NEXT_DATA__) | ✓ Fixed (auth-required) |
| RC | ✓ Fixed (__NEXT_DATA__) | ✓ Fixed (__NEXT_DATA__) |
| COSTCO | ✓ Fixed (__NEXT_DATA__) | ✓ Fixed (__NEXT_DATA__) |
| JCP | ✓ Working | ✓ Fixed (deferred behind auth) |
| BY | ✓ Working | ✓ Fixed (deferred behind auth) |
| AMZ | ✓ Fixed (__NEXT_DATA__) | ✓ Fixed (__NEXT_DATA__) |
| AMZD | ✓ null (fixed-price) | ✓ Fixed (13 selectors) |
| ATT | ✓ Fixed (__NEXT_DATA__) | ✓ Fixed (__NEXT_DATA__) |

## Constraints

- **Tech stack**: TypeScript, Chrome Extension Manifest V3, existing architecture
- **Compatibility**: Must work with existing URL processing flow and ZIP export
- **No breaking changes**: Raw file download and unified format must continue working
- **Testing**: Playwright E2E tests with live auction URLs; URLs expire so tests skip gracefully

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate CSVs per manifest, not combined | User preference — easier to track per-auction | ✓ Good |
| Right-anchor parsing for AMZD | Most reliable approach for misaligned columns | ✓ Good (fixed with __parsed_extra spread) |
| Multiply AMZD lot item price by 4.5 | Domain knowledge — accurate unit retail calculation | ✓ Good |
| Auction metadata only on first row | Reduces redundancy, cleaner output | ✓ Good |
| E2E verify with live URLs | Real DOM structures change; need current selectors | ✓ Good (tests skip on expired URLs) |
| .pw.test.ts suffix for Playwright | Coexists with vitest without conflicts | ✓ Good |
| page.evaluate() for metadata testing | Direct DOM access, mirrors production extraction | ✓ Good |
| Classic shipping deferred behind login | .auction-data-label sibling works when authenticated | ✓ Good (returns null unauthenticated) |
| AMZD bid_price returns null | Fixed-price, not auction — null distinguishes from $0 | ✓ Good |
| Line-level raw CSV append | Preserves embedded newlines without re-parsing | ✓ Good |
| Config-driven __NEXT_DATA__ paths | Per-retailer JSON paths, not hardcoded single path | ✓ Good |
| Inline config mirror (ISOLATED world) | Extension extractMetadata() can't import modules | ✓ Good (documented) |

---
*Last updated: 2026-01-29 after v1.1 milestone completion*
