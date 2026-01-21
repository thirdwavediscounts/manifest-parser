import { describe, it, expect } from 'vitest'
import { getTechLiquidatorsFieldMapping, isTechLiquidatorsManifest } from '../../src/parsers/techliquidators-parser'
import { parseManifestData } from '../../src/parsers/base-parser'

describe('getTechLiquidatorsFieldMapping', () => {
  it('should return a valid field mapping', () => {
    const mapping = getTechLiquidatorsFieldMapping()

    expect(mapping.upc).toBeInstanceOf(Array)
    expect(mapping.productName).toBeInstanceOf(Array)
    expect(mapping.unitRetail).toBeInstanceOf(Array)
    expect(mapping.quantity).toBeInstanceOf(Array)

    expect(mapping.upc.length).toBeGreaterThan(0)
    expect(mapping.productName.length).toBeGreaterThan(0)
    expect(mapping.unitRetail.length).toBeGreaterThan(0)
    expect(mapping.quantity.length).toBeGreaterThan(0)
  })

  it('should include common field variations', () => {
    const mapping = getTechLiquidatorsFieldMapping()

    expect(mapping.upc).toContain('upc')
    expect(mapping.upc).toContain('sku')
    expect(mapping.productName).toContain('product name')
    expect(mapping.unitRetail).toContain('retail price')
    expect(mapping.quantity).toContain('quantity')
  })

  it('should include TechLiquidators-specific variations', () => {
    const mapping = getTechLiquidatorsFieldMapping()

    expect(mapping.upc).toContain('inventory id')
    expect(mapping.quantity).toContain('available qty')
    expect(mapping.unitRetail).toContain('market price')
  })
})

describe('isTechLiquidatorsManifest', () => {
  it('should detect tech-related headers', () => {
    const headers = ['Tech Item #', 'Description', 'Price', 'Quantity']
    expect(isTechLiquidatorsManifest(headers)).toBe(true)
  })

  it('should detect inventory-related headers', () => {
    const headers = ['Inventory ID', 'Product Name', 'MSRP', 'Units']
    expect(isTechLiquidatorsManifest(headers)).toBe(true)
  })

  it('should detect stock-related headers', () => {
    const headers = ['UPC', 'Name', 'Price', 'Stock Qty']
    expect(isTechLiquidatorsManifest(headers)).toBe(true)
  })

  it('should not detect generic headers', () => {
    const headers = ['Name', 'Description', 'Price', 'Amount']
    expect(isTechLiquidatorsManifest(headers)).toBe(false)
  })
})

describe('TechLiquidators manifest parsing', () => {
  it('should parse TechLiquidators-style manifest data', () => {
    const rawData = [
      {
        'Inventory ID': 'INV12345',
        'Product Name': 'Laptop Computer',
        'Market Price': '$899.00',
        'Available Qty': '25',
      },
    ]

    const result = parseManifestData(rawData, 'techliquidators', 'tech_manifest.csv')

    expect(result).toHaveLength(1)
    expect(result[0].upc).toBe('INV12345')
    expect(result[0].productName).toBe('Laptop Computer')
    expect(result[0].unitRetail).toBe(899)
    expect(result[0].quantity).toBe(25)
    expect(result[0].sourceSite).toBe('techliquidators')
  })
})
