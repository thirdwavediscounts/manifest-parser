import type { ManifestItem, FieldMapping, RawRow } from './types'
import { getBstockFieldMapping } from './bstock-parser'
import { getTechLiquidatorsFieldMapping } from './techliquidators-parser'

/**
 * Default field mapping for unknown sources
 * Maps common column name variations to unified fields
 */
const defaultFieldMapping: FieldMapping = {
  upc: [
    'upc',
    'upc code',
    'upc_code',
    'item #',
    'item number',
    'item_number',
    'sku',
    'product code',
    'barcode',
    'ean',
    'asin',
    'model',
    'model number',
    'model_number',
    'part number',
    'part_number',
    'item id',
    'item_id',
    'product id',
    'product_id',
  ],
  productName: [
    'product name',
    'product_name',
    'name',
    'description',
    'item description',
    'item_description',
    'product description',
    'product_description',
    'title',
    'item name',
    'item_name',
    'product',
    'item',
  ],
  unitRetail: [
    'unit retail',
    'unit_retail',
    'retail',
    'retail price',
    'retail_price',
    'msrp',
    'price',
    'unit price',
    'unit_price',
    'original price',
    'original_price',
    'list price',
    'list_price',
  ],
  quantity: [
    'quantity',
    'qty',
    'units',
    'count',
    'item count',
    'item_count',
    'unit count',
    'unit_count',
    'total units',
    'total_units',
    'pallet qty',
    'pallet_qty',
  ],
}

/**
 * Get field mapping for a specific site
 */
function getFieldMapping(site: string): FieldMapping {
  switch (site) {
    case 'bstock':
      return getBstockFieldMapping()
    case 'techliquidators':
      return getTechLiquidatorsFieldMapping()
    default:
      return defaultFieldMapping
  }
}

/**
 * Parse raw data into unified ManifestItem array
 */
export function parseManifestData(
  rawData: Record<string, unknown>[],
  site: string,
  filename: string
): ManifestItem[] {
  if (!rawData || rawData.length === 0) {
    return []
  }

  const mapping = getFieldMapping(site)
  const headers = Object.keys(rawData[0])
  const columnMap = mapColumns(headers, mapping)

  const items: ManifestItem[] = []
  const parsedDate = new Date().toISOString()

  for (const row of rawData) {
    const item = parseRow(row as RawRow, columnMap, site, filename, parsedDate)
    if (item && isValidItem(item)) {
      items.push(item)
    }
  }

  return items
}

/**
 * Map actual column names to unified fields
 */
function mapColumns(
  headers: string[],
  mapping: FieldMapping
): Record<keyof FieldMapping, string | null> {
  const result: Record<keyof FieldMapping, string | null> = {
    upc: null,
    productName: null,
    unitRetail: null,
    quantity: null,
  }

  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  for (const [field, variations] of Object.entries(mapping) as [keyof FieldMapping, string[]][]) {
    for (const variation of variations) {
      const index = normalizedHeaders.findIndex(
        (h) => h === variation.toLowerCase() || h.includes(variation.toLowerCase())
      )
      if (index !== -1) {
        result[field] = headers[index]
        break
      }
    }
  }

  return result
}

/**
 * Parse a single row into a ManifestItem
 */
function parseRow(
  row: RawRow,
  columnMap: Record<keyof FieldMapping, string | null>,
  site: string,
  filename: string,
  parsedDate: string
): ManifestItem | null {
  const upc = extractString(row, columnMap.upc)
  const productName = extractString(row, columnMap.productName)
  const unitRetail = extractNumber(row, columnMap.unitRetail)
  const quantity = extractNumber(row, columnMap.quantity) || 1

  // Skip rows without essential data
  if (!upc && !productName) {
    return null
  }

  return {
    upc: upc || '',
    productName: productName || 'Unknown Product',
    unitRetail: unitRetail || 0,
    quantity: Math.max(1, Math.round(quantity)),
    sourceSite: site,
    originalFilename: filename,
    parsedDate,
  }
}

/**
 * Extract string value from row
 */
function extractString(row: RawRow, column: string | null): string {
  if (!column || row[column] === undefined || row[column] === null) {
    return ''
  }
  return String(row[column]).trim()
}

/**
 * Extract number value from row
 */
function extractNumber(row: RawRow, column: string | null): number {
  if (!column || row[column] === undefined || row[column] === null) {
    return 0
  }

  const value = row[column]

  if (typeof value === 'number') {
    return value
  }

  // Parse string value, removing currency symbols and commas
  const cleaned = String(value).replace(/[$,]/g, '').trim()
  const parsed = parseFloat(cleaned)

  return isNaN(parsed) ? 0 : parsed
}

/**
 * Check if an item has minimum required data
 */
function isValidItem(item: ManifestItem): boolean {
  // Must have either UPC or product name
  const hasIdentifier = item.upc.length > 0 || item.productName.length > 0
  // Must have valid quantity
  const hasQuantity = item.quantity > 0

  return hasIdentifier && hasQuantity
}

/**
 * Merge multiple field mappings
 */
export function mergeFieldMappings(...mappings: FieldMapping[]): FieldMapping {
  const merged: FieldMapping = {
    upc: [],
    productName: [],
    unitRetail: [],
    quantity: [],
  }

  for (const mapping of mappings) {
    for (const key of Object.keys(merged) as (keyof FieldMapping)[]) {
      merged[key] = [...new Set([...merged[key], ...mapping[key]])]
    }
  }

  return merged
}
