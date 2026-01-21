/**
 * Unified manifest item representing a single product entry
 */
export interface ManifestItem {
  upc: string
  productName: string
  unitRetail: number
  quantity: number
  sourceSite: string
  originalFilename: string
  parsedDate: string
}

/**
 * Raw row data from CSV/XLSX file before parsing
 */
export type RawRow = Record<string, string | number | undefined>

/**
 * Field mapping configuration for a specific site
 */
export interface FieldMapping {
  upc: string[]
  productName: string[]
  unitRetail: string[]
  quantity: string[]
}

/**
 * Result of parsing a manifest file
 */
export interface ParseResult {
  success: boolean
  items: ManifestItem[]
  errors: ParseError[]
  stats: ParseStats
}

/**
 * Error encountered during parsing
 */
export interface ParseError {
  row: number
  field: string
  message: string
  value?: string
}

/**
 * Statistics about the parsing operation
 */
export interface ParseStats {
  totalRows: number
  parsedRows: number
  skippedRows: number
  totalRetailValue: number
  totalQuantity: number
}

/**
 * Detected manifest file on a page
 */
export interface DetectedManifest {
  url: string
  filename: string
  type: 'csv' | 'xlsx' | 'xls'
  size?: number
}

/**
 * Message types for communication between extension components
 */
export type MessageType =
  | 'DETECT_MANIFESTS'
  | 'MANIFESTS_DETECTED'
  | 'DOWNLOAD_MANIFEST'
  | 'DOWNLOAD_COMPLETE'
  | 'PARSE_FILE'
  | 'PARSE_COMPLETE'
  | 'FETCH_PAGE_TITLES'
  | 'PAGE_TITLES_RESULT'
  | 'GET_SITE_INFO'
  | 'SITE_INFO'
  | 'EXTRACT_LISTING_DATA'
  | 'LISTING_DATA_RESULT'
  | 'ERROR'

/**
 * Data extracted from a B-Stock listing page
 */
export interface ListingData {
  retailer: string
  listingName: string
  auctionEndTime: string | null
  manifestUrl: string | null
  /** Base64 encoded manifest file data (when downloaded via button click) */
  manifestData: string | null
  /** File type of the manifest */
  manifestType: 'csv' | 'xlsx' | 'xls' | null
}

/**
 * Message payload structure
 */
export interface ExtensionMessage<T = unknown> {
  type: MessageType
  payload?: T
  error?: string
}

/**
 * Site information from content script
 */
export interface SiteInfo {
  site: 'bstock' | 'techliquidators' | 'amazon' | 'unknown'
  url: string
  isAuthenticated: boolean
}

/**
 * CSV export options
 */
export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
  delimiter?: string
}
