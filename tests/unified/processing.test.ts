import { describe, it, expect } from 'vitest'
import {
  cleanField,
  cleanRow,
  normalizeItemNumber,
  deduplicateRows,
} from '../../src/unified/processing'
import type { UnifiedManifestRow } from '../../src/unified/types'

/**
 * Helper to create test rows with defaults
 */
const createRow = (overrides: Partial<UnifiedManifestRow> = {}): UnifiedManifestRow => ({
  item_number: '123456789012',
  product_name: 'Test Product',
  qty: 1,
  unit_retail: 10.00,
  auction_url: '',
  bid_price: '',
  shipping_fee: '',
  ...overrides,
})

describe('cleanField', () => {
  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      expect(cleanField('  hello')).toBe('hello')
    })

    it('should trim trailing whitespace', () => {
      expect(cleanField('hello  ')).toBe('hello')
    })

    it('should trim both leading and trailing whitespace', () => {
      expect(cleanField('  hello world  ')).toBe('hello world')
    })

    it('should preserve internal whitespace', () => {
      expect(cleanField('hello world')).toBe('hello world')
    })

    it('should handle tabs and newlines', () => {
      expect(cleanField('\thello\n')).toBe('hello')
    })
  })

  describe('non-printable character removal', () => {
    it('should remove null character (0x00)', () => {
      expect(cleanField('text\u0000here')).toBe('texthere')
    })

    it('should remove zero-width space (U+200B)', () => {
      expect(cleanField('text\u200Bhere')).toBe('texthere')
    })

    it('should remove BOM (U+FEFF)', () => {
      expect(cleanField('\uFEFFtext')).toBe('text')
    })

    it('should remove multiple non-printable characters', () => {
      expect(cleanField('\u0000text\u200B\uFEFFhere')).toBe('texthere')
    })

    it('should remove control characters (0x00-0x1F except tabs/newlines)', () => {
      // Control char 0x01 (SOH)
      expect(cleanField('abc\u0001def')).toBe('abcdef')
    })

    it('should remove DEL character (0x7F)', () => {
      expect(cleanField('abc\u007Fdef')).toBe('abcdef')
    })
  })

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(cleanField('')).toBe('')
    })

    it('should return empty string for whitespace-only input', () => {
      expect(cleanField('   ')).toBe('')
    })

    it('should handle string with only non-printable characters', () => {
      expect(cleanField('\u0000\u200B\uFEFF')).toBe('')
    })

    it('should handle mixed non-printable and whitespace', () => {
      expect(cleanField('  \u0000text\u200B  ')).toBe('text')
    })
  })
})

describe('cleanRow', () => {
  it('should clean product_name field', () => {
    const row = createRow({ product_name: '  Test Product  ' })
    const cleaned = cleanRow(row)
    expect(cleaned.product_name).toBe('Test Product')
  })

  it('should clean auction_url field', () => {
    const row = createRow({ auction_url: '  https://example.com  ' })
    const cleaned = cleanRow(row)
    expect(cleaned.auction_url).toBe('https://example.com')
  })

  it('should clean bid_price field', () => {
    const row = createRow({ bid_price: '  100.50  ' })
    const cleaned = cleanRow(row)
    expect(cleaned.bid_price).toBe('100.50')
  })

  it('should clean shipping_fee field', () => {
    const row = createRow({ shipping_fee: '  25.00  ' })
    const cleaned = cleanRow(row)
    expect(cleaned.shipping_fee).toBe('25.00')
  })

  describe('item_number special handling', () => {
    it('should strip ALL whitespace from item_number (not just trim)', () => {
      const row = createRow({ item_number: 'ABC 123 XYZ' })
      const cleaned = cleanRow(row)
      expect(cleaned.item_number).toBe('ABC123XYZ')
    })

    it('should strip leading/trailing whitespace from item_number', () => {
      const row = createRow({ item_number: '  ABC123  ' })
      const cleaned = cleanRow(row)
      expect(cleaned.item_number).toBe('ABC123')
    })

    it('should strip tabs and internal spaces from item_number', () => {
      const row = createRow({ item_number: 'ABC\t123\n456' })
      const cleaned = cleanRow(row)
      expect(cleaned.item_number).toBe('ABC123456')
    })

    it('should remove non-printable characters from item_number', () => {
      const row = createRow({ item_number: 'ABC\u0000123' })
      const cleaned = cleanRow(row)
      expect(cleaned.item_number).toBe('ABC123')
    })
  })

  it('should preserve numeric qty value', () => {
    const row = createRow({ qty: 5 })
    const cleaned = cleanRow(row)
    expect(cleaned.qty).toBe(5)
  })

  it('should preserve numeric unit_retail value', () => {
    const row = createRow({ unit_retail: 29.99 })
    const cleaned = cleanRow(row)
    expect(cleaned.unit_retail).toBe(29.99)
  })

  it('should return a new object (immutability)', () => {
    const row = createRow()
    const cleaned = cleanRow(row)
    expect(cleaned).not.toBe(row)
  })
})

