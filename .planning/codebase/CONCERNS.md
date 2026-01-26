# Codebase Concerns

**Analysis Date:** 2026-01-27

## Tech Debt

**Incomplete Raw vs. Parsed ZIP Handling:**
- Issue: Popup handles raw file entries (from tab downloads) and parsed entries (from uploaded files) separately. When both exist, parsed entries are discarded and only raw files are included in the ZIP.
- Files: `src/popup/popup.ts` (lines 646-656), `src/utils/zip-export.ts`
- Impact: Loss of parsed data and statistics when mixing URL downloads with file uploads; users don't see item counts or retail values for raw files
- Fix approach: Implement hybrid ZIP creation that combines both raw files and parsed CSV entries in a single archive with proper naming and folder structure

**Timezone Handling Missing DST:**
- Issue: PST to military time conversion uses hardcoded UTC-8 offset year-round, ignoring Daylight Saving Time. PDT (UTC-7) applies roughly March-November.
- Files: `src/retailers/sites/bstock.ts` (lines 553-574, function `convertToPstMilitary`)
- Impact: Filenames have incorrect times by ±1 hour during daylight saving periods (roughly 7 months per year)
- Fix approach: Integrate timezone library (e.g., `date-fns-tz` or `Day.js` with tz plugin) for accurate PST/PDT conversion based on date

**State Persistence Incomplete:**
- Issue: Popup state is saved to Chrome storage but several fields cannot be serialized (File objects, Blob). While these are excluded from save, recovery after popup close/reopen loses progress context.
- Files: `src/popup/popup.ts` (lines 71-80, 86-96)
- Impact: If popup closes during processing, user loses exact progress position and must restart
- Fix approach: Implement checkpoint system saving per-item progress to storage, allowing resumption from last completed URL

**Proxy Authentication State Not Persisted:**
- Issue: Proxy credentials are stored in extension storage but `setupProxyAuthHandler()` is only called once during initialization. If credentials change during runtime, the handler isn't updated.
- Files: `src/utils/proxy-config.ts` (lines 121-146)
- Impact: Changing proxy credentials in popup requires extension reload to take effect
- Fix approach: Add listener to chrome.storage.onChanged to reinitialize auth handler when proxy settings update

## Known Bugs

**Memory Leak in URL Processing Loop:**
- Symptoms: Long processing sessions with many URLs may cause memory buildup; no cleanup between requests
- Files: `src/popup/popup.ts` (lines 531-598, the handleProcess loop)
- Trigger: Process 50+ URLs sequentially; memory increases with each iteration
- Current mitigation: `state.processingProgress` is cleared, but intermediate data (tabs, blobs) not explicitly garbage collected
- Fix: Add explicit cleanup after each tab close and blob processing; consider batch processing with forced garbage collection breaks

**Missing Error Recovery in Tab Processing:**
- Symptoms: If `chrome.tabs.get()` or tab load fails, the error is caught but doesn't clean up event listeners
- Files: `src/popup/popup.ts` (lines 881-923, function `waitForTabLoad`)
- Trigger: Network issue during tab creation or page load timeout (30s)
- Workaround: Extension reload restarts processing, but tab cleanup may fail silently
- Fix: Ensure `chrome.tabs.onUpdated.removeListener()` is always called in all error paths, not just cleanup path

**Base64 Decoding Without Size Validation:**
- Symptoms: Very large base64-encoded files (>100MB) passed to `createZipFromRawFiles` may cause memory exhaustion
- Files: `src/utils/zip-export.ts` (lines 68-73, the atob/Uint8Array conversion)
- Trigger: Processing unusually large manifest files
- Current mitigation: Files are downloaded and processed client-side with no size checks
- Fix: Add pre-processing size check; reject files > configured limit (e.g., 50MB); add streaming support for large files

## Security Considerations

