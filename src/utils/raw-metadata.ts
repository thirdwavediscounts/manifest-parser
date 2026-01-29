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
 * For CSV files: Uses line-level appending to preserve the original manifest
 * content byte-for-byte (including embedded newlines in quoted fields, original
 * quoting, original delimiters). Only appends 3 metadata columns.
 *
 * For XLSX/XLS files: Parses with xlsx library and re-serializes as CSV with
 * metadata columns appended.
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

  if (fileType === 'csv') {
    return appendMetadataToCsvLines(binaryString, metadata)
  }

  // XLSX or XLS - use xlsx library (parse and re-serialize)
  const rows = parseXLSX(binaryString)
  const result = appendMetadataColumnsToArrays(rows, metadata)
  return UTF8_BOM + result.map(row => row.map(escapeCSVField).join(',')).join('\n')
}

/**
 * Append metadata columns to a CSV string at the line level.
 *
 * Splits the CSV into logical lines (respecting quoted fields with embedded
 * newlines), then appends metadata columns using the detected source delimiter.
 * The original content is preserved byte-for-byte.
 */
function appendMetadataToCsvLines(content: string, metadata: AuctionMetadata): string {
  // Detect delimiter from first line
  const delimiter = detectDelimiter(content)

  // Split into logical lines respecting quoted fields
  const lines = splitQuoteAwareLines(content)

  if (lines.length === 0) {
    return UTF8_BOM
  }

  // Use ?? 0 for null values (per CONTEXT.md)
  const bidPrice = metadata.bidPrice ?? 0
  const shippingFee = metadata.shippingFee ?? 0

  // Quote auctionUrl if it contains the delimiter
  const auctionUrl = metadata.auctionUrl
  const quotedUrl = auctionUrl.includes(delimiter)
    ? `"${auctionUrl.replace(/"/g, '""')}"`
    : auctionUrl

  const metaHeader = `${delimiter}${METADATA_HEADERS.join(delimiter)}`
  const metaFirstRow = `${delimiter}${quotedUrl}${delimiter}${bidPrice}${delimiter}${shippingFee}`
  const metaEmptyRow = `${delimiter}${delimiter}${delimiter}`

  const result = lines.map((line, index) => {
    if (index === 0) {
      // Header line
      return line + metaHeader
    } else if (index === 1) {
      // First data line — append metadata values
      return line + metaFirstRow
    } else {
      // Subsequent lines — append empty columns
      return line + metaEmptyRow
    }
  })

  return UTF8_BOM + result.join('\n')
}

/**
 * Detect the delimiter used in a CSV string by examining the first line.
 */
function detectDelimiter(content: string): string {
  // Get first line (split on raw \n, not quote-aware — just need first line for detection)
  const firstLineEnd = content.indexOf('\n')
  const firstLine = firstLineEnd === -1 ? content : content.substring(0, firstLineEnd)

  const delimiters = [',', '\t', ';', '|']
  let bestDelimiter = ','
  let maxCount = 0

  for (const d of delimiters) {
    // Count occurrences outside of quotes
    let count = 0
    let inQuotes = false
    for (const ch of firstLine) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === d && !inQuotes) {
        count++
      }
    }
    if (count > maxCount) {
      maxCount = count
      bestDelimiter = d
    }
  }

  return bestDelimiter
}

/**
 * Split CSV content into logical lines, respecting quoted fields.
 *
 * A newline inside a quoted field does NOT start a new logical line.
 * This preserves embedded newlines in fields like product titles.
 */
function splitQuoteAwareLines(content: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  let hasEmbeddedNewlines = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]

    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === '\r') {
      // Handle \r\n — skip \r, the \n will handle the line break
      if (!inQuotes) {
        // Skip \r outside quotes (will be handled by \n)
        if (content[i + 1] === '\n') {
          continue
        }
        // Standalone \r is a line break
        lines.push(current)
        current = ''
      } else {
        current += ch
      }
    } else if (ch === '\n') {
      if (inQuotes) {
        // Embedded newline inside quoted field — preserve it
        hasEmbeddedNewlines = true
        current += ch
      } else {
        // Logical line break
        lines.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }

  // Don't forget the last line
  if (current.length > 0) {
    lines.push(current)
  }

  if (hasEmbeddedNewlines) {
    console.warn('raw-metadata: CSV contains embedded newlines in quoted fields — preserved in output')
  }

  return lines
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
 * Append metadata columns to array-based rows (used for XLSX/XLS)
 */
function appendMetadataColumnsToArrays(rows: string[][], metadata: AuctionMetadata): string[][] {
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
      return [...row, ...METADATA_HEADERS]
    } else if (index === 1) {
      return [...row, ...metadataValues]
    } else {
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
