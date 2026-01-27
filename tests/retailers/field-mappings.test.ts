/**
 * Tests for retailer field mapping configurations
 *
 * Tests cover:
 * - Null value detection (isNullValue)
 * - Retailer config retrieval (getRetailerFieldConfig)
 * - Field extraction with null handling (extractField)
 */

import {
  isNullValue,
  getRetailerFieldConfig,
  extractField,
  NULL_VALUES,
} from '../../src/retailers/field-mappings'

describe('isNullValue', () => {
  describe('returns true for null values', () => {
    it('should detect "NOT AVAILABLE" as null', () => {
      expect(isNullValue('NOT AVAILABLE')).toBe(true)
    })

    it('should detect "N/A" as null', () => {
      expect(isNullValue('N/A')).toBe(true)
    })

    it('should detect "n/a" as null (case-insensitive)', () => {
      expect(isNullValue('n/a')).toBe(true)
    })

    it('should detect "-" as null', () => {
      expect(isNullValue('-')).toBe(true)
    })

    it('should detect "none" as null', () => {
      expect(isNullValue('none')).toBe(true)
    })

    it('should detect "0000000000" as null', () => {
      expect(isNullValue('0000000000')).toBe(true)
    })

    it('should detect empty string as null', () => {
      expect(isNullValue('')).toBe(true)
    })

    it('should detect whitespace-padded null values', () => {
      expect(isNullValue('  N/A  ')).toBe(true)
      expect(isNullValue(' - ')).toBe(true)
    })
  })

  describe('returns false for valid values', () => {
    it('should not detect "Valid UPC" as null', () => {
      expect(isNullValue('Valid UPC')).toBe(false)
    })

    it('should not detect "12345" as null', () => {
      expect(isNullValue('12345')).toBe(false)
    })

    it('should not detect "Product Name" as null', () => {
      expect(isNullValue('Product Name')).toBe(false)
    })

    it('should not detect "123456789012" (valid UPC) as null', () => {
      expect(isNullValue('123456789012')).toBe(false)
    })

    it('should not detect "B07ABC1234" (ASIN) as null', () => {
      expect(isNullValue('B07ABC1234')).toBe(false)
    })
  })
})

describe('NULL_VALUES', () => {
  it('should be an array of lowercase null value strings', () => {
    expect(Array.isArray(NULL_VALUES)).toBe(true)
    expect(NULL_VALUES.length).toBeGreaterThan(0)
    // All values should be lowercase for consistent comparison
    for (const value of NULL_VALUES) {
      expect(value).toBe(value.toLowerCase())
    }
  })
})

