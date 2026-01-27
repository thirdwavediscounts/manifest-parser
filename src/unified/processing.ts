import type { UnifiedManifestRow } from './types'

/**
 * Regex pattern for non-printable characters to remove:
 * - Control characters (0x00-0x1F, except we want to remove them all after trim)
 * - DEL character (0x7F)
 * - Zero-width characters (U+200B, U+200C, U+200D, U+FEFF)
 * - Other invisible format chars
 */
const NON_PRINTABLE_REGEX = /[\x00-\x1F\x7F\u200B-\u200F\uFEFF]/g

/**
 * Clean a string field by trimming whitespace and removing non-printable characters
 */
export function cleanField(value: string): string {
  // Remove non-printable characters first
  const withoutNonPrintable = value.replace(NON_PRINTABLE_REGEX, '')
  // Then trim whitespace
  return withoutNonPrintable.trim()
}

/**
 * Clean all string fields in a row
 * item_number has special handling: ALL whitespace is stripped (not just trimmed)
 */
export function cleanRow(row: UnifiedManifestRow): UnifiedManifestRow {
  // For item_number: remove non-printable chars AND all whitespace
  const cleanedItemNumber = row.item_number
    .replace(NON_PRINTABLE_REGEX, '')
    .replace(/\s/g, '')

  return {
    item_number: cleanedItemNumber,
    product_name: cleanField(row.product_name),
    qty: row.qty,
    unit_retail: row.unit_retail,
    auction_url: cleanField(row.auction_url),
    bid_price: cleanField(row.bid_price),
    shipping_fee: cleanField(row.shipping_fee),
  }
}

/**
 * Normalize an item number for comparison (case-insensitive, strip leading zeros)
 * Used internally for duplicate detection - does NOT modify the stored value
 */
export function normalizeItemNumber(value: string): string {
  if (value === '') {
    return ''
  }

  // Lowercase first
  const lowered = value.toLowerCase()

  // Strip leading zeros (but keep at least one char if all zeros)
  const stripped = lowered.replace(/^0+/, '')

  // If all zeros, return single '0'
  return stripped === '' ? '0' : stripped
}

/**
 * Deduplicate rows by merging items with the same normalized item_number
 *
 * Merge rules:
 * - qty = SUM of all quantities
 * - product_name = from row with HIGHEST qty (tiebreaker: first seen)
 * - unit_retail = HIGHEST value across all rows
 * - item_number = LONGEST format (preserves leading zeros)
 * - auction_url, bid_price, shipping_fee = from first row in group
 *
 * Rows with empty item_number are NEVER merged - kept as-is
 */
export function deduplicateRows(rows: UnifiedManifestRow[]): UnifiedManifestRow[] {
  if (rows.length === 0) {
    return []
  }

  // Separate empty item_number rows (never merge them)
  const emptyItemRows: UnifiedManifestRow[] = []
  const rowsToGroup: UnifiedManifestRow[] = []

  for (const row of rows) {
    if (row.item_number === '') {
      emptyItemRows.push(row)
    } else {
      rowsToGroup.push(row)
    }
  }

  // Group rows by normalized item_number
  const groups = new Map<string, UnifiedManifestRow[]>()

  for (const row of rowsToGroup) {
    const key = normalizeItemNumber(row.item_number)
    const existing = groups.get(key)
    if (existing) {
      existing.push(row)
    } else {
      groups.set(key, [row])
    }
  }

  // Merge each group
  const mergedRows: UnifiedManifestRow[] = []

  for (const groupRows of groups.values()) {
    if (groupRows.length === 1) {
      // No merge needed
      mergedRows.push(groupRows[0])
    } else {
      mergedRows.push(mergeGroup(groupRows))
    }
  }

  // Return merged rows + empty item_number rows (preserved as-is)
  return [...mergedRows, ...emptyItemRows]
}

/**
 * Merge a group of rows with the same normalized item_number
 */
function mergeGroup(rows: UnifiedManifestRow[]): UnifiedManifestRow {
  const firstRow = rows[0]

  // Sum all quantities
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0)

  // Find highest unit_retail
  const highestRetail = Math.max(...rows.map(r => r.unit_retail))

  // Find row with highest quantity (for product_name)
  // Tiebreaker: first seen (preserve insertion order)
  let highestQtyRow = firstRow
  for (const row of rows) {
    if (row.qty > highestQtyRow.qty) {
      highestQtyRow = row
    }
  }

  // Find longest item_number format
  let longestItemNumber = firstRow.item_number
  for (const row of rows) {
    if (row.item_number.length > longestItemNumber.length) {
      longestItemNumber = row.item_number
    }
  }

  return {
    item_number: longestItemNumber,
    product_name: highestQtyRow.product_name,
    qty: totalQty,
    unit_retail: highestRetail,
    // Metadata from first row
    auction_url: firstRow.auction_url,
    bid_price: firstRow.bid_price,
    shipping_fee: firstRow.shipping_fee,
  }
}
