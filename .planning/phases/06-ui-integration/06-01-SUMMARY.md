---
phase: "06"
plan: "01"
subsystem: "popup-ui"
tags: ["toggle", "ui", "persistence", "chrome-storage"]

dependency-graph:
  requires:
    - "05-02: Metadata Integration" # Uses unified format types and zip-export
  provides:
    - "Format toggle UI component"
    - "User preference persistence"
    - "Dual-mode processing (raw/unified)"
  affects:
    - "06-02: Final polish" # May need refinement

tech-stack:
  added: []
  patterns:
    - "Toggle switch with label highlighting"
    - "Chrome storage for preference persistence"
    - "Conditional processing branches"

key-files:
  created: []
  modified:
    - "src/popup/index.html"
    - "src/popup/popup.css"
    - "src/popup/popup.ts"

decisions:
  - id: "D06-01-01"
    description: "Default to Raw mode for backward compatibility"
    rationale: "Existing users expect original files; unified is opt-in"
  - id: "D06-01-02"
    description: "Unified mode throws on parse error (no fallback)"
    rationale: "Per CONTEXT.md - show error only, no automatic fallback to raw"
  - id: "D06-01-03"
    description: "Both modes track totals for results display"
    rationale: "Parse for item count even in raw mode (ignore parse errors)"

metrics:
  duration: "4 minutes"
  completed: "2026-01-27"
---

# Phase 6 Plan 1: Format Toggle UI Summary

Toggle switch in popup header allowing Raw (original files) vs Unified (transformed CSV) output format with chrome.storage persistence.

## What Was Built

### Toggle UI Component
- Toggle switch positioned in header after subtitle
- Labels: "Raw" (left) and "Unified" (right)
- Active label highlighted with full opacity
- Sliding toggle with smooth transitions
- Matches existing popup gradient aesthetics

### State Persistence
- `formatMode: 'raw' | 'unified'` added to PopupState
- Persisted in chrome.storage.local with other popup state
- Restored on popup reopen; defaults to 'raw' if missing
- Toggle change immediately updates state and persists

### Processing Branch
- `handleProcess()` branches based on `state.formatMode`
- **Raw mode:** Collects base64 data directly, creates ZIP with original file formats
- **Unified mode:** Parses, transforms to unified format, generates CSV
- Both modes track item counts and retail values for results display

## Key Changes

| File | Changes |
|------|---------|
| `src/popup/index.html` | Added `.format-toggle-container` with toggle switch and labels |
| `src/popup/popup.css` | Added toggle switch styles with sliding animation |
| `src/popup/popup.ts` | Added formatMode to state, persistence, UI restoration, processing branch |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ef03fc6 | feat | Add format toggle UI with persistence |
| 598970c | feat | Wire format toggle to processing path |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] TypeScript compiles without errors
- [x] Toggle appears in popup header
- [x] `formatMode` persisted in chrome.storage.local
- [x] Raw mode uses `createZipFromRawFiles()`
- [x] Unified mode uses `createZipFromUnifiedManifests()`

## Next Phase Readiness

**Ready for 06-02 (Final Polish)**
- Toggle UI is functional and styled
- Processing modes work correctly
- No blockers identified