**Hardcoded Proxy Sites List:**
- Risk: Only 'techliquidators.com' is hardcoded in proxy configuration. If other sites need proxy support, code change is required.
- Files: `src/utils/proxy-config.ts` (line 21, hardcoded `sites: ['techliquidators.com']`)
- Current mitigation: Proxy settings are saved per-user in chrome.storage.local
- Recommendations:
  - Make sites list editable in UI (allow adding/removing proxy domains)
  - Store user-configurable list in extension storage alongside other proxy settings

**Credential Storage in Chrome Storage:**
- Risk: Proxy passwords are stored in `chrome.storage.local`, which is not encrypted on all platforms. Platform-specific encryption varies.
- Files: `src/utils/proxy-config.ts` (lines 37-46, `saveProxySettings` stores username/password)
- Current mitigation: Popup UI only exposes settings to authenticated extension, not public
- Recommendations:
  - Use `chrome.storage.managed` for enterprise deployments
  - Add warning in UI that passwords are not encrypted
  - Consider removing password storage and requiring browser-level proxy auth only

**OAuth Token Handling:**
- Risk: Google Sheets OAuth token is obtained but no refresh token management. If token expires during long-running batch processing, operation fails without user interaction.
- Files: `src/services/google-sheets.ts` (lines 24-37, function `getAuthToken`), `src/popup/popup.ts` (lines 361-395, `handleLoadSheet`)
- Current mitigation: 401 response triggers token removal and user re-auth prompt
- Recommendations:
  - Implement token refresh logic before expiration
  - Cache refresh tokens if available
  - Add request queuing to handle concurrent sheet API calls

**No Input Validation on Sheet URLs:**
- Risk: User-provided Google Sheets URLs are extracted for spreadsheet ID but not validated beyond basic regex pattern
- Files: `src/popup/popup.ts` (lines 352-354, `isValidSheetUrl`), `src/services/google-sheets.ts` (lines 13-19, `extractSpreadsheetId`)
- Current mitigation: Sheets API request fails gracefully if ID is invalid
- Recommendations:
  - Validate sheet exists and is accessible before processing
  - Add permission checks (user must have read access)
  - Sanitize extracted URLs before making API calls

**Blob Interception Not Protected Against Replay:**
- Risk: B-Stock download interception in MAIN world can be spoofed; script replaces `URL.createObjectURL` globally, potentially capturing unrelated blobs
- Files: `src/retailers/sites/bstock.ts` (lines 730-737, blob interception)
- Current mitigation: Only manifest-related button is clicked; timeout (6s) limits exposure window
- Recommendations:
  - Add MIME type validation (check blob is CSV/XLSX before capturing)
  - Use more specific interception targeting (e.g., hook only download-related methods)
  - Add integrity checks on captured blob content

## Performance Bottlenecks

**Sequential Tab Processing:**
- Problem: URLs are processed one-at-a-time with 30s timeout per tab. Processing 20 URLs takes ~5+ minutes.
- Files: `src/popup/popup.ts` (lines 531-598, the for-loop processes sequentially)
- Cause: Chrome tab limit and resource constraints; no batching
- Improvement path:
  - Add configurable max concurrent tabs (e.g., 3-5 tabs in parallel)
  - Implement queue-based processor with priority sorting
  - Add per-site rate limiting (some retailers block rapid requests)

**No Caching of Retailer Detection:**
- Problem: Each URL is checked against all retailer modules sequentially; no caching of retailer type
- Files: `src/retailers/registry.ts`, called from `src/popup/popup.ts` (lines 551-562)
- Cause: Registry lookup happens during state update in loop
- Improvement path:
  - Cache retailer detection results in state
  - Use URL pattern prefix matching for faster lookup
  - Precompile regex patterns

**CSV Parsing Without Streaming:**
- Problem: Entire CSV file loaded into memory before parsing; large files (>50MB) cause slowdown
- Files: `src/parsers/csv-reader.ts` (implicitly)
- Cause: Papa Parse library used without streaming mode
- Improvement path:
  - Use streaming CSV parser for large files
  - Add incremental processing with progress updates
  - Implement row-by-row processing with batch limits

