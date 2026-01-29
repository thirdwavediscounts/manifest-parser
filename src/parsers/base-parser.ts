import type { ManifestItem, FieldMapping, RawRow } from './types'
import { getBstockFieldMapping } from './bstock-parser'
import { getTechLiquidatorsFieldMapping } from './techliquidators-parser'
import { parseAmzdRow } from './amzd-parser'
import { getRetailerFieldConfig, isNullValue } from '../retailers'

/**
 * Get field mapping for AMZD (Amazon Direct)
 * Returns standard field mapping for header detection
 */
function getAmzdFieldMapping(): FieldMapping {
  return {
    upc: ['asin'],
    productName: ['item title', 'model', 'brand'],
    unitRetail: ['lot item price'],
    quantity: ['qty'],
  }
}

/**
 * Get field mapping for a specific site
 * Uses retailer-specific configurations from field-mappings.ts
 */
function getFieldMapping(site: string): FieldMapping {
  // Legacy site-specific handlers (for backwards compatibility)
  switch (site) {
    case 'bstock':
      return getBstockFieldMapping()
    case 'techliquidators':
      return getTechLiquidatorsFieldMapping()
    case 'amzd':
      return getAmzdFieldMapping()
  }

  // Use retailer field config for all other retailers
  const config = getRetailerFieldConfig(site)
  return {
    upc: config.itemNumber.map((col) => col.toLowerCase()),
    productName: config.productName.map((col) => col.toLowerCase()),
    unitRetail: config.unitRetail.map((col) => col.toLowerCase()),
    quantity: config.qty.map((col) => col.toLowerCase()),
  }
}

/**
 * Parse AMZD (Amazon Direct) manifest with special handling
 *
 * AMZD manifests require special handling due to:
 * - Misaligned columns (unquoted commas in titles)
 * - ASIN-based identification (not UPC)
 * - 4.5x price multiplier for unit retail
 */
function parseAmzdManifest(
  rawData: Record<string, unknown>[],
  site: string,
  filename: string
): ManifestItem[] {
  if (rawData.length === 0) return []

  const headers = Object.keys(rawData[0])
  const items: ManifestItem[] = []
  const parsedDate = new Date().toISOString()

  for (const row of rawData) {
    // Build cells array: use Object.values but replace the __parsed_extra array
    // with its individual elements (PapaParse includes it as a single array value)
    const rawValues = Object.values(row)
    const extra: unknown[] = (row as any).__parsed_extra || []
    // If __parsed_extra exists, Object.values includes it as an array element — remove it and spread
    const cells = extra.length > 0
      ? [...rawValues.filter(v => v !== extra), ...extra]
      : rawValues
    const parsed = parseAmzdRow(row, cells, headers)

    if (parsed) {
      items.push({
        upc: parsed.asin,
        productName: parsed.productName || 'Unknown Product',
        quantity: parsed.qty,
        unitRetail: parsed.unitRetail,
        sourceSite: site,
        originalFilename: filename,
        parsedDate,
      })
    } else if (cells.length > 0) {
      // Row had data but recovery failed — include with empty fields, never drop
      items.push({
        upc: '',
        productName: 'Unknown Product',
        quantity: 1,
        unitRetail: 0,
        sourceSite: site,
        originalFilename: filename,
        parsedDate,
      })
    }
  }

  return items
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

  // AMZD requires special handling due to misaligned columns
  if (site === 'amzd') {
    return parseAmzdManifest(rawData, site, filename)
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
 * Applies null-value detection - values like "NOT AVAILABLE", "N/A" return empty string
 */
function extractString(row: RawRow, column: string | null): string {
  if (!column || row[column] === undefined || row[column] === null) {
    return ''
  }
  const value = String(row[column]).trim()
  return isNullValue(value) ? '' : value
}

/**
 * Extract number value from row
 * Applies null-value detection - values like "N/A", "NOT AVAILABLE" return 0
 */
function extractNumber(row: RawRow, column: string | null): number {
  if (!column || row[column] === undefined || row[column] === null) {
    return 0
  }

  const value = row[column]

  if (typeof value === 'number') {
    return value
  }

  // Check for null values before parsing
  const strValue = String(value).trim()
  if (isNullValue(strValue)) {
    return 0
  }

  // Parse string value, removing currency symbols and commas
  const cleaned = strValue.replace(/[$,]/g, '')
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
