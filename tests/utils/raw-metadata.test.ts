import { describe, it, expect } from 'vitest'
import { appendMetadataToManifest } from '../../src/utils/raw-metadata'
import type { AuctionMetadata } from '../../src/unified/types'

/**
 * TDD tests for appendMetadataToManifest function
 *
 * Behavior:
 * - Appends auction_url, bid_price, shipping_fee columns to raw manifest
 * - First data row gets metadata values, subsequent rows get empty strings
 * - Always outputs CSV regardless of input format (XLSX -> CSV)
 * - Includes UTF-8 BOM for Excel/Retool compatibility
 */

const UTF8_BOM = '\ufeff'

describe('appendMetadataToManifest', () => {
  describe('CSV input', () => {
    it('should append metadata columns to CSV and return CSV with BOM', () => {
      // Input: simple 2-column CSV with 2 data rows
      const csvContent = 'A,B\n1,2\n3,4'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'https://example.com/auction/123',
        bidPrice: 10,
        shippingFee: 5,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)

      // Should start with UTF-8 BOM
      expect(result.startsWith(UTF8_BOM)).toBe(true)

      // Parse the result (remove BOM)
      const lines = result.slice(1).split('\n')

      // Header should have 5 columns (original 2 + 3 metadata)
      expect(lines[0]).toBe('A,B,auction_url,bid_price,shipping_fee')

      // First data row should have metadata values
      expect(lines[1]).toBe('1,2,https://example.com/auction/123,10,5')

      // Second data row should have empty metadata values
      expect(lines[2]).toBe('3,4,,,')
    })

    it('should handle zero values for bid_price and shipping_fee', () => {
      const csvContent = 'Col1\nValue1'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'https://test.com',
        bidPrice: 0,
        shippingFee: 0,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // Zero values should appear as "0", not empty
      expect(lines[1]).toBe('Value1,https://test.com,0,0')
    })

    it('should handle null values for bid_price and shipping_fee', () => {
      const csvContent = 'Col1\nValue1'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'https://test.com',
        bidPrice: null,
        shippingFee: null,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // Null values should become 0 (defensive, per CONTEXT.md)
      expect(lines[1]).toBe('Value1,https://test.com,0,0')
    })

    it('should properly escape URLs containing commas', () => {
      const csvContent = 'Name\nTest'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'https://example.com/auction?a=1,b=2',
        bidPrice: 100,
        shippingFee: 25,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // URL with comma should be quoted
      expect(lines[1]).toBe('Test,"https://example.com/auction?a=1,b=2",100,25')
    })

    it('should handle CSV with many rows (metadata only on first)', () => {
      const csvContent = 'Header\nRow1\nRow2\nRow3\nRow4\nRow5'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'url',
        bidPrice: 50,
        shippingFee: 10,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      expect(lines.length).toBe(6) // header + 5 data rows
      expect(lines[1]).toBe('Row1,url,50,10') // First data row has metadata
      expect(lines[2]).toBe('Row2,,,') // Empty metadata
      expect(lines[3]).toBe('Row3,,,')
      expect(lines[4]).toBe('Row4,,,')
      expect(lines[5]).toBe('Row5,,,')
    })

    it('should preserve original column values exactly', () => {
      const csvContent = 'Item,Price,Description\nABC123,29.99,"Product, with comma"\nXYZ789,15.50,Simple'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'http://test',
        bidPrice: 5,
        shippingFee: 2,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // Header preserved + metadata columns added
      expect(lines[0]).toBe('Item,Price,Description,auction_url,bid_price,shipping_fee')

      // First data row with metadata
      expect(lines[1]).toBe('ABC123,29.99,"Product, with comma",http://test,5,2')

      // Second data row with empty metadata
      expect(lines[2]).toBe('XYZ789,15.50,Simple,,,')
    })

    it('should handle header-only CSV (no data rows)', () => {
      const csvContent = 'Col1,Col2,Col3'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'url',
        bidPrice: 10,
        shippingFee: 5,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // Only header, no data rows
      expect(lines.length).toBe(1)
      expect(lines[0]).toBe('Col1,Col2,Col3,auction_url,bid_price,shipping_fee')
    })
  })

  describe('XLSX input', () => {
    it('should convert XLSX to CSV and append metadata columns', () => {
      // Create a simple XLSX file using xlsx library
      const xlsxBase64 = createTestXlsxBase64([
        ['A', 'B'],
        ['1', '2'],
        ['3', '4'],
      ])

      const metadata: AuctionMetadata = {
        auctionUrl: 'https://xlsx-test.com',
        bidPrice: 20,
        shippingFee: 8,
      }

      const result = appendMetadataToManifest(xlsxBase64, 'xlsx', metadata)

      // Should start with UTF-8 BOM
      expect(result.startsWith(UTF8_BOM)).toBe(true)

      // Parse the result
      const lines = result.slice(1).split('\n')

      // Header should have metadata columns
      expect(lines[0]).toBe('A,B,auction_url,bid_price,shipping_fee')

      // First data row with metadata
      expect(lines[1]).toBe('1,2,https://xlsx-test.com,20,8')

      // Second data row empty metadata
      expect(lines[2]).toBe('3,4,,,')
    })

    it('should handle xls fileType same as xlsx', () => {
      const xlsxBase64 = createTestXlsxBase64([
        ['Name'],
        ['Test'],
      ])

      const metadata: AuctionMetadata = {
        auctionUrl: 'xls-url',
        bidPrice: 5,
        shippingFee: 1,
      }

      const result = appendMetadataToManifest(xlsxBase64, 'xls', metadata)

      expect(result.startsWith(UTF8_BOM)).toBe(true)
      const lines = result.slice(1).split('\n')
      expect(lines[0]).toBe('Name,auction_url,bid_price,shipping_fee')
      expect(lines[1]).toBe('Test,xls-url,5,1')
    })
  })

  describe('edge cases', () => {
    it('should handle empty cells in original data', () => {
      const csvContent = 'A,B,C\nVal1,,Val3\n,Val2,'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'url',
        bidPrice: 1,
        shippingFee: 2,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      expect(lines[1]).toBe('Val1,,Val3,url,1,2')
      expect(lines[2]).toBe(',Val2,,,,')
    })

    it('should handle fields with quotes', () => {
      const csvContent = 'Name\n"Product ""Special"" Edition"'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'url',
        bidPrice: 10,
        shippingFee: 0,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      // The original quoted field should be preserved
      expect(lines[1]).toContain('Special')
    })

    it('should handle decimal prices correctly', () => {
      const csvContent = 'Item\nTest'
      const base64Data = btoa(csvContent)

      const metadata: AuctionMetadata = {
        auctionUrl: 'url',
        bidPrice: 123.45,
        shippingFee: 9.99,
      }

      const result = appendMetadataToManifest(base64Data, 'csv', metadata)
      const lines = result.slice(1).split('\n')

      expect(lines[1]).toBe('Test,url,123.45,9.99')
    })
  })
})

/**
 * Helper function to create a test XLSX file as base64
 * Uses xlsx library to generate a valid XLSX buffer
 */
function createTestXlsxBase64(data: string[][]): string {
  // Import xlsx dynamically - this will be available in test environment
  const XLSX = require('xlsx')

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Convert to base64
  return Buffer.from(buffer).toString('base64')
}
