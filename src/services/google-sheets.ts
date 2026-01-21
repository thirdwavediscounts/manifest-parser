/**
 * Google Sheets API service for Chrome extension
 */

export interface SheetData {
  urls: string[]
  sheetTitle: string
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  // Match patterns like:
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Get OAuth2 token using Chrome identity API
 */
export async function getAuthToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!token) {
        reject(new Error('Failed to get auth token'))
        return
      }
      resolve(token)
    })
  })
}

/**
 * Remove cached auth token (for logout or token refresh)
 */
export async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve()
    })
  })
}

/**
 * Fetch URLs from Google Sheet
 * Reads column A for URLs only
 */
export async function fetchUrlsFromSheet(
  spreadsheetId: string,
  range = 'A:A'
): Promise<SheetData> {
  const token = await getAuthToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, remove and retry
      await removeCachedToken(token)
      throw new Error('Authentication expired. Please try again.')
    }
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Extract URLs from the values array
  const values: string[][] = data.values || []
  const urls = values
    .flat()
    .filter((value: string) => value && isValidUrl(value))
    .map((value: string) => value.trim())

  return {
    urls,
    sheetTitle: data.range || 'Sheet',
  }
}

/**
 * Fetch sheet metadata (title, sheets list)
 */
export async function fetchSheetMetadata(spreadsheetId: string): Promise<{
  title: string
  sheets: { title: string; sheetId: number }[]
}> {
  const token = await getAuthToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet metadata: ${response.status}`)
  }

  const data = await response.json()

  return {
    title: data.properties?.title || 'Untitled',
    sheets: data.sheets?.map((s: { properties: { title: string; sheetId: number } }) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
    })) || [],
  }
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Detect retailer from URL
 */
export function detectRetailerFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase()

  // Check for B-Stock URLs
  if (lowerUrl.includes('bstock') || lowerUrl.includes('b-stock')) {
    // Auction URLs have retailer in path: bstock.com/{retailer}/auction/*
    const auctionMatch = lowerUrl.match(/bstock\.com\/([a-z]+)\/auction/)
    if (auctionMatch) {
      const retailerSlug = auctionMatch[1]
      return getBstockRetailerName(retailerSlug)
    }

    // Marketplace URLs: bstock.com/buy/listings/details/*
    // Retailer is in page title, not URL - return 'bstock-marketplace' as indicator
    if (lowerUrl.includes('/buy/listings/')) {
      return 'bstock-marketplace'
    }

    return 'bstock'
  }

  // Check for Amazon.com direct liquidation (not B-Stock)
  if (lowerUrl.includes('amazon.com/dp/') || lowerUrl.includes('amazon.com/gp/product/')) {
    return 'amazon'
  }
  if (lowerUrl.includes('techliquidator')) {
    return 'techliquidators'
  }
  if (lowerUrl.includes('liquidation')) {
    return 'liquidation'
  }

  // Try to extract domain as fallback
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '').split('.')[0]
  } catch {
    return 'unknown'
  }
}

/**
 * Map B-Stock auction URL slugs to retailer display names
 */
function getBstockRetailerName(slug: string): string {
  const retailerMap: Record<string, string> = {
    'qvc': 'QVC',
    'bayer': 'Bayer',
    'acehardware': 'Ace Hardware',
    'jcpenney': 'JCPenney',
    'target': 'Target',
    'costco': 'Costco',
    'amazon': 'Amazon',
    'walmart': 'Walmart',
    'homedepot': 'Home Depot',
    'lowes': 'Lowes',
    'bestbuy': 'Best Buy',
    'macys': 'Macys',
    'nordstrom': 'Nordstrom',
    'kohls': 'Kohls',
  }

  return retailerMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}

/**
 * Check if user is authenticated with Google
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getAuthToken(false) // Non-interactive check
    return true
  } catch {
    return false
  }
}

/**
 * Sign out from Google
 */
export async function signOut(): Promise<void> {
  try {
    const token = await getAuthToken(false)
    await removeCachedToken(token)

    // Also revoke the token
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
  } catch {
    // Ignore errors during sign out
  }
}
