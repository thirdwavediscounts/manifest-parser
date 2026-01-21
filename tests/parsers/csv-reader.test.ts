import { describe, it, expect } from 'vitest'
import { readCsv, readCsvWithDelimiterDetection, validateCsvStructure } from '../../src/parsers/csv-reader'

describe('readCsv', () => {
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

  it('should handle quoted fields with commas', async () => {
    const csv = `name,description,price
"Widget","A small, useful item",10.00`

    const result = await readCsv(csv)

    expect(result[0].description).toBe('A small, useful item')
  })

  it('should handle empty lines', async () => {
    const csv = `name,price
Product A,10.00

Product B,20.00`

    const result = await readCsv(csv)

    expect(result).toHaveLength(2)
  })

  it('should trim header and value whitespace', async () => {
    const csv = `  name  ,  price
  Product A  ,  10.00  `

    const result = await readCsv(csv)

    expect(result[0]).toHaveProperty('name', 'Product A')
    expect(result[0]).toHaveProperty('price', '10.00')
  })

  it('should handle windows line endings', async () => {
    const csv = 'name,price\r\nProduct A,10.00\r\nProduct B,20.00'

    const result = await readCsv(csv)

    expect(result).toHaveLength(2)
  })
})

describe('readCsvWithDelimiterDetection', () => {
  it('should detect semicolon delimiter', async () => {
    const csv = `name;price;quantity
Product A;10.00;5`

    const result = await readCsvWithDelimiterDetection(csv)

    expect(result[0]).toHaveProperty('name', 'Product A')
    expect(result[0]).toHaveProperty('price', '10.00')
  })

  it('should detect tab delimiter', async () => {
    const csv = `name\tprice\tquantity
Product A\t10.00\t5`

    const result = await readCsvWithDelimiterDetection(csv)

    expect(result[0]).toHaveProperty('name', 'Product A')
  })
})

describe('validateCsvStructure', () => {
  it('should validate valid CSV data', () => {
    const data = [{ name: 'Product', price: '10.00' }]

    const result = validateCsvStructure(data)

    expect(result.valid).toBe(true)
    expect(result.headerCount).toBe(2)
    expect(result.rowCount).toBe(1)
  })

  it('should reject empty data', () => {
    const result = validateCsvStructure([])

    expect(result.valid).toBe(false)
    expect(result.message).toContain('No data')
  })

  it('should reject data with no headers', () => {
    const data = [{}]

    const result = validateCsvStructure(data)

    expect(result.valid).toBe(false)
    expect(result.message).toContain('No headers')
  })
})
