import type { DetectedManifest, ExtensionMessage, ListingData } from '../../parsers/types'
import { ManifestDetector, setupMessageListener } from '../detector'

interface ListingQueryData {
  title?: string
  name?: string
  seller?: {
    storefront?: { name?: string }
    account?: { displayName?: string }
  }
  documents?: Array<{
    docType?: string
    mimeType?: string
    url?: string
  }>
  auctionEndTime?: string
  endTime?: string
  closingTime?: string
  auction?: {
    endTime?: string
    closingTime?: string
  }
}

interface NextDataProps {
  pageProps?: {
    dehydratedState?: {
      queries?: Array<{
        queryKey: unknown
        state?: {
          data?: ListingQueryData
        }
      }>
    }
  }
}

/**
 * Extract all listing data from the current B-Stock listing page
 */
function extractListingData(): ListingData {
  const pageData = extractPageData()
  return {
    retailer: pageData.retailer,
    listingName: pageData.listingName,
    auctionEndTime: pageData.auctionEndTime,
    manifestUrl: null,
    manifestData: null,
    manifestType: null,
  }
}

/**
 * Extract listing data AND download manifest by clicking the button
 */
async function extractListingDataWithManifest(): Promise<ListingData> {
  const pageData = extractPageData()
  const manifestResult = await downloadManifestViaButton()

  return {
    retailer: pageData.retailer,
    listingName: pageData.listingName,
    auctionEndTime: pageData.auctionEndTime,
    manifestUrl: null,
    manifestData: manifestResult.data,
    manifestType: manifestResult.type,
  }
}

/**
 * Find and click the download manifest button, capture the blob data
 * Uses injected script in main world to intercept blob creation
 */
async function downloadManifestViaButton(): Promise<{
  data: string | null
  type: 'csv' | 'xlsx' | 'xls' | null
}> {
  console.log('[ManifestParser] Looking for download manifest button...')

  return new Promise((resolve) => {
    // Create a unique event name for this download
    const eventName = `manifest-parser-blob-${Date.now()}`

    // Listen for the blob data from the injected script
    const handleBlobData = (event: Event) => {
      const customEvent = event as CustomEvent<{ data: string; type: string } | null>
      window.removeEventListener(eventName, handleBlobData)

      if (customEvent.detail) {
        console.log('[ManifestParser] Received blob data from page')
        const type = detectFileType(customEvent.detail.type)
        resolve({ data: customEvent.detail.data, type })
      } else {
        console.log('[ManifestParser] No blob captured')
        resolve({ data: null, type: null })
      }
    }
    window.addEventListener(eventName, handleBlobData)

    // Inject script into the main world to intercept blob creation
    const script = document.createElement('script')
    script.textContent = `
      (function() {
        const eventName = '${eventName}';
        const originalCreateObjectURL = URL.createObjectURL;
        let capturedBlob = null;
        let cleanupCalled = false;

        // Intercept URL.createObjectURL
        URL.createObjectURL = function(obj) {
          if (obj instanceof Blob) {
            console.log('[ManifestParser:Injected] Intercepted blob:', obj.type, obj.size);
            capturedBlob = obj;
          }
          return originalCreateObjectURL.call(URL, obj);
        };

        const cleanup = async () => {
          if (cleanupCalled) return;
          cleanupCalled = true;

          URL.createObjectURL = originalCreateObjectURL;

          if (capturedBlob) {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result;
              const base64Data = base64.split(',')[1] || base64;
              window.dispatchEvent(new CustomEvent(eventName, {
                detail: { data: base64Data, type: capturedBlob.type }
              }));
            };
            reader.onerror = () => {
              window.dispatchEvent(new CustomEvent(eventName, { detail: null }));
            };
            reader.readAsDataURL(capturedBlob);
          } else {
            window.dispatchEvent(new CustomEvent(eventName, { detail: null }));
          }
        };

        // Set timeout
        const timeoutId = setTimeout(() => {
          console.log('[ManifestParser:Injected] Download timeout');
          cleanup();
        }, 5000);

        // Watch for blob capture
        const checkInterval = setInterval(() => {
          if (capturedBlob) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            setTimeout(cleanup, 500);
          }
        }, 100);

        // Find and click the download button
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const downloadKeywords = ['download manifest', 'full manifest', 'download full manifest'];

        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim();
          for (const keyword of downloadKeywords) {
            if (text.includes(keyword)) {
              console.log('[ManifestParser:Injected] Clicking button:', text);
              btn.click();
              return;
            }
          }
        }

        // No button found
        console.log('[ManifestParser:Injected] No download button found');
        cleanup();
      })();
    `
    document.documentElement.appendChild(script)
    script.remove()
  })
}

/**
 * Detect file type from MIME type string
 */
