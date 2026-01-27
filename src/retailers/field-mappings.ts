/**
 * Retailer Field Mapping Configuration
 *
 * Defines how each retailer's manifest columns map to unified fields.
 * Handles null value detection and field extraction with fallback columns.
 */

/**
 * Configuration for mapping retailer columns to unified fields
 */
export interface RetailerFieldConfig {
  /** Column names that map to item_number (UPC, ASIN, Item #, etc.) */
  itemNumber: string[]
  /** Column names that map to product_name */
  productName: string[]
  /** Column names that map to qty */
  qty: string[]
  /** Column names that map to unit_retail */
  unitRetail: string[]
}

/**
 * Normalized null value strings (lowercase)
 * Values in manifests that should be treated as empty/missing
 */
export const NULL_VALUES: readonly string[] = [
  'n/a',
  'not available',
  '-',
  'none',
  '0000000000',
  '',
]

/**
 * Check if a value represents a null/empty value in manifest data
 *
 * @param value - The string value to check
 * @returns true if the value should be treated as null/empty
 */
export function isNullValue(value: string): boolean {
  return NULL_VALUES.includes(value.toLowerCase().trim())
}

/**
 * Default field mapping for unknown retailers
 */
const DEFAULT_CONFIG: RetailerFieldConfig = {
  itemNumber: ['UPC', 'Item #', 'ASIN', 'SKU', 'Product ID'],
  productName: ['Item Description', 'Product Name', 'Description', 'Title'],
  qty: ['Qty', 'Quantity', 'Units'],
  unitRetail: ['Unit Retail', 'Retail Price', 'MSRP', 'Price'],
}

/**
 * Retailer-specific field mapping configurations
 */
const RETAILER_CONFIGS: Map<string, RetailerFieldConfig> = new Map([
  // ACE: Uses UPC as primary identifier
  [
    'ace',
    {
      itemNumber: ['UPC'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // AMZ (Amazon): Uses ASIN as identifier
  [
    'amz',
    {
      itemNumber: ['ASIN'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // ATT: Uses UPC (may contain "NOT AVAILABLE")
  [
    'att',
    {
      itemNumber: ['UPC'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // BY: Uses "Quantity" instead of "Qty"
  [
    'by',
    {
      itemNumber: ['UPC'],
      productName: ['Item Description'],
      qty: ['Quantity'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // Costco: Uses Item # as identifier
  [
    'costco',
    {
      itemNumber: ['Item #'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // JCP: Uses Brand as identifier fallback, Brand + Subcategory for name
  [
    'jcp',
    {
      itemNumber: ['Item #', 'Brand'],
      productName: ['Brand', 'Subcategory'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // QVC: Uses Item # as identifier
  [
    'qvc',
    {
      itemNumber: ['Item #'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // RC: Uses Item # with UPC fallback
  [
    'rc',
    {
      itemNumber: ['Item #', 'UPC'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // TGT (Target): Prioritizes UPC over Item #
  [
    'tgt',
    {
      itemNumber: ['UPC', 'Item #'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],

  // TL (TechLiquidators): Uses different column names
  [
    'tl',
    {
      itemNumber: ['UPC'],
      productName: ['Product Name'],
      qty: ['Quantity', 'Qty'],
      unitRetail: ['Orig. Retail', 'Unit Retail'],
    },
  ],

  // B-Stock: Generic B-Stock platform config
  [
    'bstock',
    {
      itemNumber: ['Item #'],
      productName: ['Item Description'],
      qty: ['Qty'],
      unitRetail: ['Unit Retail'],
    },
  ],
])

/**
 * Get field mapping configuration for a retailer
 *
 * @param retailerId - The retailer identifier (case-insensitive)
 * @returns Field mapping configuration for the retailer, or default config if unknown
 */
export function getRetailerFieldConfig(retailerId: string): RetailerFieldConfig {
  return RETAILER_CONFIGS.get(retailerId.toLowerCase()) ?? DEFAULT_CONFIG
}

/**
 * Extract a field value from a row using a list of column names
 *
 * Tries each column name in order and returns the first non-null value found.
 * Applies null value detection - values like "NOT AVAILABLE", "N/A", etc. return empty string.
 *
 * @param row - The row data object
 * @param columnNames - Array of column names to try, in priority order
 * @returns The extracted value, or empty string if not found or null value
 */
export function extractField(
  row: Record<string, unknown>,
  columnNames: string[]
): string {
  for (const col of columnNames) {
    const value = row[col]
    if (value !== undefined && value !== null) {
      const strValue = String(value).trim()
      return isNullValue(strValue) ? '' : strValue
    }
  }
  return ''
}
