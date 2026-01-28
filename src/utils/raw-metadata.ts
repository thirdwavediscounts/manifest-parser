import * as XLSX from 'xlsx'
import type { AuctionMetadata } from '../unified/types'

/**
 * UTF-8 BOM for Excel compatibility
 */
const UTF8_BOM = '\ufeff'

/**
 * Metadata column names to append
 */
const METADATA_HEADERS = ['auction_url', 'bid_price', 'shipping_fee'] as const

/**
 * Append auction metadata columns to a raw manifest file.
 *
 * Transforms raw manifest data by appending 3 metadata columns:
 * - auction_url: The source auction URL
 * - bid_price: The winning bid price
 * - shipping_fee: The shipping cost
 *
 * @param data - Base64 encoded CSV or XLSX data
 * @param fileType - The file type: 'csv', 'xlsx', or 'xls'
 * @param metadata - Auction metadata to append
 * @returns CSV string with UTF-8 BOM and appended metadata columns
 */
export function appendMetadataToManifest(
  data: string,
  fileType: 'csv' | 'xlsx' | 'xls',
  metadata: AuctionMetadata
): string {
  // Step 1: Decode base64 to binary/string
  const binaryString = atob(data)

  // Step 2: Parse based on file type
  let rows: string[][]
  if (fileType === 'csv') {
    rows = parseCSV(binaryString)
  } else {
    // XLSX or XLS - use xlsx library
    rows = parseXLSX(binaryString)
  }

  // Step 3: Append metadata columns
  const result = appendMetadataColumns(rows, metadata)

  // Step 4: Generate CSV with BOM
  return UTF8_BOM + result.map(row => row.map(escapeCSVField).join(',')).join('\n')
}

/**
 * Parse CSV string into rows of cells
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
      } else if (char === '\r') {
        // Skip carriage return (handle \r\n)
        continue
      } else {
        currentField += char
      }
    }
  }

  // Don't forget the last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}

/**
 * Parse XLSX/XLS binary string into rows of cells
 */
function parseXLSX(binaryString: string): string[][] {
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Parse with xlsx library
  const workbook = XLSX.read(bytes, { type: 'array' })

  // Get first sheet
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return []
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    return []
  }

  // Convert to array of arrays (preserves all cells including empty ones)
  const data = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1, // Return array of arrays
    raw: false, // Convert values to strings
    defval: '', // Default for empty cells
  })

  return data
}

/**
 * Append metadata columns to rows
 */
function appendMetadataColumns(rows: string[][], metadata: AuctionMetadata): string[][] {
  if (rows.length === 0) {
    return []
  }

  // Use ?? 0 for null values (defensive, per CONTEXT.md)
  const bidPrice = metadata.bidPrice ?? 0
  const shippingFee = metadata.shippingFee ?? 0

  // Metadata values for first data row
  const metadataValues = [
    metadata.auctionUrl,
    String(bidPrice),
    String(shippingFee),
  ]

  // Empty values for subsequent rows
  const emptyMetadata = ['', '', '']

  return rows.map((row, index) => {
    if (index === 0) {
      // Header row - append metadata column names
      return [...row, ...METADATA_HEADERS]
    } else if (index === 1) {
      // First data row - append metadata values
      return [...row, ...metadataValues]
    } else {
      // Subsequent rows - append empty values
      return [...row, ...emptyMetadata]
    }
  })
}

/**
 * Escape a field for CSV format
 * Quotes fields containing commas, quotes, or newlines
 * Escapes quotes by doubling them
 */
function escapeCSVField(value: string): string {
  const needsQuoting =
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')

  if (!needsQuoting) {
    return value
  }

  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}
