# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**Google APIs:**
- Google Sheets API v4 - Read spreadsheet data containing URLs
  - SDK/Client: Chrome `identity` API for OAuth2 token management
  - Endpoint: `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}`
  - Auth: OAuth2 Bearer token via Chrome Identity API
  - Scopes: `https://www.googleapis.com/auth/spreadsheets.readonly`
  - Location: `src/services/google-sheets.ts`

- Google OAuth2 Token Management
  - Token revocation: `https://accounts.google.com/o/oauth2/revoke?token={token}`
  - Implementation: `src/services/google-sheets.ts` - `signOut()`, `getAuthToken()`, `removeCachedToken()`

## Web Services (Retailer Sites)

**B-Stock:**
- URL pattern: `https://bstock.com/{retailer}/auction/*` and `https://bstockauctions.com/*`
- Purpose: Scrape product listings and download manifest files
- Implementation: `src/content/sites/bstock.ts`, `src/retailers/sites/bstock-auction.ts`, `src/retailers/sites/bstock.ts`
- Data extracted: Retailer info, listing names, auction end times, manifest URLs

**TechLiquidators:**
- URL pattern: `https://techliquidators.com/*`
- Purpose: Scrape liquidation inventory and manifest files
- Implementation: `src/content/sites/techliquidators.ts`, `src/retailers/sites/techliquidators.ts`
- Proxy support: Custom HTTP proxy with authentication (`src/utils/proxy-config.ts`)

**Amazon:**
- URL pattern: `https://amazon.com/dp/*` or `https://amazon.com/gp/product/*`
- Purpose: Scrape product information from Amazon Direct Liquidation
- Implementation: `src/content/sites/amazon.ts`, `src/retailers/sites/amazon.ts`

## Data Storage

**Databases:**
- Not applicable - Browser-based extension

**File Storage:**
- AWS S3 (indirect) - B-Stock may host manifest files on S3
  - Host permission: `*://*.s3.amazonaws.com/*`
  - No direct S3 SDK integration, accessed via HTTP

**Local Storage:**
- Chrome Local Storage API
  - Purpose: Persist popup state and proxy settings
  - Keys: `popupState`, `proxySettings`
  - Implementation: `src/popup/popup.ts` (state management), `src/utils/proxy-config.ts` (settings)

**In-Memory:**
- File downloads stored as base64 in memory during processing
- ZIP files generated in-memory via jszip library

## Caching

**None** - No explicit caching layer. Chrome browser provides HTTP caching.

## Authentication & Identity

**Auth Provider:**
- Google OAuth2 (Chrome Identity API)
  - Client ID: `663454025753-hv2icekthq6uuc2cf8i6glt5el5mac1v.apps.googleusercontent.com`
  - Scope: `spreadsheets.readonly`
  - Implementation: `src/services/google-sheets.ts`

**Custom Auth:**
- HTTP Basic Auth for proxy servers
  - Username/password stored in Chrome storage (encrypted by Chrome)
  - Implementation: `src/utils/proxy-config.ts` - `handleProxyAuth()`

**Site Authentication:**
- No OAuth for retailer sites - Extension scrapes publicly accessible pages
- User must be logged into retailer sites in browser before extension can access

## HTTP Proxy Configuration

**Proxy Support:**
- HTTP proxy with optional Basic authentication
- Selective proxying via PAC (Proxy Auto-Config) script
- Implementation: `src/utils/proxy-config.ts`
- Configuration storage: Chrome local storage
- Target sites: `['techliquidators.com']` by default
- Auth handler: Intercepts `chrome.webRequest.onAuthRequired` events

**PAC Script Generation:**
- Dynamically generates PAC script for selective proxying
- Example: `PROXY host:port` for matching sites, `DIRECT` for others

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Console logging (browser console)
  - Locations: `src/utils/proxy-config.ts`, `src/background/service-worker.ts`
  - Debug prefix format: `[Proxy]`, `[Extension]`

**Warnings:**
- CSV parse error handling with fallback to partial data
- XLSX validation with detailed error messages

## Message Passing & IPC

**Inter-Process Communication:**
- Chrome `runtime.onMessage` API for background-popup-content communication
- Message types: `DETECT_MANIFESTS`, `DOWNLOAD_MANIFEST`, `PARSE_FILE`, `FETCH_PAGE_TITLES`, `GET_SITE_INFO`, `EXTRACT_LISTING_DATA`
- Implementation: `src/content/detector.ts`, `src/background/service-worker.ts`, `src/popup/popup.ts`

## File Import/Export

**Import Formats:**
- CSV files - Papa Parse library
- XLSX/XLS files - XLSX library
- ZIP files - jszip library (for exporting parsed data)

**Export Formats:**
- CSV export - `src/utils/csv-export.ts`
- ZIP export with CSV inside - `src/utils/zip-export.ts`

## Environment Configuration

**Required env vars:**
- None explicitly configured
- Google OAuth2 client ID is hardcoded in `manifest.json` (public, safe)

**Secrets location:**
- Chrome storage (encrypted by Chrome browser)
  - Proxy credentials stored locally
  - Google auth tokens managed by Chrome Identity API

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None - Extension is pull-only, no outbound callbacks

## Rate Limiting

**None** - No rate limiting implemented. Extension is single-user, local operation.

## Content Scripts Injection

**Sites where content scripts run:**
- B-Stock auction pages: `*://*.bstock.com/*`, `*://*.bstockauctions.com/*`
- TechLiquidators: `*://*.techliquidators.com/*`
- Amazon: `*://*.amazon.com/*`

**Script locations:**
- `src/content/sites/bstock.ts` - Detects and extracts listing data
- `src/content/sites/techliquidators.ts` - Scrapes manifest information
- `src/content/sites/amazon.ts` - Extracts product details

## Third-Party Scripts

**None loaded** - Extension is self-contained with bundled dependencies via Vite.

---

*Integration audit: 2026-01-27*
