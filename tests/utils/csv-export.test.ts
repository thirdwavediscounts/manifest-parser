import { describe, it, expect } from 'vitest'
import { generateCsvContent, generateExportSummary } from '../../src/utils/csv-export'
import type { ManifestItem } from '../../src/parsers/types'

describe('generateCsvContent', () => {
  const sampleItems: ManifestItem[] = [
    {
      upc: '123456789012',
      productName: 'Test Product',
      unitRetail: 29.99,
      quantity: 5,
      sourceSite: 'test',
      originalFilename: 'test.csv',
      parsedDate: '2024-01-15T10:00:00.000Z',
    },
    {
      upc: '987654321098',
      productName: 'Another Product',
      unitRetail: 49.99,
      quantity: 3,
      sourceSite: 'test',
      originalFilename: 'test.csv',
      parsedDate: '2024-01-15T10:00:00.000Z',
    },
  ]

  it('should generate CSV with headers by default', () => {
    const csv = generateCsvContent(sampleItems)

    const lines = csv.split('\n')
    expect(lines[0]).toBe('upc,product_name,unit_retail,quantity,source_site,original_filename,parsed_date')
    expect(lines.length).toBe(3) // header + 2 data rows
  })

  it('should generate CSV without headers when option is set', () => {
    const csv = generateCsvContent(sampleItems, { includeHeaders: false })

    const lines = csv.split('\n')
    expect(lines.length).toBe(2) // 2 data rows only
    expect(lines[0]).toContain('123456789012')
  })

  it('should format retail prices with 2 decimal places', () => {
    const csv = generateCsvContent(sampleItems)

    expect(csv).toContain('29.99')
    expect(csv).toContain('49.99')
  })

  it('should escape fields containing commas', () => {
    const itemsWithCommas: ManifestItem[] = [
      {
        upc: '123',
        productName: 'Product, with comma',
        unitRetail: 10,
        quantity: 1,
        sourceSite: 'test',
        originalFilename: 'test.csv',
        parsedDate: '2024-01-15',
      },
    ]

    const csv = generateCsvContent(itemsWithCommas)

    expect(csv).toContain('"Product, with comma"')
  })

  it('should escape fields containing quotes', () => {
    const itemsWithQuotes: ManifestItem[] = [
      {
        upc: '123',
        productName: 'Product "Special"',
        unitRetail: 10,
        quantity: 1,
        sourceSite: 'test',
        originalFilename: 'test.csv',
        parsedDate: '2024-01-15',
      },
    ]

    const csv = generateCsvContent(itemsWithQuotes)

    expect(csv).toContain('"Product ""Special"""')
  })

  it('should use custom delimiter when specified', () => {
    const csv = generateCsvContent(sampleItems, { delimiter: ';' })

    expect(csv).toContain(';')
    expect(csv.split('\n')[0]).toBe('upc;product_name;unit_retail;quantity;source_site;original_filename;parsed_date')
  })
})

describe('generateExportSummary', () => {
  const sampleItems: ManifestItem[] = [
    {
      upc: '123',
      productName: 'Product A',
      unitRetail: 10,
      quantity: 5,
      sourceSite: 'bstock',
      originalFilename: 'file1.csv',
      parsedDate: '2024-01-15',
    },
    {
      upc: '456',
      productName: 'Product B',
      unitRetail: 20,
      quantity: 3,
      sourceSite: 'techliquidators',
      originalFilename: 'file2.csv',
      parsedDate: '2024-01-15',
    },
    {
      upc: '789',
      productName: 'Product C',
      unitRetail: 15,
      quantity: 2,
      sourceSite: 'bstock',
      originalFilename: 'file1.csv',
      parsedDate: '2024-01-15',
    },
  ]

  it('should calculate total items correctly', () => {
    const summary = generateExportSummary(sampleItems)
    expect(summary.totalItems).toBe(3)
  })

  it('should calculate total quantity correctly', () => {
    const summary = generateExportSummary(sampleItems)
    expect(summary.totalQuantity).toBe(10) // 5 + 3 + 2
  })

  it('should calculate total retail value correctly', () => {
    const summary = generateExportSummary(sampleItems)
    // (10 * 5) + (20 * 3) + (15 * 2) = 50 + 60 + 30 = 140
    expect(summary.totalRetailValue).toBe(140)
  })

  it('should track unique sites', () => {
    const summary = generateExportSummary(sampleItems)
    expect(summary.uniqueSites).toHaveLength(2)
    expect(summary.uniqueSites).toContain('bstock')
    expect(summary.uniqueSites).toContain('techliquidators')
  })

  it('should track unique files', () => {
    const summary = generateExportSummary(sampleItems)
    expect(summary.uniqueFiles).toHaveLength(2)
    expect(summary.uniqueFiles).toContain('file1.csv')
    expect(summary.uniqueFiles).toContain('file2.csv')
  })

  it('should handle empty array', () => {
    const summary = generateExportSummary([])

    expect(summary.totalItems).toBe(0)
    expect(summary.totalQuantity).toBe(0)
    expect(summary.totalRetailValue).toBe(0)
    expect(summary.uniqueSites).toHaveLength(0)
    expect(summary.uniqueFiles).toHaveLength(0)
  })
})
