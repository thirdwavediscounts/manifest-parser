/**
 * Types for the retailer module system
 */

/** Strategy for downloading manifest files */
export type DownloadStrategy = 'direct-url' | 'blob-intercept'

/** Configuration for finding download buttons on the page */
export interface DownloadButtonConfig {
  /** Keywords to search for in button text (lowercase) */
  keywords: string[]
  /** CSS selectors to try if keywords don't match */
  selectors?: string[]
}

/** Result from downloading a manifest file */
export interface ManifestResult {
  /** Base64 encoded file data */
  data: string | null
  /** File type */
  type: 'csv' | 'xlsx' | 'xls' | null
  /** Direct download URL (for direct-url strategy - popup will fetch this) */
  downloadUrl?: string
}

/** Result from extracting page metadata */
export interface MetadataResult {
  /** Retailer display name (e.g., "QVC", "Target") */
  retailer: string
  /** Listing/auction name */
  listingName: string
  /** Auction end time (ISO string) or null */
  auctionEndTime: string | null
  /** Current bid amount (null if not found or not applicable, e.g., fixed-price) */
  bidPrice: number | null
  /** Shipping cost (null if TBD or not found) */
  shippingFee: number | null
}

/**
 * Interface for retailer modules
 *
 * Each retailer (B-Stock, Amazon, TechLiquidators, etc.) implements this interface
 * to provide site-specific logic for:
 * - URL matching
 * - Metadata extraction
 * - Manifest downloading
 */
export interface RetailerModule {
  /** Unique identifier (e.g., "bstock", "amazon", "techliquidators") */
  id: string

  /** Human-readable display name (e.g., "B-Stock", "Amazon") */
  displayName: string

  /** URL patterns this retailer handles */
  urlPatterns: RegExp[]

  /** Strategy for downloading manifests on this site */
  downloadStrategy: DownloadStrategy

  /** Configuration for finding download buttons */
  downloadButtonConfig: DownloadButtonConfig

  /** Check if a URL belongs to this retailer */
  matches(url: string): boolean

  /**
   * Check if URL needs tab processing (browser navigation + script execution)
   * vs direct file download
   */
  needsTabProcessing(url: string): boolean

  /**
   * Extract metadata from the current page
   *
   * This function runs in ISOLATED world in the browser tab.
   * It can access DOM and special elements like __NEXT_DATA__.
   *
   * Returns retailer name, listing name, and auction end time.
   */
  extractMetadata: () => MetadataResult

  /**
   * Download the manifest file from the current page
   *
   * This function runs in MAIN world in the browser tab.
   * It can intercept blob creation and trigger download buttons.
   *
   * Returns base64 encoded file data and file type.
   */
  downloadManifest: () => Promise<ManifestResult>
}

/**
 * Sub-retailer display name mapping
 * Used for sites like B-Stock that host multiple retailers
 */
export interface SubRetailerMap {
  [key: string]: string
}
