import type { ExtensionMessage, ManifestItem } from '../parsers/types'
import { parseManifestData } from '../parsers/base-parser'
import { readCsv } from '../parsers/csv-reader'
import { readXlsx } from '../parsers/xlsx-reader'
import { initializeProxy } from '../utils/proxy-config'

// Initialize proxy settings on service worker start
initializeProxy().catch((error) => {
  console.error('[ManifestParser:SW] Failed to initialize proxy:', error)
})

/**
 * Listen for messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessage) => void
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ type: 'ERROR', error: error.message })
      })

    return true // Keep the message channel open for async response
  }
)

/**
 * Handle incoming messages
 */
async function handleMessage(message: ExtensionMessage): Promise<ExtensionMessage> {
  switch (message.type) {
    case 'DOWNLOAD_MANIFEST':
      return await handleDownloadManifest(message.payload as {
        url: string
        filename: string
        type: 'csv' | 'xlsx' | 'xls'
      })

    case 'PARSE_FILE':
      return await handleParseFile(message.payload as {
        data: string
        filename: string
        type: string
      })

    case 'FETCH_PAGE_TITLES':
      return await handleFetchPageTitles(message.payload as { urls: string[] })

    default:
      return { type: 'ERROR', error: `Unknown message type: ${message.type}` }
  }
}

/**
 * Download and parse a manifest from URL
 */
async function handleDownloadManifest(payload: {
  url: string
  filename: string
  type: 'csv' | 'xlsx' | 'xls'
}): Promise<ExtensionMessage<ManifestItem[]>> {
  console.log(`[ManifestParser:SW] Downloading manifest from: ${payload.url}`)
  try {
    // Fetch the file
    const response = await fetch(payload.url, {
      credentials: 'include', // Include cookies for authenticated requests
      headers: {
        Accept: 'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*',
      },
    })

    console.log(`[ManifestParser:SW] Response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const site = getSiteFromUrl(payload.url)

    // Detect actual file type from content if possible
    const contentType = response.headers.get('content-type') || ''
    const fileType = detectFileType(contentType, payload.url, arrayBuffer)

    let rawData: Record<string, unknown>[]
    if (fileType === 'csv') {
      const text = new TextDecoder().decode(arrayBuffer)
      rawData = await readCsv(text)
    } else {
      rawData = await readXlsx(arrayBuffer)
    }

    const items = parseManifestData(rawData, site, payload.filename)
    console.log(`[ManifestParser:SW] Parsed ${items.length} items from ${payload.filename}`)

    return {
      type: 'PARSE_COMPLETE',
      payload: items,
    }
  } catch (error) {
    console.error(`[ManifestParser:SW] Download failed:`, error)
    throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse an uploaded file
 */
async function handleParseFile(payload: {
  data: string
  filename: string
  type: string
}): Promise<ExtensionMessage<ManifestItem[]>> {
  try {
    const binaryString = atob(payload.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const arrayBuffer = bytes.buffer

    const site = detectSiteFromFilename(payload.filename)

    let rawData: Record<string, unknown>[]
    if (payload.type === 'csv') {
      const text = new TextDecoder().decode(arrayBuffer)
      rawData = await readCsv(text)
    } else {
      rawData = await readXlsx(arrayBuffer)
    }

    const items = parseManifestData(rawData, site, payload.filename)

    return {
      type: 'PARSE_COMPLETE',
      payload: items,
    }
  } catch (error) {
    throw new Error(`Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetch page titles for multiple URLs and extract retailer names
 */
async function handleFetchPageTitles(payload: {
  urls: string[]
}): Promise<ExtensionMessage<Record<string, string>>> {
  const results: Record<string, string> = {}

  // Process in batches of 5
  const batchSize = 5
  for (let i = 0; i < payload.urls.length; i += batchSize) {
    const batch = payload.urls.slice(i, i + batchSize)
    const promises = batch.map(async (url) => {
      const retailer = await fetchRetailerFromPageTitle(url)
      return { url, retailer }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ url, retailer }) => {
      results[url] = retailer
    })
  }

  return {
    type: 'PAGE_TITLES_RESULT',
    payload: results,
  }
}

/**
 * Fetch a page and extract retailer from title
 */
async function fetchRetailerFromPageTitle(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
      },
    })

    if (!response.ok) {
      return 'B-Stock'
    }

    const html = await response.text()

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1]
      // Title format: "Product Name | Retailer Name"
      const parts = title.split('|')
      if (parts.length >= 2) {
        const retailerPart = parts[parts.length - 1].trim()
        // Clean up common suffixes
        const cleaned = retailerPart
          .replace(/\s*Liquidation\s*$/i, '')
          .replace(/\s*Auctions?\s*$/i, '')
          .replace(/\s*\d{4}-\d{2}-\d{2}\s*$/i, '') // Remove dates
          .trim()

        if (cleaned.length > 0 && cleaned.length < 50) {
          return cleaned
        }
      }
    }

    return 'B-Stock'
  } catch {
    return 'B-Stock'
  }
}

/**
 * Determine site from URL
 */
function getSiteFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('bstock') || lowerUrl.includes('b-stock')) {
    return 'bstock'
  }
  if (lowerUrl.includes('techliquidator')) {
    return 'techliquidators'
  }
  if (lowerUrl.includes('liquidation')) {
    return 'liquidation'
  }

  // Try to extract domain
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '').split('.')[0]
  } catch {
    return 'unknown'
  }
}

/**
 * Detect site from filename
 */
function detectSiteFromFilename(filename: string): string {
  const lower = filename.toLowerCase()

  if (lower.includes('bstock') || lower.includes('b-stock')) {
    return 'bstock'
  }
  if (lower.includes('techliquidator') || lower.includes('tech')) {
    return 'techliquidators'
  }

  return 'manual'
}

/**
 * Detect file type from content-type header, URL, and file content
 */
function detectFileType(
  contentType: string,
  url: string,
  buffer: ArrayBuffer
): 'csv' | 'xlsx' | 'xls' {
  // Check content-type header
  if (contentType.includes('csv') || contentType.includes('text/plain')) {
    return 'csv'
  }
  if (contentType.includes('spreadsheetml') || contentType.includes('xlsx')) {
    return 'xlsx'
  }
  if (contentType.includes('ms-excel') || contentType.includes('xls')) {
    return 'xls'
  }

  // Check URL
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('.xlsx')) return 'xlsx'
  if (lowerUrl.includes('.xls')) return 'xls'
  if (lowerUrl.includes('.csv')) return 'csv'

  // Check magic bytes
  const bytes = new Uint8Array(buffer.slice(0, 4))

  // XLSX/ZIP magic bytes: PK..
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return 'xlsx'
  }

  // XLS magic bytes: D0 CF 11 E0
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return 'xls'
  }

  // Default to CSV
  return 'csv'
}
