/**
 * Retailer module system
 *
 * Exports the registry and all retailer modules.
 * Automatically registers all retailers on import.
 */

// Types
export type {
  DownloadStrategy,
  DownloadButtonConfig,
  ManifestResult,
  MetadataResult,
  RetailerModule,
  SubRetailerMap,
} from './types'

// Field mappings
export { getRetailerFieldConfig, isNullValue, NULL_VALUES } from './field-mappings'
export type { RetailerFieldConfig } from './field-mappings'

// Registry
export { retailerRegistry } from './registry'

// Individual retailers
export { bstockRetailer, SUB_RETAILERS as BSTOCK_SUB_RETAILERS } from './sites/bstock'
export { bstockAuctionRetailer } from './sites/bstock-auction'
export { amazonRetailer } from './sites/amazon'
export { techLiquidatorsRetailer } from './sites/techliquidators'

// Auto-register all retailers
// NOTE: Order matters! More specific URL patterns must be registered first.
import { retailerRegistry } from './registry'
import { bstockAuctionRetailer } from './sites/bstock-auction'
import { bstockRetailer } from './sites/bstock'
import { amazonRetailer } from './sites/amazon'
import { techLiquidatorsRetailer } from './sites/techliquidators'

// Register bstock-auction BEFORE bstock so /[retailer]/auction/ URLs match first
retailerRegistry.register(bstockAuctionRetailer)
retailerRegistry.register(bstockRetailer)
retailerRegistry.register(amazonRetailer)
retailerRegistry.register(techLiquidatorsRetailer)

/**
 * Utility functions for working with retailers
 */

/**
 * Format a retailer name for display
 * Handles B-Stock sub-retailers and proper casing
 */
export function formatRetailerDisplay(retailer: string): string {
  // Handle bstock-marketplace (retailer is in page title, not URL)
  if (retailer === 'bstock-marketplace') {
    return 'B-Stock'
  }

  // Handle known retailers with proper casing
  const displayNames: Record<string, string> = {
    qvc: 'QVC',
    bayer: 'Bayer',
    acehardware: 'Ace Hardware',
    jcpenney: 'JCPenney',
    techliquidators: 'TechLiquidators',
    amazon: 'Amazon',
    bstock: 'B-Stock',
    target: 'Target',
    costco: 'Costco',
    walmart: 'Walmart',
    homedepot: 'Home Depot',
    lowes: 'Lowes',
    bestbuy: 'Best Buy',
    macys: 'Macys',
    nordstrom: 'Nordstrom',
    kohls: 'Kohls',
  }

  const lowerRetailer = retailer.toLowerCase()
  if (displayNames[lowerRetailer]) {
    return displayNames[lowerRetailer]
  }

  // Capitalize first letter as fallback
  return retailer.charAt(0).toUpperCase() + retailer.slice(1)
}

/**
 * Detect retailer from URL (for initial display before page loads)
 */
export function detectRetailerFromUrl(url: string): string {
  const retailer = retailerRegistry.findByUrl(url)
  if (retailer) {
    // For B-Stock, try to get sub-retailer from URL
    if (retailer.id === 'bstock') {
      const auctionMatch = url.toLowerCase().match(/\/([a-z0-9-]+)\/auction\//)
      if (auctionMatch) {
        const subRetailer = auctionMatch[1]
        if (!['buy', 'sell', 'about', 'help', 'login'].includes(subRetailer)) {
          return formatRetailerDisplay(subRetailer)
        }
      }
      // Marketplace URL - will be detected from page content later
      return 'B-Stock'
    }
    return retailer.displayName
  }
  return 'Unknown'
}

/**
 * Check if a URL needs tab processing
 */
export function needsTabProcessing(url: string): boolean {
  return retailerRegistry.needsTabProcessing(url)
}
