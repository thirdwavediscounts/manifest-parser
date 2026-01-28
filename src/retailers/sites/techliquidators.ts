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
   *
   * Naming convention: "[Title] [Condition] [MilitaryTime]"
   * Example: "Electric Transportation & Accessories UR 1139"
   *
   * Condition abbreviations:
   * - UR: uninspected returns
   * - UW: used & working
   * - NC: new condition
   * - LN: like new
   * - S: salvage
   */
  extractMetadata: function () {
    const bodyText = document.body.innerText

    /**
     * Parse price string to number
     * Handles currency symbols, commas, and non-numeric values like "TBD"
     */
    function parsePrice(text: string | null): number | null {
      if (!text) return null
      // Remove currency symbols, commas, whitespace
      const cleaned = text.replace(/[$,\s]/g, '').trim()
      // Handle "TBD", "N/A", "Calculated", "Free" etc
      if (!/^\d/.test(cleaned)) return null
      const value = parseFloat(cleaned)
      return isNaN(value) ? null : value
    }

    /**
     * Extract bid price from DOM
     * TechLiquidators uses .lot-pricing-box for pricing display
     *
     * DOM structure reference (from retailer-selectors-data.json):
     * - .lot-pricing-box: Main pricing container
     * - .lot-pricing-box-item: Individual price rows
     * - .col-xs-3: Price values in left column
     * - .lot-total-price-value: Est. Total value
     */
    function extractBidPrice(): number | null {
      // Primary: Try .lot-pricing-box structure (TechLiquidators specific)
      const pricingBox = document.querySelector('.lot-pricing-box')
      if (pricingBox) {
        // Look for price items - usually the first .col-xs-3 contains current bid
        const priceItems = pricingBox.querySelectorAll('.lot-pricing-box-item')
        for (const item of priceItems) {
          const text = (item.textContent || '').toLowerCase()
          // Look for "current bid" or "bid" row
          if (text.includes('current bid') || text.includes('high bid') || text.includes('bid')) {
            const priceEl = item.querySelector('.col-xs-3')
            if (priceEl?.textContent) {
              const parsed = parsePrice(priceEl.textContent)
              if (parsed !== null) return parsed
            }
          }
        }
        // Fallback: just get first price value from the box
        const firstPrice = pricingBox.querySelector('.col-xs-3')
        if (firstPrice?.textContent) {
          const parsed = parsePrice(firstPrice.textContent)
          if (parsed !== null) return parsed
        }
      }

      // Fallback: Search page text for "Current Bid: $X,XXX" pattern
      const bidPatterns = [
        /Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /Bid\s*Price[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
      ]

      for (const pattern of bidPatterns) {
        const match = bodyText.match(pattern)
        if (match) {
          const parsed = parsePrice(match[1])
          if (parsed !== null) return parsed
        }
      }

      return null
    }

    /**
     * Extract shipping fee from DOM
     * TechLiquidators often has "Shipping Included" or shipping in .lot-pricing-box
     *
     * DOM structure reference (from retailer-selectors-data.json):
     * - .lot-pricing-box: Main pricing container
     * - .lot-pricing-box-item: Individual price rows (includes shipping)
     * - Shipping type: May show "Shipping Included"
     */
    function extractShippingFee(): number | null {
      // Check for "Shipping Included" indicator (common on TechLiquidators)
      if (/shipping\s*included/i.test(bodyText)) {
        // Shipping included in total - look for the shipping row value
        const pricingBox = document.querySelector('.lot-pricing-box')
        if (pricingBox) {
          const priceItems = pricingBox.querySelectorAll('.lot-pricing-box-item')
          for (const item of priceItems) {
            const text = (item.textContent || '').toLowerCase()
            if (text.includes('shipping')) {
              const priceEl = item.querySelector('.col-xs-3')
              if (priceEl?.textContent) {
                const parsed = parsePrice(priceEl.textContent)
                if (parsed !== null) return parsed
              }
            }
          }
        }
      }

      // Free shipping check
      if (/shipping[:\s]*free/i.test(bodyText) || /free\s*shipping/i.test(bodyText)) {
        return 0
      }

      // Look in .lot-pricing-box for shipping row
      const pricingBox = document.querySelector('.lot-pricing-box')
      if (pricingBox) {
        const priceItems = pricingBox.querySelectorAll('.lot-pricing-box-item')
        for (const item of priceItems) {
          const text = (item.textContent || '').toLowerCase()
          if (text.includes('shipping') || text.includes('freight')) {
            const priceEl = item.querySelector('.col-xs-3')
            if (priceEl?.textContent) {
              const parsed = parsePrice(priceEl.textContent)
              if (parsed !== null) return parsed
            }
          }
        }
      }

      // Fallback: Search page text for shipping patterns
      const shippingPatterns = [
        /Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /Estimated\s*Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
      ]

      for (const pattern of shippingPatterns) {
        const match = bodyText.match(pattern)
        if (match) {
          const parsed = parsePrice(match[1])
          if (parsed !== null) return parsed
        }
      }

      return null
    }

    // Extract title from h1 (copy extension logic exactly)
    let title = extractTitle()

    // Extract condition abbreviation
    const conditionAbbrev = extractConditionAbbrev(bodyText)

    // Extract PST military time from "(XXXX)" format on page
    const pstTime = extractPstTime(bodyText)

    // Build listing name: "Title Condition Time"
    // Filename format: TL_<listingName>.csv (max 50 chars)
    // TL_ = 3 chars, .csv = 4 chars, so listingName can be max 43 chars
    // Truncate TITLE first to leave room for condition and time
    const suffixLen = (conditionAbbrev ? conditionAbbrev.length + 1 : 0) + (pstTime ? pstTime.length + 1 : 0)
    const maxTitleLen = Math.max(10, 43 - suffixLen)
    if (title.length > maxTitleLen) {
      title = title.substring(0, maxTitleLen).trim()
    }

    // Example: "Electric Transportation Accessories UR 1139"
    const parts = [title, conditionAbbrev, pstTime].filter((p) => p.length > 0)
    const listingName = parts.join(' ') || 'TechLiquidators Listing'

    // Extract bid price and shipping fee from DOM
    const bidPrice = extractBidPrice()
    const shippingFee = extractShippingFee()

    return {
      retailer: 'TL',
      listingName,
      auctionEndTime: null,
      bidPrice,
      shippingFee,
    }

    function extractTitle(): string {
      // Copy extension logic exactly: h1.textContent.split(' - ')[0]
      const h1 = document.querySelector('h1')
      if (h1 && h1.textContent) {
        return h1.textContent.trim().split(' - ')[0]
      }

      // Fallback to URL slug
      const urlMatch = window.location.pathname.match(/\/detail\/[^/]+\/([^/]+)/)
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1]
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
      return ''
    }

    function extractConditionAbbrev(text: string): string {
      const conditionMatch = text.match(/Condition:\s*([^\n]+)/i)
      if (!conditionMatch) return ''

      const condText = conditionMatch[1].toLowerCase()

      // Check more specific conditions first
      if (condText.includes('uninspected return')) return 'UR'
      if (condText.includes('uninspected')) return 'UR'
      if (condText.includes('returned') && condText.includes('damaged')) return 'RD'
      if (condText.includes('used good')) return 'UG'
      if (condText.includes('used fair')) return 'UF'
      if (condText.includes('used working')) return 'UW'
      if (condText.includes('used')) return 'UW'
      if (condText.includes('brand new')) return 'NC'
      if (condText.includes('like new')) return 'LN'
      if (condText.includes('new condition')) return 'NC'
      if (condText.includes('new')) return 'NC'
      if (condText.includes('salvage')) return 'S'
      if (condText.includes('damaged')) return 'D'
      if (condText.includes('return')) return 'R'
      if (condText.includes('overstock')) return 'OS'
      if (condText.includes('mixed')) return 'MC'
      if (condText.includes('data cleared')) return 'DC'
      if (condText.includes('grade a')) return 'GA'
      if (condText.includes('grade b')) return 'GB'
      if (condText.includes('grade c')) return 'GC'

      return ''
    }

    function extractPstTime(text: string): string {
      // TechLiquidators shows: "End time in PST: 11:39 AM (1139 military)"
      // Extract the military time from parentheses
      const militaryMatch = text.match(/PST[^(]*\((\d{3,4})\s*(?:military)?\)/i)
      if (militaryMatch) {
        return militaryMatch[1] // e.g., "1139"
      }

      // Fallback: try to extract from "PST X:XX AM/PM" format
      const pstMatch = text.match(/PST\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (pstMatch) {
        return `${pstMatch[1]}${pstMatch[2]}`
      }
      return ''
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
