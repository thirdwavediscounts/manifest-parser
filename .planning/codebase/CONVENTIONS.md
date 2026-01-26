# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Kebab-case with meaningful descriptors: `csv-reader.ts`, `base-parser.ts`, `service-worker.ts`
- Selector-specific files: `popup.ts`, `detector.ts`
- Retailer sites grouped: `src/retailers/sites/amazon.ts`, `src/retailers/sites/bstock.ts`
- Test files mirror source structure: `tests/parsers/base-parser.test.ts`

**Functions:**
- Descriptive camelCase: `parseManifestData()`, `readCsvWithDelimiterDetection()`, `extractMetadata()`
- Handler functions prefixed with `handle`: `handleSignIn()`, `handleProcess()`, `handleFileSelect()`
- Helper/utility functions start with verb: `extractString()`, `formatRetailerDisplay()`, `getSiteFromUrl()`
- Internal/private functions documented with JSDoc: function documentation above declaration

**Variables:**
- camelCase for all variables: `rawData`, `unitRetail`, `parseResult`, `processingProgress`
- Constants in SCREAMING_SNAKE_CASE: `POST_LOAD_DELAY_MS`, `TAB_LOAD_TIMEOUT_MS`, `DOWNLOAD_TIMEOUT_MS`
- Object/interface instances in camelCase: `state`, `elements`, `columnMap`
- Boolean variables with `is` prefix: `isProcessing`, `isAuthenticated`, `isCancelled`

**Types:**
- PascalCase for interfaces and types: `ManifestItem`, `FieldMapping`, `ParseResult`, `ExtensionMessage`
- Union types use discriminant pattern: `MessageType` enum values use SCREAMING_SNAKE_CASE
- Type imports use `type` keyword: `import type { ManifestItem }`

## Code Style

**Formatting:**
- No explicit linter config found; code follows implicit standards
- Consistent spacing: 2-space indentation
- String quotes: Single quotes preferred in most cases
- Line length: Generally kept under 100 characters

**Linting:**
- TypeScript strict mode enabled: `"strict": true` in tsconfig.json
- Unused locals/parameters detected: `"noUnusedLocals": true`, `"noUnusedParameters": true`
- Fallthrough cases blocked: `"noFallthroughCasesInSwitch": true`
- No console linter enforced (console.log/error/warn used throughout)

## Import Organization

**Order:**
1. External packages: `import Papa from 'papaparse'`
2. Internal types: `import type { ManifestItem, FieldMapping } from './types'`
3. Internal modules: `import { parseManifestData } from '../parsers/base-parser'`
4. Chrome APIs: `chrome.runtime`, `chrome.tabs`, `chrome.storage`

