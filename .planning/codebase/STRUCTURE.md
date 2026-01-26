# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
manifest-parser/
├── src/                    # TypeScript source code
│   ├── background/         # Service worker (background process)
│   ├── content/            # Content scripts (injected into pages)
│   ├── popup/              # Popup UI and logic
│   ├── retailers/          # Plugin system for retailer-specific logic
│   ├── parsers/            # File parsing and normalization
│   ├── services/           # External API integrations (Google Sheets)
│   └── utils/              # Reusable utilities
├── tests/                  # Vitest test suite
├── dist/                   # Built extension (generated, not committed)
├── extension/              # Extension distribution artifacts
├── icons/                  # Extension icon assets
├── csvs/                   # Output directory for downloaded files
├── docs/                   # Project documentation
├── scripts/                # Build and utility scripts
├── manifest.json           # Chrome extension manifest
├── vite.config.ts          # Vite build configuration
├── vitest.config.ts        # Vitest configuration
├── tsconfig.json           # TypeScript compiler configuration
└── package.json            # Node dependencies
```

## Directory Purposes

**`src/background/`**
- Purpose: Service worker entry point and background processing
- Contains: Message handler, file orchestration, proxy initialization
- Key files: `service-worker.ts`

**`src/content/`**
- Purpose: Scripts injected into pages for data extraction
- Contains: Base detector class, site-specific content scripts
- Key files: `detector.ts`, `sites/amazon.ts`, `sites/bstock.ts`, `sites/techliquidators.ts`
- Note: Content scripts run in isolated world for DOM access; may execute MAIN world scripts for blob interception

**`src/popup/`**
- Purpose: User interface and popup logic
- Contains: Event listeners, state management, UI update functions
- Key files: `popup.ts` (includes `popup.html` reference), `index.html` (referenced in manifest.json)
- Handles: Authentication flow, URL/file input, progress tracking, results display

**`src/retailers/`**
- Purpose: Plugin-based retailer system
- Contains: Registry singleton, retailer module definitions, utility functions
- Structure:
  - `registry.ts`: Central registry for retailer lookup by URL
  - `index.ts`: Exports and auto-registration
  - `types.ts`: RetailerModule interface and related types
  - `sites/`: Individual retailer implementations (bstock.ts, amazon.ts, etc.)

**`src/parsers/`**
- Purpose: Convert raw CSV/XLSX data to unified format
- Contains: Field mapping, data normalization, file readers
- Key files:
  - `base-parser.ts`: Core parsing logic with field mapping
  - `bstock-parser.ts`: B-Stock specific field mappings
  - `techliquidators-parser.ts`: TechLiquidators specific field mappings
  - `csv-reader.ts`: CSV parsing (uses papaparse)
  - `xlsx-reader.ts`: XLSX/XLS parsing (uses xlsx library)
  - `types.ts`: ManifestItem, FieldMapping, ParseResult interfaces

**`src/services/`**
- Purpose: External service integrations
- Contains: Google Sheets API client
- Key files: `google-sheets.ts`
- Handles: OAuth2 authentication, spreadsheet reading

**`src/utils/`**
- Purpose: Reusable utility functions
- Contains:
  - `csv-export.ts`: Convert manifest items to CSV format
  - `zip-export.ts`: Create ZIP archives with manifest files
  - `file-utils.ts`: File type detection and utilities
  - `proxy-config.ts`: User proxy settings management

**`tests/`**
- Purpose: Unit and integration tests
- Organization: Mirrors `src/` structure
- Test files: `*.test.ts` for each major module
- Framework: Vitest with globals enabled

## Key File Locations

**Entry Points:**
- `src/background/service-worker.ts`: Service worker entry (manifest: `background.service_worker`)
- `src/popup/index.html`: Popup UI (manifest: `action.default_popup`)
- `src/content/sites/*.ts`: Content scripts (manifest: `content_scripts`)
- `manifest.json`: Extension manifest with all configuration

**Configuration:**
- `tsconfig.json`: TypeScript settings (strict mode, path aliases `@/*`)
- `vite.config.ts`: Build config with CRXJS plugin
- `vitest.config.ts`: Test runner config with globals
- `manifest.json`: Chrome extension permissions, host permissions, OAuth

**Core Logic:**
- `src/retailers/registry.ts`: Retailer lookup system
- `src/retailers/sites/`: Individual retailer modules (pluggable)
- `src/parsers/base-parser.ts`: Core parsing with field mapping
- `src/popup/popup.ts`: Main popup logic (1141 lines, handles state, UI, processing)

**Testing:**
- `tests/parsers/base-parser.test.ts`: Parser unit tests
- `tests/parsers/csv-reader.test.ts`: CSV reader tests
- `tests/utils/csv-export.test.ts`: Export utility tests

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` (e.g., `base-parser.ts`, `csv-reader.ts`)
- Directories: `kebab-case` (e.g., `src/retailers/sites/`, `src/parsers/`)
- Test files: `module-name.test.ts` (e.g., `base-parser.test.ts`)

**Functions:**
- camelCase: `parseManifestData()`, `detectRetailerFromUrl()`, `createZipFromManifests()`

**Classes:**
- PascalCase: `ManifestDetector`, `RetailerRegistry`

**Interfaces/Types:**
- PascalCase: `ManifestItem`, `RetailerModule`, `ExtensionMessage`
- Constants: UPPER_SNAKE_CASE: `SUB_RETAILERS`, `POST_LOAD_DELAY_MS`

**Variables:**
- camelCase: `state`, `elements`, `retailer`

## Where to Add New Code

**New Retailer Site:**
1. Implementation: `src/retailers/sites/[retailer-name].ts`
   - Implement `RetailerModule` interface with URL patterns, strategies, metadata extraction, manifest download
2. Export: Add to `src/retailers/index.ts` exports and auto-registration
3. Manifest: Add host permissions for new domain in `manifest.json`
4. Content Script: Add entry in `manifest.json` content_scripts if needed (for ISOLATED world access)

**New Data Source Type (beyond CSV/XLSX):**
1. Reader: `src/parsers/[format]-reader.ts` (export async function `read[Format](input)`)
2. Integration: Update `src/background/service-worker.ts` to detect and handle new format

**New Parsing Rule (for specific retailer):**
1. Field Mapping: `src/parsers/[retailer]-parser.ts` (export `get[Retailer]FieldMapping()`)
2. Registration: Add switch case to `base-parser.ts` `getFieldMapping()`

**Utility Function (file operations, exports):**
1. Implementation: `src/utils/[purpose].ts`
2. Exports: Use named exports, type all parameters/returns

**Testing:**
- Place test file alongside source in `tests/` mirror directory
- Naming: `[module-name].test.ts`
- Use `describe()`, `it()`, `expect()` from vitest (globals enabled)

## Special Directories

**`csvs/`:**
- Purpose: Output directory for downloaded ZIP files
- Generated: Yes (by user browser download)
- Committed: No (.gitignored)

**`dist/`:**
- Purpose: Built extension artifacts
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignored)

**`.planning/`:**
- Purpose: GSD planning and analysis documents
- Generated: Yes (by GSD tools)
- Committed: Yes (tracked in git)

**`extension/`:**
- Purpose: Extension distribution (Chrome Web Store, packaged zips)
- Generated: Yes (from dist/)
- Committed: Yes (for releases)

**`icons/`:**
- Purpose: Extension icon assets
- Files: PNG images for different sizes
- Used in: `manifest.json` for extension display

---

*Structure analysis: 2026-01-27*
