import type { FieldMapping } from './types'

/**
 * TechLiquidators field mapping
 *
 * NOTE: These mappings are based on common patterns.
 * You may need to update these based on actual TechLiquidators manifest files.
 * Please provide sample manifest files to refine these mappings.
 */
export function getTechLiquidatorsFieldMapping(): FieldMapping {
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
      // Secondary identifiers
      'sku',
      'sku #',
      'product code',
      'product_code',
      'model',
      'model #',
      'model number',
      'model_number',
      'part #',
      'part number',
      'part_number',
      'barcode',
      'ean',
      'asin',
      // TechLiquidators-specific
      'tech item #',
      'tech_item_number',
      'inventory id',
      'inventory_id',
      'product id',
      'product_id',
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
      // TechLiquidators-specific
      'tech description',
      'tech_description',
      'product title',
      'product_title',
      'full description',
      'full_description',
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
      // Original prices
      'original price',
      'original_price',
      'orig price',
      // TechLiquidators-specific
      'retail value',
      'retail_value',
      'market price',
      'market_price',
      'suggested retail',
      'suggested_retail',
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
      // TechLiquidators-specific
      'available',
      'available qty',
      'available_qty',
      'in stock',
      'in_stock',
      'stock qty',
      'stock_qty',
    ],
  }
}

/**
 * Post-process TechLiquidators data for any site-specific transformations
 */
export function postProcessTechLiquidatorsData(
  data: Record<string, unknown>[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const processed = { ...row }

    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'string') {
        // Clean up formatting
        let cleaned = value.trim()

        // Handle price formatting (remove currency symbols if in wrong fields)
        if (key.toLowerCase().includes('upc') || key.toLowerCase().includes('sku')) {
          cleaned = cleaned.replace(/[$,]/g, '')
        }

        processed[key] = cleaned
      }
    }

    return processed
  })
}

/**
 * Detect if data is from TechLiquidators based on header patterns
 */
export function isTechLiquidatorsManifest(headers: string[]): boolean {
  const techIndicators = [
    'tech',
    'liquidator',
    'inventory',
    'stock',
    'wholesale',
  ]

  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  return techIndicators.some((indicator) =>
    normalizedHeaders.some((h) => h.includes(indicator))
  )
}
