import type { FieldMapping } from './types'

/**
 * Bstock field mapping
 *
 * NOTE: These mappings are based on common patterns.
 * You may need to update these based on actual Bstock manifest files.
 * Please provide sample manifest files to refine these mappings.
 */
export function getBstockFieldMapping(): FieldMapping {
  return {
    upc: [
      // Primary identifiers
      'upc',
      'upc code',
      'upc_code',
      'item #',
      'item number',
      'item_number',
      'item no',
      'item no.',
      // Secondary identifiers
      'sku',
      'sku #',
      'sku_number',
      'product code',
      'product_code',
      'asin',
      'model',
      'model #',
      'model number',
      'model_number',
      'part #',
      'part number',
      'part_number',
      'barcode',
      'ean',
      // Bstock-specific variations
      'lot item #',
      'lot_item_number',
      'manifest item #',
      'manifest_item_number',
    ],
    productName: [
      // Primary names
      'product name',
      'product_name',
      'item name',
      'item_name',
      'name',
      'title',
      // Descriptions
      'description',
      'item description',
      'item_description',
      'product description',
      'product_description',
      'product title',
      'product_title',
      // Bstock-specific
      'lot description',
      'lot_description',
      'manifest description',
      'manifest_description',
      'item',
      'product',
    ],
    unitRetail: [
      // Primary retail prices
      'unit retail',
      'unit_retail',
      'retail',
      'retail price',
      'retail_price',
      'msrp',
      'list price',
      'list_price',
      // Unit prices
      'unit price',
      'unit_price',
      'price',
      'price each',
      'price_each',
      // Original prices
      'original price',
      'original_price',
      'orig retail',
      'orig_retail',
      // Bstock-specific
      'retail value',
      'retail_value',
      'est retail',
      'est_retail',
      'estimated retail',
      'estimated_retail',
    ],
    quantity: [
      // Primary quantity fields
      'quantity',
      'qty',
      'units',
      'count',
      'unit count',
      'unit_count',
      // Item counts
      'item count',
      'item_count',
      'items',
      'total units',
      'total_units',
      'total qty',
      'total_qty',
      // Bstock-specific
      'pallet qty',
      'pallet_qty',
      'lot qty',
      'lot_qty',
      'manifest qty',
      'manifest_qty',
      'available qty',
      'available_qty',
    ],
  }
}

/**
 * Post-process Bstock data for any site-specific transformations
 */
export function postProcessBstockData(
  data: Record<string, unknown>[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const processed = { ...row }

    // Handle combined fields (e.g., "UPC/SKU" columns)
    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'string') {
        // Clean up common formatting issues
        processed[key] = value
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
    }

    return processed
  })
}

/**
 * Detect if data is from Bstock based on header patterns
 */
export function isBstockManifest(headers: string[]): boolean {
  const bstockIndicators = [
    'lot',
    'auction',
    'pallet',
    'bstock',
    'b-stock',
    'liquidation',
  ]

  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  return bstockIndicators.some((indicator) =>
    normalizedHeaders.some((h) => h.includes(indicator))
  )
}