describe('getRetailerFieldConfig', () => {
  describe('ACE retailer', () => {
    it('should return UPC as itemNumber for ACE', () => {
      const config = getRetailerFieldConfig('ace')
      expect(config.itemNumber).toContain('UPC')
    })

    it('should return Item Description as productName for ACE', () => {
      const config = getRetailerFieldConfig('ace')
      expect(config.productName).toContain('Item Description')
    })
  })

  describe('AMZ retailer', () => {
    it('should return ASIN as itemNumber for AMZ', () => {
      const config = getRetailerFieldConfig('amz')
      expect(config.itemNumber).toContain('ASIN')
    })
  })

  describe('ATT retailer', () => {
    it('should return UPC as itemNumber for ATT', () => {
      const config = getRetailerFieldConfig('att')
      expect(config.itemNumber).toContain('UPC')
    })
  })

  describe('BY retailer', () => {
    it('should return Quantity as qty column for BY', () => {
      const config = getRetailerFieldConfig('by')
      expect(config.qty).toContain('Quantity')
    })
  })

  describe('TL (TechLiquidators) retailer', () => {
    it('should return Orig. Retail as first unitRetail column', () => {
      const config = getRetailerFieldConfig('tl')
      expect(config.unitRetail).toContain('Orig. Retail')
    })

    it('should return Product Name as productName for TL', () => {
      const config = getRetailerFieldConfig('tl')
      expect(config.productName).toContain('Product Name')
    })
  })

  describe('TGT retailer', () => {
    it('should prioritize UPC over Item # for TGT', () => {
      const config = getRetailerFieldConfig('tgt')
      expect(config.itemNumber[0]).toBe('UPC')
      expect(config.itemNumber).toContain('Item #')
    })
  })

  describe('JCP retailer', () => {
    it('should return Brand as itemNumber fallback for JCP', () => {
      const config = getRetailerFieldConfig('jcp')
      expect(config.itemNumber).toContain('Brand')
    })

    it('should use Brand and Subcategory for productName', () => {
      const config = getRetailerFieldConfig('jcp')
      expect(config.productName).toContain('Brand')
      expect(config.productName).toContain('Subcategory')
    })
  })

  describe('RC retailer', () => {
    it('should return Item # and UPC for RC', () => {
      const config = getRetailerFieldConfig('rc')
      expect(config.itemNumber).toContain('Item #')
      expect(config.itemNumber).toContain('UPC')
    })
  })

  describe('QVC retailer', () => {
    it('should return Item # as itemNumber for QVC', () => {
      const config = getRetailerFieldConfig('qvc')
      expect(config.itemNumber).toContain('Item #')
    })
  })

  describe('Costco retailer', () => {
    it('should return Item # as itemNumber for Costco', () => {
      const config = getRetailerFieldConfig('costco')
      expect(config.itemNumber).toContain('Item #')
    })
  })

  describe('B-Stock retailer', () => {
    it('should return Item # as itemNumber for bstock', () => {
      const config = getRetailerFieldConfig('bstock')
      expect(config.itemNumber).toContain('Item #')
    })
  })

  describe('Unknown retailer', () => {
    it('should return default config for unknown retailer', () => {
      const config = getRetailerFieldConfig('unknown')
      expect(config).toBeDefined()
      expect(config.itemNumber).toBeDefined()
      expect(config.productName).toBeDefined()
      expect(config.qty).toBeDefined()
      expect(config.unitRetail).toBeDefined()
    })

    it('should be case-insensitive', () => {
      const lower = getRetailerFieldConfig('ace')
      const upper = getRetailerFieldConfig('ACE')
      expect(lower).toEqual(upper)
    })
  })

  describe('RetailerFieldConfig structure', () => {
    it('should have all required fields', () => {
      const config = getRetailerFieldConfig('ace')
      expect(config).toHaveProperty('itemNumber')
      expect(config).toHaveProperty('productName')
      expect(config).toHaveProperty('qty')
      expect(config).toHaveProperty('unitRetail')
      expect(Array.isArray(config.itemNumber)).toBe(true)
      expect(Array.isArray(config.productName)).toBe(true)
      expect(Array.isArray(config.qty)).toBe(true)
      expect(Array.isArray(config.unitRetail)).toBe(true)
    })
  })
})

describe('extractField', () => {
  describe('null value handling', () => {
    it('should return empty string for NOT AVAILABLE', () => {
      const row = { UPC: 'NOT AVAILABLE' }
      expect(extractField(row, ['UPC'])).toBe('')
    })

    it('should return empty string for N/A', () => {
      const row = { 'Item #': 'N/A' }
      expect(extractField(row, ['Item #'])).toBe('')
    })

    it('should return empty string for "-"', () => {
      const row = { UPC: '-' }
      expect(extractField(row, ['UPC'])).toBe('')
    })
  })

  describe('valid value extraction', () => {
    it('should extract valid UPC', () => {
      const row = { UPC: '123456789' }
      expect(extractField(row, ['UPC'])).toBe('123456789')
    })

    it('should extract valid Item Description', () => {
      const row = { 'Item Description': 'Widget' }
      expect(extractField(row, ['Item Description'])).toBe('Widget')
    })

    it('should extract numeric values as strings', () => {
      const row = { Qty: 5 }
      expect(extractField(row, ['Qty'])).toBe('5')
    })

    it('should trim whitespace from values', () => {
      const row = { UPC: '  123456  ' }
      expect(extractField(row, ['UPC'])).toBe('123456')
    })
  })

  describe('column fallback', () => {
    it('should try columns in order', () => {
      const row = { ASIN: 'B07ABC1234' }
      expect(extractField(row, ['UPC', 'ASIN'])).toBe('B07ABC1234')
    })

    it('should return first matching column', () => {
      const row = { UPC: '123', ASIN: 'B07ABC' }
      expect(extractField(row, ['UPC', 'ASIN'])).toBe('123')
    })

    it('should return empty string when no column matches', () => {
      const row = { 'Unknown Col': 'value' }
      expect(extractField(row, ['Item Description', 'Description'])).toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined column values', () => {
      const row = { UPC: undefined }
      expect(extractField(row, ['UPC'])).toBe('')
    })

    it('should handle null column values', () => {
      const row = { UPC: null }
      expect(extractField(row, ['UPC'])).toBe('')
    })

    it('should handle empty column name array', () => {
      const row = { UPC: '123' }
      expect(extractField(row, [])).toBe('')
    })
  })
})