function detectFileType(mimeType: string): 'csv' | 'xlsx' | 'xls' | null {
  const lower = mimeType.toLowerCase()

  if (lower.includes('csv') || lower.includes('text/plain') || lower === '') {
    return 'csv' // Default to CSV for empty mime types
  }
  if (lower.includes('spreadsheetml') || lower.includes('xlsx')) {
    return 'xlsx'
  }
  if (lower.includes('ms-excel') || lower.includes('xls')) {
    return 'xls'
  }

  return 'csv'
}

/**
 * Extract retailer, listing name, and auction end time from page
 */
function extractPageData(): {
  retailer: string
  listingName: string
  auctionEndTime: string | null
} {
  // Try Next.js data first (marketplace pages)
  try {
    const nextDataScript = document.getElementById('__NEXT_DATA__')
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript.textContent || '{}') as { props?: NextDataProps }
      const dehydrated = nextData?.props?.pageProps?.dehydratedState
      const queries = dehydrated?.queries || []

      const listingQuery = queries.find((q) =>
        JSON.stringify(q.queryKey).includes('listing')
      )

      if (listingQuery?.state?.data) {
        const data = listingQuery.state.data

        // Extract retailer
        const retailer =
          data.seller?.storefront?.name ||
          data.seller?.account?.displayName ||
          extractRetailerFromUrl() ||
          extractRetailerFromTitle()

        // Extract listing name
        const listingName = data.title || data.name || extractListingNameFromTitle()

        // Extract auction end time
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
  } catch (error) {
    console.debug('[ManifestParser] Failed to extract from Next.js data:', error)
  }

  // Try URL-based extraction (auction pages like /qvc/auction/)
  const urlRetailer = extractRetailerFromUrl()
  if (urlRetailer) {
    return {
      retailer: urlRetailer,
      listingName: extractListingNameFromTitle(),
      auctionEndTime: extractAuctionEndTimeFromPage(),
    }
  }

  // Final fallback to title parsing
  return {
    retailer: extractRetailerFromTitle(),
    listingName: extractListingNameFromTitle(),
    auctionEndTime: extractAuctionEndTimeFromPage(),
  }
}

/**
 * Extract retailer name from URL path (for auction pages)
 * URL format: https://bstock.com/{retailer}/auction/...
 */
function extractRetailerFromUrl(): string | null {
  const url = window.location.href.toLowerCase()

  // Match pattern: /retailer/auction/
  const auctionMatch = url.match(/\/([a-z0-9-]+)\/auction\//)
  if (auctionMatch) {
    const retailer = auctionMatch[1]
    // Skip common non-retailer paths
    if (!['buy', 'sell', 'about', 'help', 'login'].includes(retailer)) {
      return formatRetailerName(retailer)
    }
  }

  return null
}

/**
 * Format retailer name with proper casing
 */
function formatRetailerName(retailer: string): string {
  const displayNames: Record<string, string> = {
    'qvc': 'QVC',
    'bayer': 'Bayer',
    'acehardware': 'Ace Hardware',
    'ace-hardware': 'Ace Hardware',
    'jcpenney': 'JCPenney',
    'target': 'Target',
    'costco': 'Costco',
    'walmart': 'Walmart',
    'homedepot': 'Home Depot',
    'home-depot': 'Home Depot',
    'lowes': 'Lowes',
    'bestbuy': 'Best Buy',
    'best-buy': 'Best Buy',
    'macys': 'Macys',
    'nordstrom': 'Nordstrom',
    'kohls': 'Kohls',
  }

  const lower = retailer.toLowerCase()
  return displayNames[lower] || retailer.charAt(0).toUpperCase() + retailer.slice(1)
}

/**
 * Try to extract auction end time from page elements
 */
function extractAuctionEndTimeFromPage(): string | null {
  // Look for countdown timers or end time displays
  const timeSelectors = [
    '[data-testid*="end"]',
    '[class*="countdown"]',
    '[class*="timer"]',
    '[class*="end-time"]',
    '[class*="closing"]',
  ]

  for (const selector of timeSelectors) {
    const element = document.querySelector(selector)
    if (element?.textContent) {
      // Try to parse various date formats
      const text = element.textContent.trim()
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        try {
          const date = new Date(dateMatch[1])
          if (!isNaN(date.getTime())) {
            return date.toISOString()
          }
        } catch (error) {
          console.debug('[ManifestParser] Failed to parse date:', dateMatch[1], error)
        }
      }
    }
  }

  return null
}

/**
 * Extract retailer name from page title
 * Title format: "Listing Name | Retailer Name"
 */
function extractRetailerFromTitle(): string {
  const parts = document.title.split('|')
  if (parts.length >= 2) {
    const retailerPart = parts[parts.length - 1].trim()
    // Clean up common suffixes
    const cleaned = retailerPart
      .replace(/\s*Liquidation\s*$/i, '')
      .replace(/\s*Auctions?\s*$/i, '')
      .replace(/\s*B-Stock\s*$/i, '')
      .trim()

    if (cleaned.length > 0 && cleaned.length < 50) {
      return cleaned
    }
  }
  return 'B-Stock'
}

