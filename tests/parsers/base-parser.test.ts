import { describe, it, expect } from 'vitest'
import { parseManifestData } from '../../src/parsers/base-parser'

describe('parseManifestData', () => {
  it('should parse basic CSV data with standard headers', () => {
    const rawData = [
      { upc: '123456789012', 'product name': 'Test Product', 'unit retail': '29.99', quantity: '5' },
      { upc: '987654321098', 'product name': 'Another Product', 'unit retail': '49.99', quantity: '3' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      upc: '123456789012',
      productName: 'Test Product',
      unitRetail: 29.99,
      quantity: 5,
      sourceSite: 'test',
      originalFilename: 'test.csv',
    })
  })

  it('should handle alternate header names', () => {
    const rawData = [
      { 'item #': 'ABC123', description: 'Widget', msrp: '$15.00', qty: '10' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result).toHaveLength(1)
    expect(result[0].upc).toBe('ABC123')
    expect(result[0].productName).toBe('Widget')
    expect(result[0].unitRetail).toBe(15)
    expect(result[0].quantity).toBe(10)
  })

  it('should handle currency formatting in prices', () => {
    const rawData = [
      { upc: '111', name: 'Product', retail: '$1,299.99', quantity: '1' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result[0].unitRetail).toBe(1299.99)
  })

  it('should skip rows without UPC or product name', () => {
    const rawData = [
      { upc: '', 'product name': '', 'unit retail': '10.00', quantity: '1' },
      { upc: '123', 'product name': 'Valid Product', 'unit retail': '10.00', quantity: '1' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result).toHaveLength(1)
    expect(result[0].productName).toBe('Valid Product')
  })

  it('should default quantity to 1 if not specified', () => {
    const rawData = [
      { upc: '123', name: 'Product', price: '10.00' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result[0].quantity).toBe(1)
  })

  it('should handle empty data array', () => {
    const result = parseManifestData([], 'test', 'test.csv')
    expect(result).toHaveLength(0)
  })

  it('should handle numeric values in fields', () => {
    const rawData = [
      { upc: 123456789012, name: 'Product', retail: 29.99, quantity: 5 },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result[0].upc).toBe('123456789012')
    expect(result[0].unitRetail).toBe(29.99)
    expect(result[0].quantity).toBe(5)
  })

  it('should round fractional quantities', () => {
    const rawData = [
      { upc: '123', name: 'Product', price: '10.00', quantity: '2.7' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result[0].quantity).toBe(3)
  })

  it('should include parsed date timestamp', () => {
    const rawData = [
      { upc: '123', name: 'Product', price: '10.00', quantity: '1' },
    ]

    const result = parseManifestData(rawData, 'test', 'test.csv')

    expect(result[0].parsedDate).toBeDefined()
    expect(() => new Date(result[0].parsedDate)).not.toThrow()
  })
})
