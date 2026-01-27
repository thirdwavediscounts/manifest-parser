import { describe, it, expect } from 'vitest'
import { transformToUnified, generateUnifiedCsv } from '../../src/unified/transform'
import type { ManifestItem } from '../../src/parsers/types'
import type { AuctionMetadata, UnifiedManifestRow } from '../../src/unified/types'

describe('transformToUnified', () => {
  const defaultMetadata: AuctionMetadata = {
    auctionUrl: 'https://example.com/auction/123',
    bidPrice: 150.00,
    shippingFee: 25.00,
  }

  const createManifestItem = (overrides: Partial<ManifestItem> = {}): ManifestItem => ({
    upc: '123456789012',
    productName: 'Test Product',
    unitRetail: 29.99,
    quantity: 5,
    sourceSite: 'bstock',
    originalFilename: 'test.csv',
    parsedDate: '2026-01-27',
    ...overrides,
  })

  it('should return empty array for empty items', () => {
    const result = transformToUnified([], defaultMetadata)
    expect(result).toEqual([])
  })

  it('should map upc to item_number', () => {
    const items = [createManifestItem({ upc: 'ABC-123-XYZ' })]
    const result = transformToUnified(items, defaultMetadata)
    expect(result[0].item_number).toBe('ABC-123-XYZ')
  })

  it('should map productName to product_name', () => {
    const items = [createManifestItem({ productName: 'My Special Product' })]
    const result = transformToUnified(items, defaultMetadata)
    expect(result[0].product_name).toBe('My Special Product')
  })

  it('should map unitRetail to unit_retail', () => {
    const items = [createManifestItem({ unitRetail: 45.67 })]
    const result = transformToUnified(items, defaultMetadata)
    expect(result[0].unit_retail).toBe(45.67)
  })

  it('should round quantity to nearest integer', () => {
    const items = [createManifestItem({ quantity: 2.5 })]
    const result = transformToUnified(items, defaultMetadata)
    expect(result[0].qty).toBe(3)
  })

  it('should round down quantity when below .5', () => {
    const items = [createManifestItem({ quantity: 2.4 })]
    const result = transformToUnified(items, defaultMetadata)
    expect(result[0].qty).toBe(2)
  })

  it('should include metadata only on first row', () => {
    const items = [
      createManifestItem({ upc: '111' }),
      createManifestItem({ upc: '222' }),
      createManifestItem({ upc: '333' }),
    ]
    const result = transformToUnified(items, defaultMetadata)

    // First row has metadata
    expect(result[0].auction_url).toBe('https://example.com/auction/123')
    expect(result[0].bid_price).toBe('150')
    expect(result[0].shipping_fee).toBe('25')

    // Subsequent rows have empty metadata
    expect(result[1].auction_url).toBe('')
    expect(result[1].bid_price).toBe('')
    expect(result[1].shipping_fee).toBe('')

    expect(result[2].auction_url).toBe('')
    expect(result[2].bid_price).toBe('')
    expect(result[2].shipping_fee).toBe('')
  })

  it('should handle null metadata values', () => {
    const metadata: AuctionMetadata = {
      auctionUrl: '',
      bidPrice: null,
      shippingFee: null,
    }
    const items = [createManifestItem()]
    const result = transformToUnified(items, metadata)

    expect(result[0].auction_url).toBe('')
    expect(result[0].bid_price).toBe('')
    expect(result[0].shipping_fee).toBe('')
  })

  it('should transform multiple items correctly', () => {
    const items = [
      createManifestItem({ upc: '111', productName: 'Product A', unitRetail: 10.00, quantity: 2 }),
      createManifestItem({ upc: '222', productName: 'Product B', unitRetail: 20.50, quantity: 3 }),
    ]
    const result = transformToUnified(items, defaultMetadata)

    expect(result).toHaveLength(2)
    expect(result[0].item_number).toBe('111')
    expect(result[0].product_name).toBe('Product A')
    expect(result[1].item_number).toBe('222')
    expect(result[1].product_name).toBe('Product B')
  })
})