**Path Aliases:**
- `@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts)
- Used in imports: `import { readCsv } from '@/parsers/csv-reader'`
- Barrel files export grouped functionality: `src/retailers/index.ts` exports all retailers and utilities

## Error Handling

**Patterns:**
- Try-catch blocks wrap risky operations: file parsing, network requests, DOM manipulation
- Error messages include context: `throw new Error(\`CSV parse error: ${criticalErrors[0].message}\`)`
- Async functions use catch blocks in Promise chains: `catch: (error) => reject(...)`
- Error instanceof checks used for detailed handling: `error instanceof Error ? error.message : 'Unknown error'`

**Example pattern** from `src/parsers/csv-reader.ts`:
```typescript
return new Promise((resolve, reject) => {
  Papa.parse(csvText, {
    complete: (results) => {
      if (results.errors.length > 0) {
        const criticalErrors = results.errors.filter(...)
        if (criticalErrors.length > 0 && results.data.length === 0) {
          reject(new Error(`CSV parse error: ${criticalErrors[0].message}`))
          return
        }
      }
      resolve(results.data)
    },
    error: (error: Error) => {
      reject(new Error(`CSV parse error: ${error.message}`))
    },
  })
})
```

## Logging

**Framework:** Console API with context prefixes

**Patterns:**
- Contextual prefixes for extension modules: `[ManifestParser]`, `[Amazon]`, `[ManifestParser:SW]` (service worker)
- Debug-level logs for normal operation: `console.log('[ManifestParser] Executing download...')`
- Error logs for failures: `console.error('[ManifestParser] Failed to extract metadata:', error)`
- Warnings for non-fatal issues: `console.warn('[RetailerRegistry] Overwriting existing retailer')`

**Where used:**
- `src/popup/popup.ts`: Logs all UI interactions and async operations
- `src/background/service-worker.ts`: Logs message handling, parsing progress
- `src/retailers/sites/*.ts`: Logs extraction and download operations
- `src/parsers/`: Error logs only for failures

## Comments

**When to Comment:**
- Complex algorithms explained with block comments: Manifest parsing field mapping logic
- JSDoc comments for exported functions and types
- Inline comments for non-obvious intent: "Direct file downloads don't need tab processing"

**JSDoc/TSDoc:**
- All exported functions documented: `@param`, `@returns`
- Type definitions documented: Purpose of interface fields
- Special behaviors noted: "Runs in ISOLATED world", "Runs in MAIN world"

**Example** from `src/retailers/sites/amazon.ts`:
```typescript
/**
 * Extract metadata from Amazon page
 * Runs in ISOLATED world
 */
extractMetadata: function () { ... }

/**
 * Download manifest from Amazon
 * Uses blob interception - "Download CSV" link has href="#" and triggers JS
 * Runs in MAIN world
 */
downloadManifest: function () { ... }
```

## Function Design

**Size:**
- Most functions 30-50 lines
- Large functions broken into smaller helpers
- Example: `popup.ts` `handleProcess()` is 180 lines but broken into logical sections with clear comments

**Parameters:**
- Typed parameters with interfaces when multiple related values passed
- Example from `src/parsers/base-parser.ts`:
```typescript
function parseRow(
  row: RawRow,
  columnMap: Record<keyof FieldMapping, string | null>,
  site: string,
  filename: string,
  parsedDate: string
): ManifestItem | null { ... }
```

**Return Values:**
- Functions return immutable objects: `{ ...item, selected: target.checked }`
- Nullable returns documented: `ManifestItem | null` when validation fails
- Promise returns used for async operations: `Promise<ManifestItem[]>`
- No implicit undefined returns; explicit `null` for missing values

## Module Design

**Exports:**
- Named exports for functions and types: `export function parseManifestData()`
- Type exports use `export type`: `export type MessageType = ...`
- Barrel files (`index.ts`) aggregate and re-export: `src/retailers/index.ts` exports registry + utilities

**Barrel Files:**
- `src/retailers/index.ts`: Aggregates retailer modules, auto-registers, provides display utilities
- `src/parsers/`: No barrel file; direct imports used
- Encourages centralized registration and dependency injection

**Example structure** from `src/retailers/index.ts`:
```typescript
// Types
export type { ... } from './types'
// Registry
export { retailerRegistry } from './registry'
// Individual retailers
export { bstockRetailer, ... } from './sites/bstock'
// Auto-registration (side effect on import)
retailerRegistry.register(bstockAuctionRetailer)
// Utility functions
export function formatRetailerDisplay(retailer: string): string { ... }
```

## State Management

**Pattern:** Object-based state with mutation through reassignment

**Example** from `src/popup/popup.ts`:
```typescript
const state: PopupState = {
  isSignedIn: false,
  urls: [],
  uploadedFiles: [],
  results: { files: 0, items: 0, retailValue: 0 },
}

// Mutation through reassignment
state.urls = state.urls.map((item, i) =>
  i === index ? { ...item, selected: target.checked } : item
)

// Persistence via chrome.storage
await chrome.storage.local.set({ popupState: persistableState })
```

## Type Patterns

**Discriminated Unions for Message Types:**
```typescript
export type MessageType =
  | 'DETECT_MANIFESTS'
  | 'MANIFESTS_DETECTED'
  | 'DOWNLOAD_MANIFEST'
  | 'PARSE_FILE'
  | 'ERROR'

export interface ExtensionMessage<T = unknown> {
  type: MessageType
  payload?: T
  error?: string
}
```

**Generic Interfaces for Flexibility:**
```typescript
export interface ParseResult {
  success: boolean
  items: ManifestItem[]
  errors: ParseError[]
  stats: ParseStats
}
```

**Read-only Configuration Objects:**
```typescript
export const amazonRetailer: RetailerModule = {
  id: 'amazon',
  displayName: 'Amazon',
  urlPatterns: [/amazon\.com/i],
  downloadStrategy: 'blob-intercept',
}
```

## Immutability Patterns

**Spread operator for updates:**
```typescript
// From popup.ts
state.urls = state.urls.map((item) =>
  item.url === urlItem.url ? { ...item, retailer } : item
)
```

**Array copying:**
```typescript
// From retailers/registry.ts
getAllRetailers(): RetailerModule[] {
  return Array.from(this.retailers.values())
}
```

---

*Convention analysis: 2026-01-27*
