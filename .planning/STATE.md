# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format
**Current focus:** Phase 8 - Metadata DOM Audit (complete)

## Current Position

Phase: 8 of 9 (Metadata DOM Audit)
Plan: 2 of 2 in phase
Status: Phase complete
Last activity: 2026-01-28 - Completed 08-02-PLAN.md (E2E Selector Tests)

Progress: [###############] 100% (15/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 3.5 minutes
- Total execution time: 51 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Unified Format Foundation | 2/2 | 7 min | 3.5 min |
| 2. Standard Retailer Mappings | 2/2 | 10 min | 5.0 min |
| 3. AMZD Special Handling | 2/2 | 7 min | 3.5 min |
| 4. Data Processing Pipeline | 2/2 | 7 min | 3.5 min |
| 5. Auction Metadata Extraction | 2/2 | 6 min | 3.0 min |
| 6. UI Integration | 1/1 | 4 min | 4.0 min |
| 7. File Naming Optimization | 2/2 | 5 min | 2.5 min |
| 8. Metadata DOM Audit | 2/2 | 9 min | 4.5 min |

**Recent Trend:**
- Last 5 plans: 06-01 (4 min), 07-01 (2 min), 07-02 (3 min), 08-01 (4 min), 08-02 (5 min)
- Trend: Consistent 2-5 minute execution times

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Separate CSVs per manifest (not combined) - user preference
- Right-anchor parsing for AMZD - most reliable approach
- Multiply AMZD lot item price by 4.5 - domain knowledge
- [D01-01-01] Metadata embedded in UnifiedManifestRow as strings for CSV flexibility
- [D01-01-02] formatPrice uses Number(value.toFixed(2)) for minimal decimals
- [D01-01-03] UTF-8 BOM included for Excel/Retool compatibility
- [D01-02-01] Unified output is default; raw file functions preserved for Phase 6 toggle
- [D01-02-02] Parse manifest via PARSE_FILE message to background worker
- [D01-02-03] Local uploads use 'local-upload' as auction_url
- [D02-01-01] NULL_VALUES stored lowercase for consistent comparison
- [D02-01-02] extractField exported for testing but intended as internal helper
- [D02-01-03] Default config provided for unknown retailers
- [D02-02-01] Strip trailing commas in isNullValue for B-Stock CSV format
- [D02-02-02] Expanded DEFAULT_CONFIG with more column variations
- [D02-02-03] Removed defaultFieldMapping in favor of getRetailerFieldConfig
- [D03-01-01] ASIN pattern B0XXXXXXXXX (10 chars, uppercase) for Amazon identification
- [D03-01-02] Right-anchor positions: qty at -3, price at -2 from end
- [D03-01-03] Banker's rounding (toFixed) for 2-decimal price precision
- [D03-02-01] Route 'amzd' site to dedicated parser before standard logic
- [D03-02-02] Use relaxed CSV parsing in tests for AMZD's malformed quotes
- [D04-01-01] Non-printable chars include 0x00-0x1F, 0x7F, zero-width (U+200B-U+200F, U+FEFF)
- [D04-01-02] item_number strips ALL whitespace, other fields only trim
- [D04-01-03] normalizeItemNumber uses lowercase + leading zero strip for comparison only
- [D04-01-04] Dedup preserves longest item_number format (leading zeros)
- [D04-02-01] Zero-value unit_retail sorts to end (treat as lowest priority)
- [D04-02-02] Metadata assigned to first row of sorted output (highest-value item)
- [D04-02-03] processRows pipeline: cleanRow map -> deduplicateRows -> sortRows
- [D05-01-01] bidPrice/shippingFee use number | null type to distinguish not-found from 0
- [D05-01-02] All helper functions defined inside extractMetadata() for ISOLATED world
- [D05-01-03] AMZD bidPrice always null (fixed-price, not auction)
- [D05-01-04] Free shipping returns 0, not found returns null
- [D05-02-01] Use ?? 0 for bidPrice/shippingFee in AuctionMetadata
- [D05-02-02] Direct file URLs and local uploads use 0 for bid/shipping
- [D05-02-03] Status shows "Extracting from [retailer]..." format
- [D06-01-01] Default to Raw mode for backward compatibility
- [D06-01-02] Unified mode throws on parse error (no fallback)
- [D06-01-03] Both modes track totals for results display
- [D07-01-01] Case-insensitive matching for abbreviations with preserved output case
- [D07-01-02] Dash as word separator for filename-safe truncation
- [D07-01-03] Pipeline order: deduplicate -> abbreviate -> convert spaces -> truncate
- [D07-02-01] Apply smartTruncateTitle only to product part, preserving suffix logic
- [D07-02-02] Integration tests simulate full popup flow for verification
- [D08-01-01] Document selectors per retailer with CSS and regex patterns
- [D08-01-02] AMZD section documents bidPrice always null (fixed-price, not auction)
- [D08-01-03] Include maintenance guide in SELECTORS.md
- [D08-02-01] Use jsdom for DOM testing instead of live page testing
- [D08-02-02] Group fixtures by selector source (4 files for 11 retailers)
- [D08-02-03] Test file uses .test.ts extension to match vitest pattern

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 08-02-PLAN.md (E2E Selector Tests) - Phase 8 complete
Resume file: None

## Roadmap Evolution

- Phases 7, 8, 9 added: File naming optimization, metadata DOM audit, raw manifest enhancement (2026-01-28)

## Phase Completion Status

- [x] Phase 1: Unified Format Foundation (2/2 plans)
- [x] Phase 2: Standard Retailer Mappings (2/2 plans)
- [x] Phase 3: AMZD Special Handling (2/2 plans)
- [x] Phase 4: Data Processing Pipeline (2/2 plans)
- [x] Phase 5: Auction Metadata Extraction (2/2 plans)
- [x] Phase 6: UI Integration (1/1 plans)
- [x] Phase 7: File Naming Optimization (2/2 plans)
- [x] Phase 8: Metadata DOM Audit (2/2 plans)
- [ ] Phase 9: Raw Manifest Enhancement (not planned)
