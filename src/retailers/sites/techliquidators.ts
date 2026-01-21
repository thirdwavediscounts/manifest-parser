/**
 * TechLiquidators Retailer Module
 *
 * TechLiquidators uses direct file URL links (.xlsx) for manifest downloads.
 * No blob interception needed - we can fetch the file directly.
 */

import type { RetailerModule } from '../types'

export const techLiquidatorsRetailer: RetailerModule = {
  id: 'techliquidators',
  displayName: 'TechLiquidators',

  urlPatterns: [/techliquidators\.com/i],

  downloadStrategy: 'direct-url',

  downloadButtonConfig: {
    keywords: ['download manifest', 'manifest', 'download'],
    selectors: ['a[href*="pallet_manifests"]', 'a[href*=".xlsx"]', 'a[href*=".csv"]'],
  },

  matches(url: string): boolean {
    return this.urlPatterns.some((pattern) => pattern.test(url))
  },

  needsTabProcessing(url: string): boolean {
    const lowerUrl = url.toLowerCase()

    // Direct file downloads don't need tab processing
    if (lowerUrl.endsWith('.csv') || lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.xls')) {
      return false
    }

    // Detail pages need tab processing to find and click the download link
    if (lowerUrl.includes('techliquidators.com/detail/')) {
      return true
    }

    // Other TechLiquidators pages - assume tab processing needed
    return true
  },

  /**
   * Extract metadata from TechLiquidators page
   * Runs in ISOLATED world
   */
  extractMetadata: function () {
    let listingName = 'TechLiquidators Listing'

    // Method 1: Extract from URL slug (most reliable)
    // URL format: /detail/ptrc76333/electric-transportation-accessories-.../
    const urlMatch = window.location.pathname.match(/\/detail\/[^/]+\/([^/]+)/)
    if (urlMatch && urlMatch[1]) {
      // Convert slug to title: "electric-transportation" -> "Electric Transportation"
      listingName = urlMatch[1]
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .substring(0, 100)
    } else {
      // Method 2: Try page title, remove "TechLiquidators:" prefix
      const title = document.title
      if (title.includes(':')) {
        listingName = title.split(':').slice(1).join(':').trim().substring(0, 100)
      }
    }

    return {
      retailer: 'TechLiquidators',
      listingName,
      auctionEndTime: null, // TechLiquidators doesn't have auction end times
    }
  },

  /**
   * Download manifest from TechLiquidators
   * Returns the download URL - popup will fetch the file directly
   * Runs in MAIN world
   */
  downloadManifest: function () {
    // Find all links on the page
    const allLinks = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]

    // Find the manifest download link
    for (const link of allLinks) {
      const href = link.href || ''
      const text = (link.textContent || '').toLowerCase().trim()

      // Check for pallet_manifests in URL (most reliable)
      if (href.includes('pallet_manifests')) {
        const type = href.toLowerCase().includes('.xlsx')
          ? 'xlsx'
          : href.toLowerCase().includes('.xls')
            ? 'xls'
            : 'csv'
        return Promise.resolve({ data: null, type, downloadUrl: href })
      }

      // Check for direct file URL with download text
      const isFileUrl = /\.(csv|xlsx|xls)(\?|$)/i.test(href)
      const isDownloadText = text.includes('download') || text.includes('manifest')

      if (isFileUrl && isDownloadText) {
        const type = href.toLowerCase().includes('.xlsx')
          ? 'xlsx'
          : href.toLowerCase().includes('.xls')
            ? 'xls'
            : 'csv'
        return Promise.resolve({ data: null, type, downloadUrl: href })
      }
    }

    // No manifest link found
    return Promise.resolve({ data: null, type: null })
  },
}
