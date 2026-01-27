import { parseManifestData } from '../../src/parsers/base-parser'
import { readXlsx } from '../../src/parsers/xlsx-reader'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

describe('Retailer Parsing Integration', () => {
  // Helper to load CSV files
  const loadCsv = (filename: string): Record<string, unknown>[] => {
    const content = fs.readFileSync(path.join(__dirname, '../../csvs', filename), 'utf-8')
    return parse(content, { columns: true, skip_empty_lines: true }) as Record<string, unknown>[]
  }

  // Helper to load CSV files with relaxed quote handling (for malformed CSVs like AMZD)
  const loadCsvRelaxed = (filename: string): Record<string, unknown>[] => {
    const content = fs.readFileSync(path.join(__dirname, '../../csvs', filename), 'utf-8')
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, unknown>[]
  }

  // Helper to load XLSX files (for TL retailer)
  const loadXlsx = async (filename: string) => {
    const buffer = fs.readFileSync(path.join(__dirname, '../../csvs', filename))
    return readXlsx(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  }

  test('ACE manifest extracts UPC as item_number', () => {
    const data = loadCsv('ACE_Outdoor-Living-LN-1100.csv')
    const items = parseManifestData(data, 'ace', 'test.csv')
    expect(items[0].upc).toBe('50904007018')
    expect(items[0].productName).toContain('SS BAYOU FRYER')
  })

  test('AMZ manifest extracts ASIN as item_number', () => {
    const data = loadCsv('AMZ_Home-Goods-UG-1108.csv')
    const items = parseManifestData(data, 'amz', 'test.csv')
    expect(items[0].upc).toBe('B0DSKC7QT7')
    expect(items[0].productName).toContain('ECOVACS')
  })

  test('ATT manifest with NOT AVAILABLE UPC produces blank', () => {
    const data = loadCsv('ATT_Chargers,-Phone-Grips,-Miscellaneo-LN-1315.csv')
    const items = parseManifestData(data, 'att', 'test.csv')
    // Row with "Not Available" in UPC column should have blank upc
    const itemWithNoUpc = items.find((i) => i.productName.includes('ATC CLK BLOSSOM'))
    expect(itemWithNoUpc?.upc).toBe('')
  })

  test('BY manifest uses Quantity column', () => {
    const data = loadCsv('BY_Alka-Seltzer-Plus-Fizzy-Chews-Orang-NC-1000.csv')
    const items = parseManifestData(data, 'by', 'test.csv')
    expect(items[0].quantity).toBe(3276)
  })

  test('TGT manifest extracts UPC', () => {
    const data = loadCsv('TGT_Furniture-LN-1205.csv')
    const items = parseManifestData(data, 'tgt', 'test.csv')
    expect(items[0].upc).toBe('840307041791')
  })

  test('B-Stock manifest extracts Item #', () => {
    const data = loadCsv('B_Apple-Watches-LN-1101.csv')
    const items = parseManifestData(data, 'bstock', 'test.csv')
    expect(items[0].upc).toBe('1778325')
  })

  test('QVC manifest extracts Item #', () => {
    const data = loadCsv('QVC_Drinks-Tray-NC-1230.csv')
    const items = parseManifestData(data, 'qvc', 'test.csv')
    expect(items[0].upc).toBe('M81102')
  })

  test('RC manifest extracts Item #', () => {
    const data = loadCsv("RC_Men's-2Pk-Knit-Cotton-Boxer-Briefs-NC-1100.csv")
    const items = parseManifestData(data, 'rc', 'test.csv')
    expect(items[0].upc).toBe('TFMW2BX')
  })

  test('JCP manifest extracts Brand', () => {
    const data = loadCsv('JCP_Watches-UG-1205.csv')
    const items = parseManifestData(data, 'jcp', 'test.csv')
    // JCP has no UPC, uses Brand for identification
    expect(items[0].upc).toBe('Invicta')
  })

  test('TL manifest uses Orig. Retail for unit_retail (XLSX format)', async () => {
    // TL manifests are XLSX files, not CSV
    const data = await loadXlsx('TL_Electric-Transportation-Accessories-UR-1139.xlsx')
    const items = parseManifestData(data, 'tl', 'test.xlsx')
    // Verify TL-specific field extraction:
    // - Uses 'Orig. Retail' column for unit_retail (not 'Unit Retail')
    // - Uses 'Product Name' for productName
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].unitRetail).toBeGreaterThan(0)
    expect(items[0].productName).toBeTruthy()
  })

  describe('AMZD (Amazon Direct)', () => {
    // AMZD CSVs have malformed quotes - titles contain unquoted commas
    // Use relaxed parsing to load the data
    test('should parse AMZD manifest with correct field mappings', () => {
      const data = loadCsvRelaxed('AMZD_161-Units-Pc-Electronics-Wireless-RD.csv')
      const items = parseManifestData(data, 'amzd', 'amzd-test.csv')

      // Should have items
      expect(items.length).toBeGreaterThan(0)

      // First item should have ASIN as item_number (upc field)
      const firstItem = items[0]
      expect(firstItem.upc).toBe('B083WFQC1C')

      // Product name from Item Title
      expect(firstItem.productName).toContain('GIGABYTE X870E AORUS')

      // unit_retail should be Lot item price * 4.5
      // First row: $188.00 * 4.5 = $846.00
      expect(firstItem.unitRetail).toBe(846)

      // Quantity
      expect(firstItem.quantity).toBe(1)
    })

    test('should calculate unit_retail correctly with 4.5 multiplier', () => {
      const data = loadCsvRelaxed('AMZD_161-Units-Pc-Electronics-Wireless-RD.csv')
      const items = parseManifestData(data, 'amzd', 'amzd-test.csv')

      // Find Apple Pencil row (6 qty at $17.75)
      // $17.75 * 4.5 = $79.875 -> rounded to $79.88
      const applePencil = items.find((i) => i.upc === 'B0CL7J12YK')
      expect(applePencil).toBeDefined()
      expect(applePencil!.unitRetail).toBeCloseTo(79.88, 2)
      expect(applePencil!.quantity).toBe(6)
    })
  })
})
