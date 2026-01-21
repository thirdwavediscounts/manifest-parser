/**
 * B-Stock Retailer Module
 *
 * B-Stock uses blob interception for manifest downloads.
 * The site dynamically creates a blob URL when you click the download button.
 *
 * B-Stock hosts multiple retailers (QVC, Target, etc.) that can be detected
 * from the URL path or page content.
 */

import type { RetailerModule, SubRetailerMap } from '../types'

/** Sub-retailers hosted on B-Stock marketplace */
const SUB_RETAILERS: SubRetailerMap = {
  qvc: 'QVC',
  bayer: 'Bayer',
  acehardware: 'Ace Hardware',
  jcpenney: 'JCPenney',
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

export const bstockRetailer: RetailerModule = {
  id: 'bstock',
  displayName: 'B-Stock',

  urlPatterns: [/bstock\.com/i, /bstockauctions\.com/i],

  downloadStrategy: 'blob-intercept',

  downloadButtonConfig: {
    keywords: [
      'download manifest',
      'full manifest',
      'download full manifest',
      'export manifest',
      'download csv',
      'download xlsx',
      'download excel',
    ],
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

    // B-Stock listing/auction pages need tab processing
    if (lowerUrl.includes('/auction/') || lowerUrl.includes('/buy/listings/')) {
      return true
    }

    return true
  },

  /**
   * Extract metadata from B-Stock page
   * Uses __NEXT_DATA__ when available, falls back to URL/title parsing
   * Runs in ISOLATED world
   */
  extractMetadata: function () {
    const url = window.location.href.toLowerCase()

    // Try __NEXT_DATA__ first (B-Stock marketplace pages)
    try {
      const nextDataScript = document.getElementById('__NEXT_DATA__')
      if (nextDataScript) {
        const nextData = JSON.parse(nextDataScript.textContent || '{}')
        const dehydrated = nextData?.props?.pageProps?.dehydratedState
        const queries = dehydrated?.queries || []

        const listingQuery = queries.find((q: { queryKey: unknown }) =>
          JSON.stringify(q.queryKey).includes('listing')
        )

        if (listingQuery?.state?.data) {
          const data = listingQuery.state.data
          const retailer =
            data.seller?.storefront?.name ||
            data.seller?.account?.displayName ||
            extractRetailerFromTitle()
          const listingName = data.title || data.name || extractListingFromTitle()
          const auctionEndTime =
            data.auctionEndTime ||
            data.endTime ||
            data.closingTime ||
            data.auction?.endTime ||
            data.auction?.closingTime ||
            null

          return { retailer, listingName, auctionEndTime }
        }
      }
    } catch {
      // Fall through to URL/title parsing
    }

    // Try URL-based extraction (auction pages like /qvc/auction/)
    const urlRetailer = extractRetailerFromUrl()
    if (urlRetailer) {
      return {
        retailer: urlRetailer,
        listingName: extractListingFromTitle(),
        auctionEndTime: null,
      }
    }

    // Fallback to title parsing
    return {
      retailer: extractRetailerFromTitle(),
      listingName: extractListingFromTitle(),
      auctionEndTime: null,
    }

    function extractRetailerFromUrl(): string | null {
      const auctionMatch = url.match(/\/([a-z0-9-]+)\/auction\//)
      if (auctionMatch) {
        const retailerKey = auctionMatch[1]
        if (!['buy', 'sell', 'about', 'help', 'login'].includes(retailerKey)) {
          const subRetailers: SubRetailerMap = {
            qvc: 'QVC',
            bayer: 'Bayer',
            acehardware: 'Ace Hardware',
            jcpenney: 'JCPenney',
            target: 'Target',
            costco: 'Costco',
            walmart: 'Walmart',
            homedepot: 'Home Depot',
            lowes: 'Lowes',
            bestbuy: 'Best Buy',
            macys: 'Macys',
            nordstrom: 'Nordstrom',
          }
          return (
            subRetailers[retailerKey] ||
            retailerKey.charAt(0).toUpperCase() + retailerKey.slice(1)
          )
        }
      }
      return null
    }

    function extractRetailerFromTitle(): string {
      const parts = document.title.split('|')
      if (parts.length >= 2) {
        const retailerPart = parts[parts.length - 1]
          .trim()
          .replace(/\s*Liquidation\s*$/i, '')
          .replace(/\s*Auctions?\s*$/i, '')
          .replace(/\s*B-Stock\s*$/i, '')
          .replace(/\s*\d{4}-\d{2}-\d{2}\s*$/i, '')
          .trim()
        if (retailerPart.length > 0 && retailerPart.length < 50) {
          return retailerPart
        }
      }
      return 'B-Stock'
    }

    function extractListingFromTitle(): string {
      const parts = document.title.split('|')
      if (parts.length >= 1) {
        const listingPart = parts[0].trim()
        if (listingPart.length > 0 && listingPart.length < 200) {
          return listingPart
        }
      }
      return 'Listing'
    }
  },

  /**
   * Download manifest from B-Stock marketplace using blob interception
   * Runs in MAIN world
   */
  downloadManifest: function () {
    return new Promise((resolve) => {
      const originalCreateObjectURL = URL.createObjectURL
      const originalCreateElement = document.createElement.bind(document)
      let capturedBlob: Blob | null = null
      let cleanupCalled = false
      let fakeAnchor: HTMLAnchorElement | null = null

      const keywords = [
        'download manifest',
        'full manifest',
        'download full manifest',
        'export manifest',
        'download csv',
        'download xlsx',
        'download excel',
      ]

      // Intercept URL.createObjectURL to capture blobs
      URL.createObjectURL = function (obj: Blob | MediaSource): string {
        if (obj instanceof Blob) {
          console.log('[B-Stock] Intercepted blob:', obj.type, obj.size)
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
            console.log(
              '[B-Stock] Blocked download click, href:',
              fakeAnchor?.href?.substring(0, 50)
            )
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
            console.log(`[B-Stock] Captured blob: ${type}, ${base64Data.length} chars`)
            resolve({ data: base64Data, type: type as 'csv' | 'xlsx' | 'xls' })
          }
          reader.onerror = () => {
            console.error('[B-Stock] FileReader error')
            resolve({ data: null, type: null })
          }
          reader.readAsDataURL(capturedBlob)
        } else {
          resolve({ data: null, type: null })
        }
      }

      // Timeout after 6 seconds
      const DOWNLOAD_TIMEOUT_MS = 6000
      const timeoutId = setTimeout(() => {
        console.log('[B-Stock] Download timeout')
        cleanup()
      }, DOWNLOAD_TIMEOUT_MS)

      // Watch for blob capture
      const checkInterval = setInterval(() => {
        if (capturedBlob) {
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          setTimeout(cleanup, 300)
        }
      }, 100)

      // Find and click the download button
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))

      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase().trim()
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            console.log('[B-Stock] Clicking button:', text)
            ;(btn as HTMLElement).click()
            return
          }
        }
      }

      // Second pass: look for download links with file extensions
      const downloadLinks = Array.from(
        document.querySelectorAll(
          'a[href*=".csv"], a[href*=".xlsx"], a[href*=".xls"], a[download]'
        )
      )
      for (const link of downloadLinks) {
        const href = (link as HTMLAnchorElement).href
        if (href && !href.startsWith('javascript:')) {
          console.log('[B-Stock] Found download link:', href.substring(0, 80))
          ;(link as HTMLElement).click()
          return
        }
      }

      // No button found
      console.log('[B-Stock] No download button found')
      clearInterval(checkInterval)
      clearTimeout(timeoutId)
      resolve({ data: null, type: null })
    })
  },
}

// Export sub-retailers map for use in detection
export { SUB_RETAILERS }
