# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- Vitest 1.2.2 (configured in `vitest.config.ts`)
- Config: `vitest.config.ts` at project root

**Assertion Library:**
- Vitest built-in assertions: `expect()` API
- Common matchers: `toHaveLength()`, `toEqual()`, `toMatchObject()`, `toBe()`, `toContain()`

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch   # Watch mode with file monitoring
# Coverage command not explicitly defined but configured in vitest.config.ts
```

## Test File Organization

**Location:**
- Co-located with source but in separate `tests/` directory
- Path structure mirrors src: `src/parsers/base-parser.ts` → `tests/parsers/base-parser.test.ts`

**Naming:**
- `.test.ts` suffix for all test files
- Test files grouped by module: `tests/parsers/`, `tests/utils/`

**Structure:**
```
tests/
├── parsers/
│   ├── base-parser.test.ts
│   ├── bstock-parser.test.ts
│   ├── csv-reader.test.ts
│   └── techliquidators-parser.test.ts
└── utils/
    └── csv-export.test.ts
```

## Test Structure

**Suite Organization:**

From `tests/parsers/base-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseManifestData } from '../../src/parsers/base-parser'

describe('parseManifestData', () => {
  it('should parse basic CSV data with standard headers', () => {
    const rawData = [
      { upc: '123456789012', 'product name': 'Test Product', ... }
    ]
    const result = parseManifestData(rawData, 'test', 'test.csv')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      upc: '123456789012',
      productName: 'Test Product',
      ...
    })
  })

  it('should handle alternate header names', () => { ... })
})
```

**Patterns:**
- Single `describe()` block per function being tested
- Each `it()` tests one specific behavior
- No setup/teardown hooks used (no beforeEach, afterEach)
- Tests are independent and can run in any order

## Test Structure Details

**Naming Convention:**
- Test descriptions use "should..." pattern: "should parse basic CSV data", "should handle alternate header names"
- Descriptive enough to understand failure: "should round fractional quantities"

**Arrangement:**
- Arrange: Set up test data (rawData, input)
- Act: Call the function being tested
- Assert: Verify results with expect()

**Example from csv-reader.test.ts**:
```typescript
it('should handle quoted fields with commas', async () => {
  // Arrange
  const csv = `name,description,price
"Widget","A small, useful item",10.00`

  // Act
  const result = await readCsv(csv)

  // Assert
  expect(result[0].description).toBe('A small, useful item')
})
```

## Mocking

**Framework:**
- Vitest mock functions (no explicit mock library imported)
- Functions mocked inline with test data

**Patterns:**

From `tests/parsers/csv-reader.test.ts` - PapaParse integration testing without mocking:
```typescript
it('should parse simple CSV with headers', async () => {
  const csv = `name,price,quantity
Product A,10.00,5
Product B,20.00,3`

  const result = await readCsv(csv)
  expect(result).toHaveLength(2)
  expect(result[0]).toEqual({
    name: 'Product A',
    price: '10.00',
    quantity: '5',
  })
})
```

**What to Mock:**
- Not mocked: File parsers (PapaParse, XLSX libraries) - integration tested with real data
- Not mocked: Type definitions and utilities - tested through their usage

**What NOT to Mock:**
- External library parsing (CSV, XLSX) - test actual parsing behavior
- Data transformation functions - test actual transformations
- Helper utilities - test in context

## Fixtures and Factories

**Test Data:**
- Inline test data defined in each test
- No separate fixtures directory

**Example from base-parser.test.ts**:
```typescript
const rawData = [
  { upc: '123456789012', 'product name': 'Test Product', 'unit retail': '29.99', quantity: '5' },
  { upc: '987654321098', 'product name': 'Another Product', 'unit retail': '49.99', quantity: '3' },
]
```

**Test Data Variations:**
- Standard case: `{ upc: '123', name: 'Product', price: '10.00', quantity: '1' }`
- Edge case (empty): `{ upc: '', 'product name': '', 'unit retail': '10.00' }`
- Type variation (numeric): `{ upc: 123456789012, name: 'Product', retail: 29.99, quantity: 5 }`
- Formatting case: `{ upc: '111', name: 'Product', retail: '$1,299.99', quantity: '1' }`

**Location:**
- Test data defined directly in test file at top of `it()` block
- No separate factory functions or fixtures
- Promotes test clarity and independence

## Coverage

**Requirements:**
- Coverage excluded: `src/content/**/*.ts` (extension content scripts)
- Coverage excluded: `src/**/*.d.ts` (type definitions)
- Provider: V8

**View Coverage:**
```bash
npm test  # Generates coverage in html format (as per vitest.config.ts)
# Coverage files located in coverage/ directory (not committed)
```

**Configuration** from `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.d.ts', 'src/content/**/*.ts'],
}
```

## Test Types

**Unit Tests:**
- Function-level testing: `parseManifestData()`, `readCsv()`, `readCsvWithDelimiterDetection()`
- Test input validation and transformation
- Test error handling with different input types
- Test edge cases: empty data, malformed data, type coercion

**Example scope** from `base-parser.test.ts`:
```typescript
describe('parseManifestData', () => {
  // Valid data parsing
  it('should parse basic CSV data with standard headers', () => { ... })
  it('should handle alternate header names', () => { ... })

  // Data transformation
  it('should handle currency formatting in prices', () => { ... })
  it('should round fractional quantities', () => { ... })

  // Edge cases
  it('should skip rows without UPC or product name', () => { ... })
  it('should default quantity to 1 if not specified', () => { ... })
  it('should handle empty data array', () => { ... })
  it('should handle numeric values in fields', () => { ... })
})
```

**Integration Tests:**
- CSV parsing with various delimiters: `readCsv()`, `readCsvWithDelimiterDetection()`
- CSV structure validation: `validateCsvStructure()`
- Tests verify end-to-end behavior with real parsing libraries

**Example** from `csv-reader.test.ts`:
```typescript
describe('readCsvWithDelimiterDetection', () => {
  it('should detect semicolon delimiter', async () => {
    const csv = `name;price;quantity
Product A;10.00;5`
    const result = await readCsvWithDelimiterDetection(csv)
    expect(result[0]).toHaveProperty('name', 'Product A')
  })
})
```

**E2E Tests:**
- Not currently implemented in vitest
- Chrome extension content scripts excluded from test coverage (noted in vitest config)
- Manual testing required for browser interaction scenarios

## Common Patterns

**Async Testing:**
- Async functions wrapped in `it()` with async callback
- Await Promise resolution before assertions

**Example** from `csv-reader.test.ts`:
```typescript
it('should parse simple CSV with headers', async () => {
  const csv = `name,price,quantity
Product A,10.00,5
Product B,20.00,3`

  const result = await readCsv(csv)

  expect(result).toHaveLength(2)
  expect(result[0]).toEqual({
    name: 'Product A',
    price: '10.00',
    quantity: '5',
  })
})
```

**Error Testing:**
- Promise rejection verified with error message checks
- Not explicitly shown in current tests (error handling in success path)

**Type Testing:**
- Type safety validated through TypeScript strict mode
- Test data includes type variations: string vs numeric values
- Assertions verify correct transformation: `expect(result[0].upc).toBe('123456789012')` (string result)

## Test Coverage Analysis

**Currently Tested:**
- `src/parsers/base-parser.ts` - 10 tests for manifest parsing
- `src/parsers/csv-reader.ts` - 10 tests for CSV reading and validation
- `src/parsers/bstock-parser.test.ts` - Parser for B-Stock format (tests exist)
- `src/parsers/techliquidators-parser.test.ts` - Parser for TechLiquidators format (tests exist)
- `src/utils/csv-export.test.ts` - CSV export utilities (tests exist)

**NOT Tested (Notable Gaps):**
- `src/background/service-worker.ts` - Chrome extension message handling
- `src/popup/popup.ts` - UI event handling and state management
- `src/retailers/*` - Retailer modules and registry
- `src/content/*` - Content scripts (excluded by design)
- `src/services/google-sheets.ts` - Google Sheets API integration
- `src/utils/zip-export.ts` - ZIP file creation
- `src/utils/proxy-config.ts` - Proxy configuration

**Risk Areas:**
- Service worker message routing untested
- Popup state management untested
- Retailer detection logic untested
- File download and encoding untested

## Test Isolation

**Pattern:**
- Each test is completely independent
- No shared setup across tests
- No test interdependencies
- Test data defined inline prevents accidental mutation

**Example:**
```typescript
it('should skip rows without UPC or product name', () => {
  const rawData = [ /* test specific data */ ]
  const result = parseManifestData(rawData, 'test', 'test.csv')
  expect(result).toHaveLength(1)
})

it('should handle numeric values in fields', () => {
  const rawData = [ /* different test data */ ]
  const result = parseManifestData(rawData, 'test', 'test.csv')
  expect(result[0].upc).toBe('123456789012')
})
```

## Running Tests

**Single test file:**
```bash
npm test -- tests/parsers/base-parser.test.ts
```

**Watch mode for development:**
```bash
npm run test:watch
```

**Filter tests by name:**
```bash
npm test -- --grep "should parse basic"
```

---

*Testing analysis: 2026-01-27*
