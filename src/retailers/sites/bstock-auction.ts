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

/** Sub-retailers with auction pages on B-Stock */
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
   * Runs in ISOLATED world
   */
  extractMetadata: function () {
    const url = window.location.href.toLowerCase()

    // Extract retailer from URL path: /jcpenney/auction/ -> JCPenney
    const retailer = extractRetailerFromUrl() || extractRetailerFromTitle()
    const listingName = extractListingFromTitle()

    return {
      retailer,
      listingName,
      auctionEndTime: null,
    }

    function extractRetailerFromUrl(): string | null {
      const auctionMatch = url.match(/bstock\.com\/([a-z0-9-]+)\/auction\//)
      if (auctionMatch) {
        const retailerKey = auctionMatch[1]
        // Skip generic paths
        if (['buy', 'sell', 'about', 'help', 'login'].includes(retailerKey)) {
          return null
        }
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
          kohls: 'Kohls',
        }
        return subRetailers[retailerKey] || retailerKey.charAt(0).toUpperCase() + retailerKey.slice(1)
      }
      return null
    }

    function extractRetailerFromTitle(): string {
      // Title format: "Listing Name | ... | JCPenney Liquidation Auctions 2026-01-21"
      const parts = document.title.split('|')
      if (parts.length >= 2) {
        const retailerPart = parts[parts.length - 1]
          .trim()
          .replace(/\s*Liquidation\s*$/i, '')
          .replace(/\s*Auctions?\s*$/i, '')
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