describe('normalizeItemNumber', () => {
  describe('case normalization', () => {
    it('should convert to lowercase', () => {
      expect(normalizeItemNumber('ABC123')).toBe('abc123')
    })

    it('should handle mixed case', () => {
      expect(normalizeItemNumber('AbC123xYz')).toBe('abc123xyz')
    })

    it('should handle already lowercase', () => {
      expect(normalizeItemNumber('abc123')).toBe('abc123')
    })
  })

  describe('leading zeros', () => {
    it('should strip leading zeros from pure numeric', () => {
      expect(normalizeItemNumber('00123')).toBe('123')
    })

    it('should strip multiple leading zeros', () => {
      expect(normalizeItemNumber('000000123')).toBe('123')
    })

    it('should not strip zeros from middle', () => {
      expect(normalizeItemNumber('10023')).toBe('10023')
    })

    it('should not strip trailing zeros', () => {
      expect(normalizeItemNumber('12300')).toBe('12300')
    })

    it('should handle all zeros', () => {
      expect(normalizeItemNumber('0000')).toBe('0')
    })

    it('should strip leading zeros from alphanumeric starting with 0', () => {
      expect(normalizeItemNumber('00ABC123')).toBe('abc123')
    })
  })

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeItemNumber('')).toBe('')
    })

    it('should handle single character', () => {
      expect(normalizeItemNumber('A')).toBe('a')
    })

    it('should handle single zero', () => {
      expect(normalizeItemNumber('0')).toBe('0')
    })
  })
})

