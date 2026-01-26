# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Modular Chrome extension with plugin-based retailer system

**Key Characteristics:**
- Plugin/registry pattern for multi-retailer support
- Separation of concerns: content scripts, service worker, popup UI
- Extension message-passing for cross-component communication
- Dual-world script execution (ISOLATED and MAIN worlds in tabs)

## Layers

**Content Scripts Layer:**
- Purpose: Run JavaScript in page context to extract data and intercept downloads
- Location: `src/content/`
- Contains: Site-specific content script injections (`sites/amazon.ts`, `sites/bstock.ts`, `sites/techliquidators.ts`), detector base class
- Depends on: Retailer modules (`src/retailers/`)
- Used by: Service worker via message passing

**Service Worker (Background):**
- Purpose: Central message hub and file processing orchestrator
- Location: `src/background/service-worker.ts`
- Contains: Message handler, file download/upload logic, manifest parsing coordination
- Depends on: Parsers (`src/parsers/`), file readers (CSV/XLSX), utilities
- Used by: Popup UI via `chrome.runtime.sendMessage()`

**Popup UI Layer:**
- Purpose: User interface for configuration, URL entry, file upload, progress monitoring
- Location: `src/popup/popup.ts`
- Contains: Event listeners, state management, DOM manipulation, progress tracking
- Depends on: Google Sheets API client, proxy config, retailers module
- Used by: User directly

**Retailers Module (Plugin System):**
- Purpose: Encapsulate retailer-specific logic for URL matching, metadata extraction, manifest downloading
- Location: `src/retailers/`
- Contains: Registry (`registry.ts`), individual retailer modules (`sites/`), utility functions
- Depends on: Retailer types (`types.ts`)
- Used by: Service worker, popup, content scripts

**Parsers Layer:**
- Purpose: Convert raw CSV/XLSX data into unified ManifestItem format
- Location: `src/parsers/`
- Contains: Base parser, site-specific parsers, file readers (CSV/XLSX), type definitions
- Depends on: External libraries (papaparse, xlsx)
- Used by: Service worker

**Utilities Layer:**
- Purpose: Reusable functions for exports, file operations, proxy configuration
- Location: `src/utils/`
- Contains: CSV export, ZIP creation, proxy settings, file utilities
- Depends on: External libraries (jszip, papaparse)
- Used by: Popup, service worker

**Services Layer:**
- Purpose: External API integrations
- Location: `src/services/`
- Contains: Google Sheets integration
- Depends on: Google Sheets API
- Used by: Popup for loading URLs from shared sheets

## Data Flow

**Direct File Download Flow:**

1. User provides file URL → Popup sends URL to Service Worker
2. Service Worker fetches file via HTTP → Detects file type (magic bytes, content-type)
3. File stored in ZIP without parsing → Downloaded to user

**Tab Processing Flow (For Interactive Pages):**

1. User provides listing/auction URL → Popup opens tab invisibly
2. Content script injects retailer module functions via `chrome.scripting.executeScript()`
3. ISOLATED world script (`extractMetadata`) extracts page metadata
4. MAIN world script (`downloadManifest`) intercepts blob creation or triggers download
5. Service Worker receives base64 manifest data → Stores in ZIP → Downloads to user

**Local File Upload Flow:**

1. User selects file → Popup converts to base64
2. Popup sends base64 + filename to Service Worker via message
3. Service Worker detects file type → Parses with appropriate parser
4. Parsed items added to ZIP → Downloaded to user

**State Management:**

- Popup state persisted to `chrome.storage.local` for persistence across popup close/open
- Processing progress tracked during multi-item operations
- Last ZIP blob retained in memory for "download again" functionality

## Key Abstractions

**RetailerModule Interface:**
- Purpose: Defines contract for retailer-specific implementations
- Examples: `src/retailers/sites/bstock.ts`, `src/retailers/sites/amazon.ts`
- Pattern: Each retailer implements `matches()`, `needsTabProcessing()`, `extractMetadata()`, `downloadManifest()`
- Benefit: Allows extension to new retailers without modifying core logic

**ManifestDetector Base Class:**
- Purpose: Abstract base for finding manifest files on pages
- Examples: Implemented by site-specific content scripts
- Pattern: Subclasses implement `detectManifests()`, `isAuthenticated()`
- Note: Currently used for detecting manifest links in content scripts

**FieldMapping:**
- Purpose: Defines which raw CSV columns map to unified ManifestItem fields
- Pattern: Maps column name variations to standard fields (e.g., `['upc', 'sku', 'item #']` all map to `upc`)
- Used in: `src/parsers/base-parser.ts` for normalizing heterogeneous source data

**ExtensionMessage:**
- Purpose: Standardized message format for all inter-component communication
- Type-safe with `type` discriminator + generic payload
- Examples: `{ type: 'PARSE_FILE', payload: { ... } }`

## Entry Points

**Service Worker:**
- Location: `src/background/service-worker.ts`
- Triggers: Chrome extension background process starts
- Responsibilities: Listen for messages, coordinate all processing, handle file I/O

**Popup Script:**
- Location: `src/popup/popup.ts`
- Triggers: User clicks extension icon to open popup
- Responsibilities: UI initialization, event handling, state persistence

**Content Scripts:**
- Locations: `src/content/sites/amazon.ts`, `src/content/sites/bstock.ts`, `src/content/sites/techliquidators.ts`
- Triggers: Injected automatically for matching URLs (defined in `manifest.json`)
- Responsibilities: Page detection, metadata extraction (via ISOLATED world), manifest download (via MAIN world)

## Error Handling

**Strategy:** Try-catch blocks with console logging and user-facing alerts

**Patterns:**

- Service Worker errors: Caught in message handler, returned as `{ type: 'ERROR', error: message }`
- Popup errors: Displayed as browser alerts via `alert()`
- File parsing errors: Logged but don't prevent processing other files
- Network errors: Retry logic in proxy config initialization, timeout protection on tab loading

**Logging:**
- Prefix format: `[ManifestParser:SW]`, `[ManifestParser]` for consistency
- Console.error() for failures, console.log() for flow tracking
- No sensitive data logged (auth tokens, credentials omitted from logs)

## Cross-Cutting Concerns

**Authentication:**
- Google OAuth2 for Sheets API (handled in `src/services/google-sheets.ts`)
- Site authentication: Cookies included in fetch requests via `credentials: 'include'`
- Extension identity: OAuth client ID in `manifest.json`

**Proxy Configuration:**
- User-configurable proxy settings persisted to storage
- Applied only to techliquidators.com requests
- Supports username/password authentication
- Initialization on service worker startup

**File Type Detection:**
- Content-type header examination first
- URL extension fallback
- Magic byte analysis for XLSX (0x50 0x4B) and XLS (0xD0 0xCF 0x11 0xE0)
- Default to CSV if ambiguous

**Validation:**
- Google Sheets URL format: Must be `docs.google.com/spreadsheets` with valid ID
- Manifest items: UPC and product name required (validation in `base-parser.ts`)
- File uploads: Only CSV/XLSX/XLS accepted

---

*Architecture analysis: 2026-01-27*
