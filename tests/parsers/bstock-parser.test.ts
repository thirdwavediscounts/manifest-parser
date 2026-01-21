import { describe, it, expect } from 'vitest'
import { getBstockFieldMapping, isBstockManifest } from '../../src/parsers/bstock-parser'
import { parseManifestData } from '../../src/parsers/base-parser'

describe('getBstockFieldMapping', () => {
  it('should return a valid field mapping', () => {
    const mapping = getBstockFieldMapping()

    expect(mapping.upc).toBeInstanceOf(Array)
    expect(mapping.productName).toBeInstanceOf(Array)
    expect(mapping.unitRetail).toBeInstanceOf(Array)
    expect(mapping.quantity).toBeInstanceOf(Array)

    expect(mapping.upc.length).toBeGreaterThan(0)
    expect(mapping.productName.length).toBeGreaterThan(0)
    expect(mapping.unitRetail.length).toBeGreaterThan(0)
    expect(mapping.quantity.length).toBeGreaterThan(0)
  })

  it('should include common Bstock field variations', () => {
    const mapping = getBstockFieldMapping()

    expect(mapping.upc).toContain('upc')
    expect(mapping.upc).toContain('item #')
    expect(mapping.productName).toContain('description')
    expect(mapping.unitRetail).toContain('retail')
    expect(mapping.quantity).toContain('qty')
  })

  it('should include Bstock-specific variations', () => {
    const mapping = getBstockFieldMapping()

    expect(mapping.quantity).toContain('pallet qty')
    expect(mapping.unitRetail).toContain('est retail')
  })
})

describe('isBstockManifest', () => {
  it('should detect Bstock manifest headers', () => {
    const headers = ['Lot Number', 'Item Description', 'Retail Price', 'Quantity']
    expect(isBstockManifest(headers)).toBe(true)
  })

  it('should detect auction-related headers', () => {
    const headers = ['Auction ID', 'Product Name', 'MSRP', 'Units']
    expect(isBstockManifest(headers)).toBe(true)
  })

  it('should detect pallet-related headers', () => {
    const headers = ['Pallet ID', 'Item', 'Price', 'Pallet Qty']
    expect(isBstockManifest(headers)).toBe(true)
  })

  it('should not detect generic headers', () => {
    const headers = ['Name', 'Description', 'Price', 'Quantity']
    expect(isBstockManifest(headers)).toBe(false)
  })
})

describe('Bstock manifest parsing', () => {
  it('should parse Bstock-style manifest data', () => {
    const rawData = [
      {
        'Lot Item #': 'LOT001',
        'Description': 'Electronics Bundle',
        'Est Retail': '$299.99',
        'Pallet Qty': '10',
      },
    ]

    const result = parseManifestData(rawData, 'bstock', 'bstock_manifest.csv')

    expect(result).toHaveLength(1)
    expect(result[0].upc).toBe('LOT001')
    expect(result[0].productName).toBe('Electronics Bundle')
    expect(result[0].unitRetail).toBe(299.99)
    expect(result[0].quantity).toBe(10)
    expect(result[0].sourceSite).toBe('bstock')
  })
})