describe('deduplicateRows', () => {
  describe('no duplicates', () => {
    it('should return empty array for empty input', () => {
      const result = deduplicateRows([])
      expect(result).toEqual([])
    })

    it('should return same rows when no duplicates exist', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2 }),
        createRow({ item_number: 'DEF456', qty: 3 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(2)
      expect(result[0].item_number).toBe('ABC123')
      expect(result[1].item_number).toBe('DEF456')
    })

    it('should preserve all fields when no duplicates', () => {
      const rows = [
        createRow({
          item_number: 'ABC123',
          product_name: 'Product A',
          qty: 5,
          unit_retail: 29.99,
          auction_url: 'https://example.com',
          bid_price: '100',
          shipping_fee: '25',
        }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0]).toEqual(rows[0])
    })
  })

  describe('merging duplicates', () => {
    it('should sum quantities for duplicate items', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2 }),
        createRow({ item_number: 'ABC123', qty: 3 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(1)
      expect(result[0].qty).toBe(5)
    })

    it('should use product_name from highest quantity row', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2, product_name: 'Low Qty Name' }),
        createRow({ item_number: 'ABC123', qty: 5, product_name: 'High Qty Name' }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0].product_name).toBe('High Qty Name')
    })

    it('should use first seen product_name on quantity tie', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 3, product_name: 'First Name' }),
        createRow({ item_number: 'ABC123', qty: 3, product_name: 'Second Name' }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0].product_name).toBe('First Name')
    })

    it('should use highest unit_retail value', () => {
      const rows = [
        createRow({ item_number: 'ABC123', unit_retail: 10.00 }),
        createRow({ item_number: 'ABC123', unit_retail: 15.00 }),
        createRow({ item_number: 'ABC123', unit_retail: 12.00 }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0].unit_retail).toBe(15.00)
    })

    it('should preserve longest item_number format (leading zeros)', () => {
      const rows = [
        createRow({ item_number: '123', qty: 1 }),
        createRow({ item_number: '00123', qty: 1 }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0].item_number).toBe('00123')
    })

    it('should preserve metadata from first row in group', () => {
      const rows = [
        createRow({
          item_number: 'ABC123',
          auction_url: 'https://first.com',
          bid_price: '100',
          shipping_fee: '20',
        }),
        createRow({
          item_number: 'ABC123',
          auction_url: 'https://second.com',
          bid_price: '200',
          shipping_fee: '30',
        }),
      ]
      const result = deduplicateRows(rows)
      expect(result[0].auction_url).toBe('https://first.com')
      expect(result[0].bid_price).toBe('100')
      expect(result[0].shipping_fee).toBe('20')
    })
  })

  describe('case-insensitive matching', () => {
    it('should merge rows with different case item_numbers', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2 }),
        createRow({ item_number: 'abc123', qty: 3 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(1)
      expect(result[0].qty).toBe(5)
    })

    it('should preserve original case from longest format', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 1 }),
        createRow({ item_number: 'abc123', qty: 1 }),
      ]
      const result = deduplicateRows(rows)
      // Both same length, first seen wins
      expect(result[0].item_number).toBe('ABC123')
    })
  })

  describe('empty item_number handling', () => {
    it('should never merge rows with empty item_number', () => {
      const rows = [
        createRow({ item_number: '', product_name: 'Empty 1', qty: 2 }),
        createRow({ item_number: '', product_name: 'Empty 2', qty: 3 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(2)
      expect(result[0].product_name).toBe('Empty 1')
      expect(result[1].product_name).toBe('Empty 2')
    })

    it('should preserve empty item_number rows alongside merged rows', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2 }),
        createRow({ item_number: '', qty: 1 }),
        createRow({ item_number: 'ABC123', qty: 3 }),
        createRow({ item_number: '', qty: 1 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(3)
      // Merged ABC123 row
      const mergedRow = result.find(r => r.item_number === 'ABC123')
      expect(mergedRow).toBeDefined()
      expect(mergedRow!.qty).toBe(5)
      // Two empty item_number rows preserved
      const emptyRows = result.filter(r => r.item_number === '')
      expect(emptyRows).toHaveLength(2)
    })
  })

  describe('complex scenarios', () => {
    it('should handle three-way merge correctly', () => {
      const rows = [
        createRow({ item_number: 'ABC123', qty: 2, product_name: 'Name 2', unit_retail: 10.00 }),
        createRow({ item_number: 'ABC123', qty: 5, product_name: 'Name 5', unit_retail: 12.00 }),
        createRow({ item_number: 'ABC123', qty: 3, product_name: 'Name 3', unit_retail: 15.00 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(1)
      expect(result[0].qty).toBe(10) // 2 + 5 + 3
      expect(result[0].product_name).toBe('Name 5') // highest qty
      expect(result[0].unit_retail).toBe(15.00) // highest price
    })

    it('should handle mixed duplicates and unique items', () => {
      const rows = [
        createRow({ item_number: 'ABC', qty: 1 }),
        createRow({ item_number: 'DEF', qty: 2 }),
        createRow({ item_number: 'ABC', qty: 3 }),
        createRow({ item_number: 'GHI', qty: 4 }),
        createRow({ item_number: 'DEF', qty: 5 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(3)

      const abc = result.find(r => r.item_number === 'ABC')
      const def = result.find(r => r.item_number === 'DEF')
      const ghi = result.find(r => r.item_number === 'GHI')

      expect(abc!.qty).toBe(4) // 1 + 3
      expect(def!.qty).toBe(7) // 2 + 5
      expect(ghi!.qty).toBe(4)
    })

    it('should merge leading zeros variants correctly', () => {
      const rows = [
        createRow({ item_number: '0000ABC', qty: 1 }),
        createRow({ item_number: 'ABC', qty: 2 }),
        createRow({ item_number: '00ABC', qty: 3 }),
      ]
      const result = deduplicateRows(rows)
      expect(result).toHaveLength(1)
      expect(result[0].qty).toBe(6)
      expect(result[0].item_number).toBe('0000ABC') // longest format
    })
  })
})
