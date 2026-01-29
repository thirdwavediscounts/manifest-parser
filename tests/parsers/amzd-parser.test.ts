import { describe, it, expect } from 'vitest'
import {
  findAsin,
  extractRightAnchored,
  calculateAmzdUnitRetail,
  isAmzdMisaligned,
  parseAmzdRow,
  ASIN_PATTERN,
  PRICE_MULTIPLIER,
} from '../../src/parsers/amzd-parser'

describe('AMZD Parser', () => {
  describe('ASIN_PATTERN', () => {
    it('should match valid ASINs starting with B0', () => {
      expect(ASIN_PATTERN.test('B083WFQC1C')).toBe(true)
      expect(ASIN_PATTERN.test('B0DJPTRP57')).toBe(true)
      expect(ASIN_PATTERN.test('B0CL7J12YK')).toBe(true)
    })

    it('should reject ASINs not starting with B0', () => {
      expect(ASIN_PATTERN.test('A083WFQC1C')).toBe(false)
      expect(ASIN_PATTERN.test('B183WFQC1C')).toBe(false)
    })

    it('should reject ASINs with wrong length', () => {
      expect(ASIN_PATTERN.test('B0')).toBe(false)
      expect(ASIN_PATTERN.test('B083WFQC1')).toBe(false)
      expect(ASIN_PATTERN.test('B083WFQC1CC')).toBe(false)
    })

    it('should reject lowercase ASINs', () => {
      expect(ASIN_PATTERN.test('b083wfqc1c')).toBe(false)
    })
  })

  describe('PRICE_MULTIPLIER', () => {
    it('should be 4.5', () => {
      expect(PRICE_MULTIPLIER).toBe(4.5)
    })
  })

  describe('findAsin', () => {
    it('should find ASIN in any cell position', () => {
      expect(findAsin(['Return', 'B083WFQC1C', 'Title'])).toBe('B083WFQC1C')
      expect(findAsin(['B083WFQC1C', 'other', 'values'])).toBe('B083WFQC1C')
      expect(findAsin(['first', 'second', 'B083WFQC1C'])).toBe('B083WFQC1C')
    })

    it('should return empty string when no ASIN found', () => {
      expect(findAsin(['No', 'ASIN', 'Here'])).toBe('')
      expect(findAsin(['Return', 'Value', 'Title'])).toBe('')
    })

    it('should reject short strings that look like ASINs', () => {
      expect(findAsin(['B0', 'Short'])).toBe('')
      expect(findAsin(['B083WFQC'])).toBe('')
    })

    it('should handle empty array', () => {
      expect(findAsin([])).toBe('')
    })

    it('should handle null and undefined values in cells', () => {
      expect(findAsin([null, 'B083WFQC1C', undefined])).toBe('B083WFQC1C')
      expect(findAsin([null, undefined])).toBe('')
    })

    it('should handle numeric values in cells', () => {
      expect(findAsin([123, 456, 'B083WFQC1C'])).toBe('B083WFQC1C')
    })

    it('should find first ASIN when multiple exist', () => {
      expect(findAsin(['B083WFQC1C', 'B0DJPTRP57'])).toBe('B083WFQC1C')
    })
  })

  describe('extractRightAnchored', () => {
    it('should extract last element with posFromEnd=1', () => {
      expect(extractRightAnchored(['a', 'b', 'c', 'd'], 1)).toBe('d')
    })

    it('should extract second from end with posFromEnd=2', () => {
      expect(extractRightAnchored(['a', 'b', 'c', 'd'], 2)).toBe('c')
    })

    it('should extract third from end with posFromEnd=3', () => {
      expect(extractRightAnchored(['a', 'b', 'c', 'd'], 3)).toBe('b')
    })

    it('should return undefined for empty array', () => {
      expect(extractRightAnchored([], 1)).toBeUndefined()
    })

    it('should return undefined when posFromEnd exceeds array length', () => {
      expect(extractRightAnchored(['a', 'b'], 5)).toBeUndefined()
    })

    it('should work with different types', () => {
      expect(extractRightAnchored([1, 2, 3], 1)).toBe(3)
      expect(extractRightAnchored([{ a: 1 }, { b: 2 }], 2)).toEqual({ a: 1 })
    })

    it('should handle posFromEnd of 0 as undefined', () => {
      expect(extractRightAnchored(['a', 'b'], 0)).toBeUndefined()
    })

    it('should handle negative posFromEnd as undefined', () => {
      expect(extractRightAnchored(['a', 'b'], -1)).toBeUndefined()
    })
  })

  describe('calculateAmzdUnitRetail', () => {
    it('should multiply lot price by 4.5', () => {
      expect(calculateAmzdUnitRetail(100)).toBe(450)
      expect(calculateAmzdUnitRetail(188)).toBe(846)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateAmzdUnitRetail(17.75)).toBe(79.88)
      expect(calculateAmzdUnitRetail(10.33)).toBe(46.48) // 10.33 * 4.5 = 46.485 -> 46.48 (banker's rounding)
    })

    it('should handle zero', () => {
      expect(calculateAmzdUnitRetail(0)).toBe(0)
    })

    it('should return 0 for NaN', () => {
      expect(calculateAmzdUnitRetail(NaN)).toBe(0)
    })

    it('should return 0 for negative values', () => {
      expect(calculateAmzdUnitRetail(-100)).toBe(0)
    })
  })

  describe('isAmzdMisaligned', () => {
    it('should return true when cells exceed headers', () => {
      expect(isAmzdMisaligned(['a', 'b', 'c'], ['H1', 'H2'])).toBe(true)
      expect(isAmzdMisaligned(['a', 'b', 'c', 'd', 'e'], ['H1', 'H2', 'H3'])).toBe(true)
    })

    it('should return false when cells equal headers', () => {
      expect(isAmzdMisaligned(['a', 'b'], ['H1', 'H2'])).toBe(false)
    })

    it('should return false when cells fewer than headers', () => {
      expect(isAmzdMisaligned(['a'], ['H1', 'H2'])).toBe(false)
    })

    it('should handle empty arrays', () => {
      expect(isAmzdMisaligned([], [])).toBe(false)
      expect(isAmzdMisaligned([], ['H1'])).toBe(false)
      expect(isAmzdMisaligned(['a'], [])).toBe(true)
    })
  })

  describe('parseAmzdRow', () => {
    const headers = ['Condition', 'Product Type', 'Brand', 'ASIN', 'Item Title', 'Seller Name', 'Qty', 'Lot item price', 'Total lot price']

    describe('well-formed rows (header-based extraction)', () => {
      it('should extract fields using header mapping', () => {
        const row = {
          'Condition': 'Return',
          'Product Type': 'Electronics',
          'Brand': 'Apple',
          'ASIN': 'B083WFQC1C',
          'Item Title': 'Apple Pencil',
          'Seller Name': 'Amazon.com',
          'Qty': '6',
          'Lot item price': '$17.75',
          'Total lot price': '$106.50',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, headers)

        expect(result).not.toBeNull()
        expect(result!.asin).toBe('B083WFQC1C')
        expect(result!.productName).toBe('Apple Pencil')
        expect(result!.qty).toBe(6)
        expect(result!.unitRetail).toBe(79.88) // 17.75 * 4.5 rounded
      })

      it('should use Model as fallback for productName', () => {
        const row = {
          'ASIN': 'B083WFQC1C',
          'Model': 'Model XYZ',
          'Qty': '1',
          'Lot item price': '10.00',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, Object.keys(row))

        expect(result!.productName).toBe('Model XYZ')
      })

      it('should use Brand as fallback when Item Title and Model missing', () => {
        const row = {
          'ASIN': 'B083WFQC1C',
          'Brand': 'Apple',
          'Qty': '1',
          'Lot item price': '10.00',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, Object.keys(row))

        expect(result!.productName).toBe('Apple')
      })
    })

    describe('misaligned rows (right-anchor extraction)', () => {
      it('should use right-anchor for qty and price when misaligned', () => {
        // Simulating a row with extra cells due to commas in title
        const row = {} // Header mapping won't work
        const cells = ['Return', 'Electronics', 'Apple', 'B083WFQC1C', 'Title', 'Part1', 'Part2', 'Amazon', '5', '$20.00', '$100.00']
        const shortHeaders = ['Condition', 'Type', 'Brand', 'ASIN', 'Title', 'Seller', 'Qty', 'Lot Price', 'Total']

        const result = parseAmzdRow(row, cells, shortHeaders)

        expect(result).not.toBeNull()
        expect(result!.asin).toBe('B083WFQC1C')
        expect(result!.qty).toBe(5) // 3rd from end
        expect(result!.unitRetail).toBe(90) // 20 * 4.5
      })

      it('should still find ASIN by scanning cells when misaligned', () => {
        const row = {}
        const cells = ['Return', 'B0DJPTRP57', 'Extra', 'Cells', '3', '$10.00', '$30.00']
        const shortHeaders = ['A', 'B', 'C', 'D']

        const result = parseAmzdRow(row, cells, shortHeaders)

        expect(result).not.toBeNull()
        expect(result!.asin).toBe('B0DJPTRP57')
      })
    })

    describe('edge cases', () => {
      it('should return null for empty rows', () => {
        const row = {}
        const cells: unknown[] = []

        const result = parseAmzdRow(row, cells, headers)

        expect(result).toBeNull()
      })

      it('should include __parsed_extra in cells for misalignment detection', () => {
        // Simulate a PapaParse row with __parsed_extra
        const row: Record<string, unknown> = {
          'Condition': 'Return',
          'Product Type': 'Electronics',
          'Brand': 'Apple',
          'ASIN': 'B083WFQC1C',
          'Item Title': 'Title with',
          'Seller Name': 'extra comma',
          'Qty': '6',
          'Lot item price': '$17.75',
          'Total lot price': '$106.50',
        }
        // PapaParse adds __parsed_extra as a non-enumerable-like array
        ;(row as any).__parsed_extra = ['overflow1', 'overflow2']

        // Simulate what base-parser now does: filter out the __parsed_extra array, spread its elements
        const extra: unknown[] = (row as any).__parsed_extra || []
        const rawValues = Object.values(row)
        const cells = extra.length > 0
          ? [...rawValues.filter(v => v !== extra), ...extra]
          : rawValues
        const result = isAmzdMisaligned(cells, headers)

        expect(result).toBe(true)
        expect(cells.length).toBe(11) // 9 regular + 2 extra
      })

      it('should return null when no ASIN, productName, or price', () => {
        const row = {
          'Condition': 'Return',
          'Seller Name': 'Amazon',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, ['Condition', 'Seller Name'])

        expect(result).toBeNull()
      })

      it('should handle price strings with $ and commas', () => {
        const row = {
          'ASIN': 'B083WFQC1C',
          'Item Title': 'Expensive Item',
          'Qty': '1',
          'Lot item price': '$1,234.56',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, Object.keys(row))

        expect(result!.unitRetail).toBe(5555.52) // 1234.56 * 4.5
      })

      it('should return null for rows with no usable data (recovery fails)', () => {
        // Row has cells but no ASIN, no productName, no price — parseAmzdRow returns null
        // base-parser will create a fallback ManifestItem for this case
        const row = {
          'Condition': 'Return',
          'Seller Name': 'Amazon',
        }
        const cells = Object.values(row)
        const result = parseAmzdRow(row, cells, ['Condition', 'Seller Name'])

        // parseAmzdRow returns null — base-parser handles the fallback
        expect(result).toBeNull()
      })

      it('should default qty to 1 when missing or invalid', () => {
        const row = {
          'ASIN': 'B083WFQC1C',
          'Item Title': 'Test',
          'Lot item price': '10.00',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, Object.keys(row))

        expect(result!.qty).toBe(1)
      })

      it('should return row with ASIN even if price missing', () => {
        const row = {
          'ASIN': 'B083WFQC1C',
          'Item Title': 'No Price Item',
          'Qty': '2',
        }
        const cells = Object.values(row)

        const result = parseAmzdRow(row, cells, Object.keys(row))

        expect(result).not.toBeNull()
        expect(result!.asin).toBe('B083WFQC1C')
        expect(result!.unitRetail).toBe(0)
      })
    })
  })
})