/**
 * Extract listing name from page title
 * Title format: "Listing Name | Retailer Name"
 */
function extractListingNameFromTitle(): string {
  const parts = document.title.split('|')
  if (parts.length >= 1) {
    const listingPart = parts[0].trim()
    if (listingPart.length > 0 && listingPart.length < 200) {
      return listingPart
    }
  }
  return 'Listing'
}

/**
 * Handle EXTRACT_LISTING_DATA message
 */
function setupListingDataListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExtensionMessage<ListingData>) => void
    ) => {
      if (message.type === 'EXTRACT_LISTING_DATA') {
        console.log('[ManifestParser] Extracting listing data from:', window.location.href)

        // Use async handler - need to return true to keep channel open
        extractListingDataWithManifest()
          .then((data) => {
            console.log('[ManifestParser] Extracted data:', data)
            sendResponse({
              type: 'LISTING_DATA_RESULT',
              payload: data,
            })
          })
          .catch((error) => {
            console.error('[ManifestParser] Error extracting data:', error)
            // Fall back to basic data without manifest
            const basicData = extractListingData()
            sendResponse({
              type: 'LISTING_DATA_RESULT',
              payload: basicData,
            })
          })

        return true // Keep message channel open for async response
      }
      return false
    }
  )
}

/**
 * Bstock manifest detector
 */
class BstockDetector extends ManifestDetector {
  siteName = 'bstock' as const

  urlPatterns = [
    /bstock\.com/i,
    /bstockauctions\.com/i,
    /bstocksolutions\.com/i,
  ]

  /**
   * Detect manifests on Bstock pages
   */
  detectManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Find standard manifest links
    manifests.push(...this.findManifestLinks())

    // Look for Bstock-specific manifest download buttons/links
    manifests.push(...this.findBstockManifestButtons())

    // Look for manifest links in lot details
    manifests.push(...this.findLotManifests())

    return this.deduplicateManifests(manifests)
  }

  /**
   * Check if user is authenticated on Bstock
   */
  isAuthenticated(): boolean {
    // Check for common auth indicators
    const hasLogoutLink = document.querySelector('a[href*="logout"], a[href*="signout"]') !== null
    const hasAccountMenu = document.querySelector('.account-menu, .user-menu, [class*="account"]') !== null
    const hasAuthCookie = document.cookie.includes('session') || document.cookie.includes('auth')

    return hasLogoutLink || hasAccountMenu || hasAuthCookie
  }

  /**
   * Find Bstock-specific manifest download buttons
   */
  private findBstockManifestButtons(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Look for download manifest buttons
    const downloadButtons = document.querySelectorAll(
      'a[href*="manifest"], button[data-manifest], [class*="manifest-download"], [class*="download-manifest"]'
    )

    downloadButtons.forEach((btn) => {
      if (btn instanceof HTMLAnchorElement && btn.href) {
        const type = this.guessTypeFromUrl(btn.href) || 'csv'
        manifests.push({
          url: btn.href,
          filename: this.extractFilename(btn.href, type),
          type,
        })
      }
    })

    // Look for links with manifest-related text
    const allLinks = document.querySelectorAll('a')
    allLinks.forEach((link) => {
      const text = link.textContent?.toLowerCase() || ''
      if (
        (text.includes('manifest') || text.includes('item list') || text.includes('inventory')) &&
        link.href &&
        !link.href.startsWith('javascript:')
      ) {
        const type = this.guessTypeFromUrl(link.href) || 'csv'
        manifests.push({
          url: link.href,
          filename: this.extractFilename(link.href, type),
          type,
        })
      }
    })

    return manifests
  }

  /**
   * Find manifests in lot detail pages
   */
  private findLotManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Look for lot detail sections with manifest info
    const lotSections = document.querySelectorAll(
      '.lot-details, .auction-details, [class*="lot-info"], [class*="manifest-section"]'
    )

    lotSections.forEach((section) => {
      const links = section.querySelectorAll('a[href]')
      links.forEach((link) => {
        const href = (link as HTMLAnchorElement).href
        const text = link.textContent?.toLowerCase() || ''

        if (
          href.includes('.csv') ||
          href.includes('.xlsx') ||
          href.includes('.xls') ||
          text.includes('download') ||
          text.includes('manifest')
        ) {
          const type = this.guessTypeFromUrl(href) || 'csv'
          manifests.push({
            url: href,
            filename: this.extractFilename(href, type),
            type,
          })
        }
      })
    })

    return manifests
  }
}

// Initialize detector
const detector = new BstockDetector()

// Only activate if we're on a matching site
if (detector.matches(window.location.href)) {
  setupMessageListener(detector)
  setupListingDataListener()
}
