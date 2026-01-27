import type { ManifestItem } from '../parsers/types'
import type { AuctionMetadata, UnifiedManifestRow } from './types'

/**
 * CSV column headers in the exact order expected by Retool
 */
const CSV_HEADERS = [
  'item_number',
  'product_name',
  'qty',
  'unit_retail',
  'auction_url',
  'bid_price',
  'shipping_fee',
] as const

/**
 * UTF-8 BOM for Excel compatibility
 */
const UTF8_BOM = '\ufeff'

/**
 * Transform ManifestItem array to UnifiedManifestRow array
 * Metadata is included only on the first row
 */
export function transformToUnified(
  items: ManifestItem[],
  metadata: AuctionMetadata
): UnifiedManifestRow[] {
  return items.map((item, index) => {
    const isFirstRow = index === 0

    return {
      item_number: item.upc,
      product_name: item.productName,
      qty: Math.round(item.quantity),
      unit_retail: item.unitRetail,
      auction_url: isFirstRow ? metadata.auctionUrl : '',
      bid_price: isFirstRow && metadata.bidPrice !== null
        ? formatPrice(metadata.bidPrice)
        : '',
      shipping_fee: isFirstRow && metadata.shippingFee !== null
        ? formatPrice(metadata.shippingFee)
        : '',
    }
  })
}

/**
 * Generate CSV string from UnifiedManifestRow array
 * Includes UTF-8 BOM for Excel compatibility
 */
export function generateUnifiedCsv(
  rows: UnifiedManifestRow[],
  _metadata: AuctionMetadata
): string {
  const lines: string[] = []

  // Add header row
  lines.push(CSV_HEADERS.join(','))

  // Add data rows
  for (const row of rows) {
    const fields = [
      escapeCSVField(row.item_number),
      escapeCSVField(row.product_name),
      row.qty.toString(),
      formatPrice(row.unit_retail),
      escapeCSVField(row.auction_url),
      escapeCSVField(row.bid_price),
      escapeCSVField(row.shipping_fee),
    ]
    lines.push(fields.join(','))
  }

  return UTF8_BOM + lines.join('\n')
}

/**
 * Format a price value as a string with minimal decimal places
 * 29.99 -> "29.99"
 * 29.00 -> "29"
 * 29.50 -> "29.5"
 */
function formatPrice(value: number): string {
  // Use Number to strip trailing zeros
  return String(Number(value.toFixed(2)))
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
