/**
 * B-Stock Retailer Auction Module
 *
 * Handles retailer-specific auction pages on B-Stock:
 * - JCPenney: bstock.com/jcpenney/auction/...
 * - Ace Hardware: bstock.com/acehardware/auction/...
 * - Bayer: bstock.com/bayer/auction/...
 * - QVC: bstock.com/qvc/auction/...
 *
 * These pages have a different layout from the B-Stock marketplace:
 * - Two-step download: Click "Manifest" button to open panel, then "Download Full Manifest"
 * - Retailer name extracted from URL path
 */

import type { RetailerModule, SubRetailerMap } from '../types'

/** Sub-retailers with auction pages on B-Stock - mapped to short retailer codes */
const SUB_RETAILERS: SubRetailerMap = {
  qvc: 'QVC',
  bayer: 'BY',
  acehardware: 'ACE',
  jcpenney: 'JCP',
}

export const bstockAuctionRetailer: RetailerModule = {
  id: 'bstock-auction',
  displayName: 'B-Stock Auction',

  // Match retailer-specific auction URLs: bstock.com/[retailer]/auction/
  urlPatterns: [/bstock\.com\/[a-z0-9-]+\/auction\//i],

  downloadStrategy: 'direct-url',

  downloadButtonConfig: {
    keywords: ['download full manifest', 'download manifest'],
    selectors: ['button[id*="manifest"]'],
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

    return true
  },

  /**
   * Extract metadata from B-Stock retailer auction page
   * Extracts retailer CODE, product name (cleaned), condition abbreviation, and PST time
   * Runs in ISOLATED world
   */
  extractMetadata: function () {
    const url = window.location.href.toLowerCase()
    const pageTitle = document.title

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
     * Look for labels like "Current Bid:", "High Bid:", "Winning Bid:"
     *
     * Bid price selectors tried in order:
     * 1. #current_bid_amount — B-Stock Classic bid display (verified 2026-01-29)
     * 2. Fallback regex patterns in page body text:
     *    - /Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /Bid\s*Amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     */
    function extractBidPrice(): number | null {
      // Primary: B-Stock Classic uses #current_bid_amount for the bid value
      const bidAmountEl = document.querySelector('#current_bid_amount')
      if (bidAmountEl?.textContent) {
        const parsed = parsePrice(bidAmountEl.textContent)
        if (parsed !== null) return parsed
      }

      // Fallback: Search page text for "Current Bid: $X,XXX" pattern
      // This catches bid amounts even if CSS selectors fail due to layout changes
      const bodyText = document.body.innerText
      const bidPatterns = [
        /Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Current Bid: $1,250"
        /Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Winning Bid: $1,250"
        /High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "High Bid: $1,250"
        /Bid\s*Amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Bid Amount: $1,250"
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
     * Look for "Shipping:", "Freight:", "Estimated Shipping:" labels
     *
     * Shipping selectors tried in order:
     * 1. #shipping_total_cost — B-Stock Classic shipping container (verified 2026-01-29)
     *    - Check for "free" text → return 0
     *    - .price child element contains the dollar amount
     * 2. Free shipping check in body text: returns 0 if "free" found
     * 3. Fallback regex patterns in page body text:
     *    - /Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /Estimated\s*Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     *    - /Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
     */
    function extractShippingFee(): number | null {
      // Primary: .auction-data-label sibling approach (most reliable — works even
      // when #shipping_total_cost is inside an unrendered popup)
      const labels = document.querySelectorAll('.auction-data-label')
      for (const label of labels) {
        const labelText = (label.textContent || '').toLowerCase().trim()
        if (labelText.includes('shipping cost')) {
          const parent = label.parentElement
          if (parent) {
            const valueDiv = parent.querySelector('.auction-data-content, div:not(.auction-data-label)')
            if (valueDiv) {
              const text = (valueDiv.textContent || '').toLowerCase()
              if (text.includes('free')) return 0
              // Check for nested .price child (e.g. <span class="price">$397.86</span>)
              const priceChild = valueDiv.querySelector('.price')
              if (priceChild?.textContent) {
                const parsed = parsePrice(priceChild.textContent)
                if (parsed !== null) return parsed
              }
              const parsed = parsePrice(valueDiv.textContent)
              if (parsed !== null) return parsed
            }
          }
          // Also try next sibling
          const nextEl = label.nextElementSibling
          if (nextEl) {
            const text = (nextEl.textContent || '').toLowerCase()
            if (text.includes('free')) return 0
            const parsed = parsePrice(nextEl.textContent)
            if (parsed !== null) return parsed
          }
        }
      }

      // Secondary: #shipping_total_cost selector (works when element is rendered)
      const shippingContainer = document.querySelector('#shipping_total_cost')
      if (shippingContainer) {
        const text = (shippingContainer.textContent || '').toLowerCase()
        if (text.includes('free')) return 0
        const priceEl = shippingContainer.querySelector('.price')
        if (priceEl?.textContent) {
          const parsed = parsePrice(priceEl.textContent)
          if (parsed !== null) return parsed
        }
        const parsed = parsePrice(shippingContainer.textContent)
        if (parsed !== null) return parsed
      }

      // Tertiary: Search page text for shipping patterns
      // This catches shipping fees even if CSS selectors fail due to layout changes
      const bodyText = document.body.innerText
      // Free shipping check first (return 0, not null)
      if (/shipping[:\s]*free/i.test(bodyText) || /free\s*shipping/i.test(bodyText)) {
        return 0
      }

      // Shipping amount patterns
      const shippingPatterns = [
        /Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Shipping: $150"
        /Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Freight: $150"
        /Estimated\s*Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Estimated Shipping: $150"
        /Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i, // "Delivery: $150"
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

    // Extract retailer CODE from URL
    const retailer = extractRetailerCode()

    // Parse title: "ProductInfo, Condition | Closes: Date Time PST | Retailer..."
    const parts = pageTitle.split('|').map((p) => p.trim())
    const productPart = parts[0] || ''
    const closesPart = parts[1] || ''

    // Clean product name
    let productName = productPart
      // Remove "X Pallets of" or "X Boxes of" prefix
      .replace(/^\d+\s+(?:pallet|box)(?:es|s)?\s+of\s+/i, '')
      // Remove "& More" suffix
      .replace(/\s*&\s*More\s*/gi, ' ')
      .trim()

    // Remove "by [Brand]..." suffix
    const byIndex = productName.toLowerCase().indexOf(' by ')
    if (byIndex > 0) {
      productName = productName.substring(0, byIndex).trim()
    }

    // Take first comma-separated part as main product (before condition info)
    productName = productName.split(',')[0].trim()

    // Extract condition abbreviation from the full product part
    const condition = conditionToAbbrev(productPart)

    // Extract close time - try multiple formats
    let pstTime = ''

    // Format 1: "HH:MM:SS AM/PM PST" or "HH:MM AM/PM PT"
    let timeMatch = closesPart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*(?:PST|PT)/i)

    // Format 2: "HH:MM:SS AM/PM" without timezone (some pages don't include it)
    if (!timeMatch) {
      timeMatch = closesPart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i)
    }

    // Format 3: Check productPart for time (some pages put it there)
    if (!timeMatch) {
      timeMatch = productPart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*(?:PST|PT)?/i)
    }

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10)
      const minutes = timeMatch[2]
      const ampm = timeMatch[3].toUpperCase()
      if (ampm === 'PM' && hours !== 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
      pstTime = `${hours.toString().padStart(2, '0')}${minutes}`
    }

    // Build listing name: "ProductName Condition Time"
    const nameParts = [productName, condition, pstTime].filter((p) => p.length > 0)
    const listingName = nameParts.join(' ')

    // Extract bid price and shipping fee from DOM
    const bidPrice = extractBidPrice()
    const shippingFee = extractShippingFee()

    return { retailer, listingName, auctionEndTime: null, bidPrice, shippingFee }

    /**
     * Extract retailer code from URL path
     * Maps URL slugs to short retailer codes
     */
    function extractRetailerCode(): string {
      const auctionMatch = url.match(/bstock\.com\/([a-z0-9-]+)\/auction\//)
      if (auctionMatch) {
        const retailerKey = auctionMatch[1]
        // Skip generic paths
        if (['buy', 'sell', 'about', 'help', 'login'].includes(retailerKey)) {
          return 'BSTOCK'
        }
        const retailerCodes: Record<string, string> = {
          qvc: 'QVC',
          bayer: 'BY',
          acehardware: 'ACE',
          jcpenney: 'JCP',
        }
        return retailerCodes[retailerKey] || retailerKey.toUpperCase()
      }
      return 'BSTOCK'
    }

    /**
     * Convert condition string to abbreviation
     * Mappings: NEW/NC, LN, UG, UF, UR, RD, S, UW, DC, MC, OS, D, R, GA/GB/GC
     */
    function conditionToAbbrev(text: string): string {
      if (!text) return ''

      // Normalize: lowercase, replace underscores/hyphens with spaces
      const condLower = text.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!condLower) return ''

      // Grade conditions
      if (condLower.includes('grade a')) return 'GA'
      if (condLower.includes('grade b')) return 'GB'
      if (condLower.includes('grade c')) return 'GC'

      // Used conditions (specific before generic)
      if (condLower.includes('used good')) return 'UG'
      if (condLower.includes('used fair') || condLower.includes('used acceptable')) return 'UF'
      if (condLower.includes('used working')) return 'UW'

      // Return/damage conditions
      if (condLower.includes('returned damaged') || condLower.includes('return damaged')) return 'RD'
      if (condLower.includes('uninspected return') || condLower.includes('uninspected')) return 'UR'
      if (condLower.includes('return')) return 'R'
      if (condLower.includes('damaged')) return 'D'

      // New conditions
      if (condLower.includes('like new')) return 'LN'
      if (condLower.includes('brand new') || condLower.includes('new condition')) return 'NC'
      // Check for standalone "new" or ", new" or "new," patterns
      if (condLower === 'new' || /[,\s]new[,\s]/.test(condLower) || condLower.endsWith(' new') || condLower.startsWith('new ')) return 'NEW'

      // Other
      if (condLower.includes('salvage')) return 'S'
      if (condLower.includes('overstock')) return 'OS'
      if (condLower.includes('mixed')) return 'MC'
      if (condLower.includes('used')) return 'UW'

      return ''
    }
  },

  /**
   * Download manifest from B-Stock retailer auction page
   * Two-step process:
   * 1. Click "Manifest" button to open panel
   * 2. Extract download URL from "Download Full Manifest" button's onclick
   * Returns URL for popup to fetch directly (button uses window.open)
   * Runs in MAIN world
   */
  downloadManifest: function () {
    return new Promise((resolve) => {
      console.log('[B-Stock Auction] Starting manifest download')

      // Helper to make URL absolute
      const makeAbsolute = (url: string): string => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url
        }
        return window.location.origin + (url.startsWith('/') ? url : '/' + url)
      }

      // Helper to extract URL from download button's onclick attribute
      const extractDownloadUrl = (): string | null => {
        const buttons = Array.from(document.querySelectorAll('button, a'))
        const downloadKeywords = ['download full manifest', 'download manifest']

        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim()
          for (const keyword of downloadKeywords) {
            if (text.includes(keyword)) {
              // Check onclick attribute for window.open URL
              const onclick = btn.getAttribute('onclick') || ''
              if (onclick.includes('window.open')) {
                // Extract URL between quotes: window.open('URL', ...)
                const match = onclick.match(/window\.open\s*\(\s*['"]([^'"]+)['"]/)
                if (match && match[1]) {
                  const absoluteUrl = makeAbsolute(match[1])
                  console.log('[B-Stock Auction] Extracted URL from onclick:', absoluteUrl)
                  return absoluteUrl
                }
              }

              // Check if it's an anchor with href
              if (btn instanceof HTMLAnchorElement && btn.href && !btn.href.endsWith('#')) {
                console.log('[B-Stock Auction] Found download link:', btn.href)
                return btn.href
              }

              // Check for data attributes
              const dataUrl = btn.getAttribute('data-url') || btn.getAttribute('data-href')
              if (dataUrl) {
                const absoluteUrl = makeAbsolute(dataUrl)
                console.log('[B-Stock Auction] Found data-url:', absoluteUrl)
                return absoluteUrl
              }
            }
          }
        }
        return null
      }

      // Step 1: Click the "Manifest" button to open the panel
      const manifestBtn =
        document.querySelector('button[id*="manifest-download-btn"]') ||
        document.querySelector('button[id*="manifest"]')

      if (manifestBtn) {
        const text = (manifestBtn.textContent || '').toLowerCase().trim()
        console.log('[B-Stock Auction] Step 1: Clicking manifest panel button:', text)
        ;(manifestBtn as HTMLElement).click()

        // Step 2: Wait for panel to load, then extract URL
        let attempts = 0
        const maxAttempts = 40 // 4 seconds max wait

        const waitForPanel = setInterval(() => {
          attempts++

          const downloadUrl = extractDownloadUrl()
          if (downloadUrl) {
            clearInterval(waitForPanel)
            console.log('[B-Stock Auction] Step 2: Found download URL')

            // Determine file type from URL
            const lowerUrl = downloadUrl.toLowerCase()
            const type = lowerUrl.includes('.xlsx')
              ? 'xlsx'
              : lowerUrl.includes('.xls')
                ? 'xls'
                : 'csv'

            resolve({ data: null, type, downloadUrl })
            return
          }

          if (attempts >= maxAttempts) {
            clearInterval(waitForPanel)
            console.log('[B-Stock Auction] Download URL not found in panel')

            // Fallback: Try to construct API URL from page info
            const auctionId = window.location.pathname.match(/\/id\/(\d+)/)?.[1]
            if (auctionId) {
              const apiUrl = window.location.origin + `/auction/auction/downloadManifest/id/${auctionId}`
              console.log('[B-Stock Auction] Using fallback API URL:', apiUrl)
              resolve({ data: null, type: 'csv', downloadUrl: apiUrl })
              return
            }

            resolve({ data: null, type: null })
          }
        }, 100)

        return
      }

      // Check if panel is already open
      const downloadUrl = extractDownloadUrl()
      if (downloadUrl) {
        const lowerUrl = downloadUrl.toLowerCase()
        const type = lowerUrl.includes('.xlsx')
          ? 'xlsx'
          : lowerUrl.includes('.xls')
            ? 'xls'
            : 'csv'
        resolve({ data: null, type, downloadUrl })
        return
      }

      // Fallback: construct URL from auction ID in current URL
      const auctionId = window.location.pathname.match(/\/id\/(\d+)/)?.[1]
      if (auctionId) {
        const apiUrl = window.location.origin + `/auction/auction/downloadManifest/id/${auctionId}`
        console.log('[B-Stock Auction] No button found, using API URL:', apiUrl)
        resolve({ data: null, type: 'csv', downloadUrl: apiUrl })
        return
      }

      // No button found
      console.log('[B-Stock Auction] No manifest button found')
      resolve({ data: null, type: null })
    })
  },
}

export { SUB_RETAILERS }