**No Request Deduplication:**
- Problem: If same URL appears multiple times in sheet, it's processed separately without deduplication
- Files: `src/popup/popup.ts` (lines 524-525, the `selectedUrls` array)
- Cause: No pre-processing step to remove duplicates
- Improvement path:
  - Add deduplication pass before processing
  - Show user how many duplicates were removed
  - Cache successful downloads by URL hash

## Fragile Areas

**Retailer Metadata Extraction Functions:**
- Files: `src/retailers/sites/bstock.ts` (lines 71-706), `src/retailers/sites/techliquidators.ts` (lines 58-154), `src/retailers/sites/amazon.ts`
- Why fragile: These functions parse page content and titles using regex and string splitting. HTML structure changes break extraction; many hardcoded assumption about title format (e.g., "Pallet of X, Condition, Details | Closes: Date").
- Safe modification:
  - Add test suite with sample real pages for each retailer
  - Use data attributes or structured data extraction where possible
  - Add fallback chain with multiple extraction strategies
  - Test all condition mappings with real B-Stock/TechLiquidators data
- Test coverage: No unit tests for metadata extraction; manual testing only

**Proxy Configuration Apply/Clear:**
- Files: `src/utils/proxy-config.ts` (lines 51-100)
- Why fragile: `chrome.proxy.settings.set()` with PAC script generation is error-prone. PAC script syntax errors silently fail. No validation that proxy actually applied.
- Safe modification:
  - Add PAC script syntax validation before applying
  - Test with real proxy server
  - Add logging to confirm settings applied
  - Handle permission errors gracefully
- Test coverage: No tests for proxy configuration

**Tab Lifecycle Management:**
- Files: `src/popup/popup.ts` (lines 881-923, 941-1063)
- Why fragile: Tab creation, load detection, and cleanup across multiple async operations. Event listener cleanup can be missed if multiple error paths exist.
- Safe modification:
  - Use AbortController pattern for tab lifetime management
  - Centralize tab cleanup in finally block (already done)
  - Add helper class for tab state tracking
  - Test with network interruptions and tab close scenarios
- Test coverage: No tests; manual testing only

**Condition Abbreviation Mapping:**
- Files: `src/retailers/sites/bstock.ts` (lines 463-512, `conditionToAbbrev`)
- Why fragile: 20+ condition variations mapped to abbreviations. String matching order matters (must check more specific before generic). New conditions from retailers not in mapping cause silent fallback to empty string.
- Safe modification:
  - Add test matrix of all known condition strings
  - Use lookup table instead of if-chain
  - Add warning logging for unmapped conditions
  - Validate condition abbreviations are always 1-3 characters
- Test coverage: No unit tests for condition mapping

## Scaling Limits

**Chrome Extension Tab Limit:**
- Current capacity: Chrome allows ~15-20 concurrent tab creations before throttling
- Limit: Processing more than ~5-10 URLs in parallel hits resource exhaustion; browser may kill tabs
- Scaling path:
  - Implement queue-based processor with max 3-5 concurrent tabs
  - Add backpressure handling to pause processing if tab creation fails
  - Monitor tab creation rate and backoff dynamically

**Memory Usage in ZIP Creation:**
- Current capacity: JSZip loads entire archive in memory; 500+ files (100+ MB) total hits memory limits
- Limit: Browser tab crashes if ZIP > ~400MB
- Scaling path:
  - Split large ZIPs into chunks (e.g., max 100 files per ZIP)
  - Implement streaming ZIP creation (requires different library)
  - Add progress reporting for large archives

**Google Sheets API Rate Limiting:**
- Current capacity: Sheets API allows ~60 requests/minute per user without quota exhaustion
- Limit: Batch loading multiple sheets or frequent refreshes hits rate limit
- Scaling path:
  - Add request batching for multiple sheet IDs
  - Implement exponential backoff for 429 responses
  - Cache sheet data locally with TTL

## Dependencies at Risk

**Papa Parse Version Pinning:**
- Risk: Locked to `^5.4.1`; CSV parsing may have edge cases in future versions
- Impact: Changes to Papa Parse behavior could break manifest parsing
- Migration plan:
  - Add test suite for CSV edge cases (quoted fields, escaping, Unicode)
  - Monitor Papa Parse changelog
  - Consider CSV parser alternatives (e.g., csv-parse from csv module)

