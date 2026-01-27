# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Transform messy, inconsistent manifests from multiple retailers into a clean, unified CSV format
**Current focus:** Phase 4 - Data Processing Pipeline

## Current Position

Phase: 4 of 6 (Data Processing Pipeline)
Plan: 1 of 2 in phase
Status: In progress
Last activity: 2026-01-27 - Completed 04-01-PLAN.md (Data Cleaning and Deduplication)

Progress: [#######...] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 3.9 minutes
- Total execution time: 27 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Unified Format Foundation | 2/2 | 7 min | 3.5 min |
| 2. Standard Retailer Mappings | 2/2 | 10 min | 5.0 min |
| 3. AMZD Special Handling | 2/2 | 7 min | 3.5 min |
| 4. Data Processing Pipeline | 1/2 | 3 min | 3.0 min |

**Recent Trend:**
- Last 5 plans: 02-01 (3 min), 02-02 (7 min), 03-01 (3 min), 03-02 (4 min), 04-01 (3 min)
- Trend: TDD tasks execute efficiently

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

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 04-01-PLAN.md (Data Cleaning and Deduplication)
Resume file: None
