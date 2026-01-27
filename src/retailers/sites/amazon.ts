/**
 * Amazon Retailer Module
 *
 * Amazon liquidation pages use blob interception for manifest downloads.
 * The "Download CSV" link has href="#" and triggers JavaScript to create a blob.
 */

import type { RetailerModule } from '../types'

export const amazonRetailer: RetailerModule = {
  id: 'amazon',
  displayName: 'Amazon',

  urlPatterns: [/amazon\.com/i],

  downloadStrategy: 'blob-intercept',

  downloadButtonConfig: {
    keywords: ['download csv', 'download manifest', 'download inventory', 'download'],
    selectors: ['a[href="#"]'],
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

    // Amazon liquidation product pages need tab processing
    if (lowerUrl.includes('amazon.com/dp/') || lowerUrl.includes('amazon.com/gp/')) {
      return true
    }

    return true
  },

  /**
   * Extract metadata from Amazon page
   * Runs in ISOLATED world
   */
  extractMetadata: function () {
    let listingName = 'Amazon Listing'
    let retailer = 'Amazon'

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
     * Extract shipping fee from DOM
     * Look in delivery/shipping section for shipping cost
     * Amazon Direct is fixed-price, so bidPrice will always be null
     */
    function extractShippingFee(): number | null {
      // Try common Amazon shipping selectors
      const shippingSelectors = [
        '#delivery-message',
        '[data-csa-c-content-id*="shipping"]',
        '#deliveryBlockMessage',
        '#mir-layout-DELIVERY_BLOCK',
        '[class*="delivery"]',
        '[class*="shipping"]',
      ]

      for (const selector of shippingSelectors) {
        const el = document.querySelector(selector)
        if (el?.textContent) {
          const text = el.textContent.toLowerCase()
          // Check for FREE Shipping
          if (text.includes('free shipping') || text.includes('free delivery')) {
            return 0
          }
          // Try to extract shipping price
          const priceMatch = el.textContent.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:shipping|delivery)/i)
          if (priceMatch) {
            const parsed = parsePrice(priceMatch[1])
            if (parsed !== null) return parsed
          }
        }
      }

      // Search body text for shipping patterns
      const bodyText = document.body.innerText || ''

      // Check for free shipping first
      if (/free\s*(?:shipping|delivery)/i.test(bodyText)) {
        return 0
      }

      // Look for "Shipping: $XXX" patterns
      const shippingPatterns = [
        /Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
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

    // Method 1: Try #productTitle (standard Amazon product pages)
    const productTitle = document.getElementById('productTitle')
    let rawTitle = ''

    if (productTitle?.textContent) {
      rawTitle = productTitle.textContent.trim()
    } else {
      // Method 2: Use page title (most reliable for liquidation pages)
      // Format: "Amazon.com: 161 Units (Est 1 pallets) - Returned Damaged- Pc, Electronics And Wireless lot : Electronics"
      const title = document.title

      // Remove "Amazon.com: " prefix if present
      let cleanTitle = title.replace(/^Amazon\.com:\s*/i, '')

      // Remove " : Category" suffix (e.g., " : Electronics")
      const lastColonIndex = cleanTitle.lastIndexOf(' : ')
      if (lastColonIndex > 0) {
        cleanTitle = cleanTitle.substring(0, lastColonIndex)
      }

      rawTitle = cleanTitle.trim()
    }

    // Detect Amazon Direct and format listing name
    // Title format: "161 Units (Est 1 pallets) - Returned Damaged- Pc, Electronics And Wireless lot"
    const unitsMatch = rawTitle.match(/(\d+)\s*Units/i)
    const hasLotManifest = document.body.textContent?.toLowerCase().includes('lot manifest')

    if (unitsMatch || hasLotManifest) {
      retailer = 'AMZD'
      listingName = formatAmazonDirectListingName(rawTitle)
    } else {
      listingName = rawTitle.substring(0, 100) || 'Amazon Listing'
    }

    // Extract shipping fee (AMZD is fixed-price, not auction, so bidPrice is always null)
    const shippingFee = extractShippingFee()

    return {
      retailer,
      listingName,
      auctionEndTime: null, // Amazon doesn't have auction end times
      bidPrice: null, // Amazon Direct is fixed-price, not auction
      shippingFee,
    }

    /**
     * Format Amazon Direct listing name
     * Input: "161 Units (Est 1 pallets) - Returned Damaged- Pc, Electronics And Wireless lot"
     * Output: "161 Units PC Electronics Wireless RD"
     */
    function formatAmazonDirectListingName(title: string): string {
      // Extract units count
      const unitsMatch = title.match(/(\d+)\s*Units/i)
      const units = unitsMatch ? `${unitsMatch[1]} Units` : ''

      // Extract condition and abbreviate
      const conditionAbbrev = extractConditionAbbrev(title)

      // Extract categories (between condition and "lot")
      // Remove units part, pallet info, condition, and "lot"
      let categories = title
        .replace(/\d+\s*Units/i, '')
        .replace(/\(Est\s*\d+\s*pallets?\)/i, '')
        .replace(/Returned\s*Damaged/i, '')
        .replace(/Returned/i, '')
        .replace(/Damaged/i, '')
        .replace(/New/i, '')
        .replace(/Salvage/i, '')
        .replace(/Used/i, '')
        .replace(/\blot\b/gi, '')
        .replace(/[-–—]/g, ' ')
        .replace(/,/g, ' ')
        .replace(/\bAnd\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Capitalize first letter of each word
      categories = categories
        .split(' ')
        .filter((w) => w.length > 0)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')

      // Combine: "161 Units PC Electronics Wireless RD"
      const parts = [units, categories, conditionAbbrev].filter((p) => p.length > 0)
      return parts.join(' ')
    }

    /**
     * Extract condition abbreviation from title
     * Uses general condition mapping:
     * RD=Returned Damaged, R=Returns, D=Damaged, S=Salvage,
     * NC=New, UW=Used Working, LN=Like New, UG=Used Good, etc.
     */
    function extractConditionAbbrev(title: string): string {
      const lowerTitle = title.toLowerCase()

      // Check more specific conditions first
      if (lowerTitle.includes('returned') && lowerTitle.includes('damaged')) {
        return 'RD'
      }
      if (lowerTitle.includes('uninspected') && lowerTitle.includes('return')) {
        return 'UR'
      }
      if (lowerTitle.includes('returned') || lowerTitle.includes('return')) {
        return 'R'
      }
      if (lowerTitle.includes('damaged')) {
        return 'D'
      }
      if (lowerTitle.includes('salvage')) {
        return 'S'
      }
      if (lowerTitle.includes('like new')) {
        return 'LN'
      }
      if (lowerTitle.includes('brand new') || lowerTitle.includes('new condition')) {
        return 'NC'
      }
      if (lowerTitle.includes('new')) {
        return 'NC'
      }
      if (lowerTitle.includes('used good')) {
        return 'UG'
      }
      if (lowerTitle.includes('used fair')) {
        return 'UF'
      }
      if (lowerTitle.includes('used')) {
        return 'UW'
      }
      if (lowerTitle.includes('overstock')) {
        return 'OS'
      }
      if (lowerTitle.includes('mixed')) {
        return 'MC'
      }

      return ''
    }
  },

  /**
   * Download manifest from Amazon
   * Uses blob interception - "Download CSV" link has href="#" and triggers JS
   * Runs in MAIN world
   */
  downloadManifest: function () {
    return new Promise((resolve) => {
      const originalCreateObjectURL = URL.createObjectURL
      const originalCreateElement = document.createElement.bind(document)
      let capturedBlob: Blob | null = null
      let cleanupCalled = false
      let fakeAnchor: HTMLAnchorElement | null = null

      const keywords = ['download csv', 'download manifest', 'csv', 'manifest']

      // Intercept URL.createObjectURL to capture blobs
      URL.createObjectURL = function (obj: Blob | MediaSource): string {
        if (obj instanceof Blob) {
          console.log('[Amazon] Intercepted blob:', obj.type, obj.size)
          capturedBlob = obj
        }
        return originalCreateObjectURL.call(URL, obj)
      }

      // Intercept document.createElement to block automatic downloads
      document.createElement = function (
        tagName: string,
        options?: ElementCreationOptions
      ): HTMLElement {
        const element = originalCreateElement(tagName, options)
        if (tagName.toLowerCase() === 'a') {
          fakeAnchor = element as HTMLAnchorElement
          fakeAnchor.click = function () {
            console.log('[Amazon] Blocked download click, href:', fakeAnchor?.href?.substring(0, 50))
            // Don't call original click - this prevents the browser download
          }
        }
        return element
      } as typeof document.createElement

      const cleanup = () => {
        if (cleanupCalled) return
        cleanupCalled = true
        URL.createObjectURL = originalCreateObjectURL
        document.createElement = originalCreateElement

        if (capturedBlob) {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64 = reader.result as string
            const base64Data = base64.split(',')[1] || base64
            let type = capturedBlob!.type.toLowerCase()
            if (!type || type === 'application/octet-stream') type = 'csv'
            else if (type.includes('csv') || type.includes('text')) type = 'csv'
            else if (type.includes('spreadsheetml') || type.includes('xlsx')) type = 'xlsx'
            else if (type.includes('ms-excel')) type = 'xls'
            else type = 'csv'
            console.log(`[Amazon] Captured blob: ${type}, ${base64Data.length} chars`)
            resolve({ data: base64Data, type: type as 'csv' | 'xlsx' | 'xls' })
          }
          reader.onerror = () => {
            console.error('[Amazon] FileReader error')
            resolve({ data: null, type: null })
          }
          reader.readAsDataURL(capturedBlob)
        } else {
          console.log('[Amazon] No blob captured')
          resolve({ data: null, type: null })
        }
      }

      // Timeout after 6 seconds
      const DOWNLOAD_TIMEOUT_MS = 6000
      const timeoutId = setTimeout(() => {
        console.log('[Amazon] Download timeout')
        cleanup()
      }, DOWNLOAD_TIMEOUT_MS)

      // Watch for blob capture
      const checkInterval = setInterval(() => {
        if (capturedBlob) {
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          setTimeout(cleanup, 300) // Small delay to ensure blob is fully captured
        }
      }, 100)

      // Find and click the download button/link
      // Amazon uses anchor tags with href="#" that trigger JS download
      const allClickables = Array.from(
        document.querySelectorAll('a, button, [role="button"]')
      ) as HTMLElement[]

      for (const el of allClickables) {
        const text = (el.textContent || '').toLowerCase().trim()
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            console.log('[Amazon] Clicking download element:', text)
            el.click()
            return // Exit - we clicked, now wait for blob
          }
        }
      }

      // No download element found
      console.log('[Amazon] No download button/link found')
      clearInterval(checkInterval)
      clearTimeout(timeoutId)
      resolve({ data: null, type: null })
    })
  },
}