**JSZip Maintenance:**
- Risk: JSZip is mature but no active development; streaming/performance improvements unlikely
- Impact: Large archives (>100MB) will be slow to create
- Migration plan:
  - Test with alternative ZIP libraries (e.g., `pako` + custom ZIP wrapper)
  - Profile JSZip performance on large files
  - Consider serverless backend for ZIP creation if scaling needed

**XLSX Library Compatibility:**
- Risk: Locked to `^0.18.5`; XLSX format changes may not be supported
- Impact: New Excel file formats or advanced features not parsed
- Migration plan:
  - Add support detection for XLSX format version on file load
  - Test with real-world manifests from retailers
  - Consider ExcelJS as alternative if custom parsing needed

## Missing Critical Features

**No Offline Support:**
- Problem: Extension requires internet for sheet loading, OAuth token refresh, and manifest download. Offline queueing not implemented.
- Blocks: Users with intermittent connectivity cannot queue URLs for later processing

**No Duplicate Detection:**
- Problem: Same URL can be selected multiple times; no client-side check
- Blocks: Batch processing of duplicate URLs wastes time and resources

**No Batch Retry Logic:**
- Problem: Failed URLs stop processing; no automatic retry or skip mechanism
- Blocks: Single failed retailer page breaks entire batch; manual restart required

**No Manifest Validation:**
- Problem: Downloaded manifests are not validated for structure or required fields
- Blocks: Invalid manifests pass through to ZIP; users don't know until manual inspection

## Test Coverage Gaps

**Retailer Detection Module:**
- What's not tested: `src/retailers/registry.ts`, `src/retailers/index.ts` - no unit tests for URL pattern matching
- Files: `src/retailers/registry.ts`, `src/retailers/sites/*.ts`
- Risk: Retailer detection regex changes could silently break detection for specific retailers
- Priority: High - affects all retailer-specific functionality

**Proxy Configuration:**
- What's not tested: `src/utils/proxy-config.ts` - no tests for PAC script generation, proxy application
- Files: `src/utils/proxy-config.ts`
- Risk: Proxy settings may fail silently without tests detecting the issue
- Priority: High - user-facing feature, security-related

**Metadata Extraction Functions:**
- What's not tested: Extraction functions in `src/retailers/sites/*.ts` (B-Stock, TechLiquidators, Amazon)
- Files: `src/retailers/sites/bstock.ts` (lines 71-706), `src/retailers/sites/techliquidators.ts` (lines 58-154)
- Risk: HTML structure changes break silently; user gets wrong filenames
- Priority: Critical - core functionality, directly impacts file output

**CSV/XLSX Parsing Edge Cases:**
- What's not tested: Field mapping, number parsing, empty rows, Unicode handling
- Files: `src/parsers/base-parser.ts`, `src/parsers/csv-reader.ts`, `src/parsers/xlsx-reader.ts`
- Risk: Data corruption, lost items, incorrect totals on edge-case files
- Priority: High - data integrity is critical

**Tab Lifecycle and Error Scenarios:**
- What's not tested: Tab timeout, network errors, page load failures, popup close during processing
- Files: `src/popup/popup.ts` (lines 881-1063)
- Risk: Orphaned tabs, memory leaks, stuck processing state
- Priority: High - robustness and user experience

**Google Sheets API Integration:**
- What's not tested: Token refresh, rate limiting, invalid URLs, permission errors
- Files: `src/services/google-sheets.ts`
- Risk: Silent auth failures, users blocked without clear error message
- Priority: Medium - error handling improvements needed

**Filename Generation:**
- What's not tested: Sanitization, truncation, special character handling, duplicate avoidance
- Files: `src/popup/popup.ts` (lines 1074-1135, `generateListingFilename`)
- Risk: Invalid filenames, filename collisions, Unicode issues
- Priority: Medium - data integrity and usability

---

*Concerns audit: 2026-01-27*
