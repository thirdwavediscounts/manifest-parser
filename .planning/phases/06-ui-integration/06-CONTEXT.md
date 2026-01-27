# Phase 6: UI Integration - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a format toggle to the popup UI allowing users to choose between raw file downloads (original CSV/XLSX) and unified format (processed CSV with standardized columns). The toggle state persists across sessions.

</domain>

<decisions>
## Implementation Decisions

### Control Type
- Toggle switch (not dropdown or radio buttons)
- Positioned at top of popup, near title — prominent and visible before processing
- Labels: "Raw" / "Unified" — short, technical terminology
- No subtitle or description text — keep it minimal

### Default Behavior
- Default to Raw for first-time users — preserves existing behavior, unified is opt-in
- Mode change applies immediately when toggle is flipped — no confirmation needed
- No visual confirmation (toast/flash) on toggle — the toggle state itself is sufficient
- If unified processing fails, show error only — no automatic fallback to raw

### Visual Feedback
- Keep existing "Process" links and auto-download behavior — toggle affects output format only
- Match existing popup styling for toggle appearance
- Filename does NOT change based on format — same naming regardless of mode
- Status/progress text remains generic — no format mention during processing

### Persistence
- Restore toggle state when popup reopens — user's last choice is remembered
- On storage read failure, silently default to Raw

### Claude's Discretion
- Storage mechanism choice (chrome.storage.local vs sync)
- Whether to include a "Reset to defaults" option
- Exact toggle component styling within existing popup aesthetics
- Error message wording when unified processing fails

</decisions>

<specifics>
## Specific Ideas

- Use existing process links and auto-download pattern — the toggle is purely about format selection, not workflow changes
- Keep the UI minimal — no extra explanatory text needed for "Raw" vs "Unified"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-ui-integration*
*Context gathered: 2026-01-27*