describe('generateUnifiedCsv', () => {
  const defaultMetadata: AuctionMetadata = {
    auctionUrl: 'https://example.com/auction/123',
    bidPrice: 150.00,
    shippingFee: 25.00,
  }

  const createRow = (overrides: Partial<UnifiedManifestRow> = {}): UnifiedManifestRow => ({
    item_number: '123456789012',
    product_name: 'Test Product',
    qty: 5,
    unit_retail: 29.99,
    auction_url: '',
    bid_price: '',
    shipping_fee: '',
    ...overrides,
  })

  it('should return header row for empty rows array', () => {
    const result = generateUnifiedCsv([], defaultMetadata)
    // Remove BOM for testing
    const withoutBom = result.replace(/^\ufeff/, '')
    expect(withoutBom).toBe('item_number,product_name,qty,unit_retail,auction_url,bid_price,shipping_fee')
  })

  it('should have exactly 7 columns in header', () => {
    const result = generateUnifiedCsv([], defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const headers = withoutBom.split('\n')[0].split(',')
    expect(headers).toHaveLength(7)
    expect(headers).toEqual([
      'item_number',
      'product_name',
      'qty',
      'unit_retail',
      'auction_url',
      'bid_price',
      'shipping_fee',
    ])
  })

  it('should format price with decimals when needed (29.99)', () => {
    const rows = [createRow({ unit_retail: 29.99 })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const dataRow = withoutBom.split('\n')[1]
    expect(dataRow).toContain('29.99')
  })

  it('should format whole prices without trailing zeros (29.00 -> 29)', () => {
    const rows = [createRow({ unit_retail: 29.00 })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const dataRow = withoutBom.split('\n')[1]
    // Should contain "29," not "29.00,"
    expect(dataRow).toMatch(/,29,/)
    expect(dataRow).not.toMatch(/,29\.00,/)
  })

  it('should format price with single decimal (29.50 -> 29.5)', () => {
    const rows = [createRow({ unit_retail: 29.50 })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const dataRow = withoutBom.split('\n')[1]
    expect(dataRow).toMatch(/,29\.5,/)
    expect(dataRow).not.toMatch(/,29\.50,/)
  })

  it('should quote fields containing commas', () => {
    const rows = [createRow({ product_name: 'Product, with comma' })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    expect(withoutBom).toContain('"Product, with comma"')
  })

  it('should quote fields containing double quotes and escape them', () => {
    const rows = [createRow({ product_name: 'Product "Special" Edition' })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    expect(withoutBom).toContain('"Product ""Special"" Edition"')
  })

  it('should quote fields containing newlines', () => {
    const rows = [createRow({ product_name: 'Product\nWith Newline' })]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    expect(withoutBom).toContain('"Product\nWith Newline"')
  })

  it('should include UTF-8 BOM at start', () => {
    const result = generateUnifiedCsv([], defaultMetadata)
    expect(result.charCodeAt(0)).toBe(0xfeff)
  })

  it('should generate correct CSV with metadata on first row only', () => {
    const rows = [
      createRow({ item_number: '111', auction_url: 'https://example.com', bid_price: '100', shipping_fee: '20' }),
      createRow({ item_number: '222', auction_url: '', bid_price: '', shipping_fee: '' }),
    ]
    const result = generateUnifiedCsv(rows, defaultMetadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const lines = withoutBom.split('\n')

    expect(lines).toHaveLength(3) // header + 2 data rows
    expect(lines[1]).toContain('https://example.com')
    expect(lines[1]).toContain('100')
    expect(lines[1]).toContain('20')
    // Second data row should have empty metadata columns at the end
    expect(lines[2]).toMatch(/,,,\s*$/)
  })

  it('should handle empty metadata gracefully', () => {
    const metadata: AuctionMetadata = {
      auctionUrl: '',
      bidPrice: null,
      shippingFee: null,
    }
    const rows = [createRow({ auction_url: '', bid_price: '', shipping_fee: '' })]
    const result = generateUnifiedCsv(rows, metadata)
    const withoutBom = result.replace(/^\ufeff/, '')
    const dataRow = withoutBom.split('\n')[1]
    // Should end with three empty columns
    expect(dataRow).toMatch(/,,,\s*$/)
  })
})

describe('integration: transformToUnified + generateUnifiedCsv', () => {
  it('should produce valid CSV from ManifestItems', () => {
    const items: ManifestItem[] = [
      {
        upc: '123456789012',
        productName: 'Widget',
        unitRetail: 29.99,
        quantity: 5,
        sourceSite: 'bstock',
        originalFilename: 'test.csv',
        parsedDate: '2026-01-27',
      },
      {
        upc: '987654321098',
        productName: 'Gadget, Deluxe',
        unitRetail: 49.00,
        quantity: 3,
        sourceSite: 'bstock',
        originalFilename: 'test.csv',
        parsedDate: '2026-01-27',
      },
    ]
    const metadata: AuctionMetadata = {
      auctionUrl: 'https://example.com/auction/456',
      bidPrice: 200.50,
      shippingFee: 30.00,
    }

    const rows = transformToUnified(items, metadata)
    const csv = generateUnifiedCsv(rows, metadata)
    const withoutBom = csv.replace(/^\ufeff/, '')
    const lines = withoutBom.split('\n')

    expect(lines).toHaveLength(3) // header + 2 rows

    // Verify header
    expect(lines[0]).toBe('item_number,product_name,qty,unit_retail,auction_url,bid_price,shipping_fee')

    // Verify first row has metadata (note: Gadget Deluxe is quoted due to comma)
    expect(lines[1]).toContain('123456789012')
    expect(lines[1]).toContain('Widget')
    expect(lines[1]).toContain('29.99')
    expect(lines[1]).toContain('https://example.com/auction/456')
    expect(lines[1]).toContain('200.5') // No trailing zero
    expect(lines[1]).toContain('30') // No trailing zeros

    // Verify second row has no metadata
    expect(lines[2]).toContain('987654321098')
    expect(lines[2]).toContain('"Gadget, Deluxe"') // Quoted due to comma
    expect(lines[2]).toContain('49') // No trailing zeros
    expect(lines[2]).toMatch(/,,,\s*$/) // Empty metadata columns
  })
})
