import type { DetectedManifest, ExtensionMessage, SiteInfo } from '../parsers/types'

/**
 * Base detector class for finding manifest files on pages
 */
export abstract class ManifestDetector {
  abstract siteName: 'bstock' | 'techliquidators' | 'amazon'
  abstract urlPatterns: RegExp[]

  /**
   * Check if this detector matches the current URL
   */
  matches(url: string): boolean {
    return this.urlPatterns.some((pattern) => pattern.test(url))
  }

  /**
   * Detect manifest files on the page
   */
  abstract detectManifests(): DetectedManifest[]

  /**
   * Check if user is authenticated
   */
  abstract isAuthenticated(): boolean

  /**
   * Get site info
   */
  getSiteInfo(): SiteInfo {
    return {
      site: this.siteName,
      url: window.location.href,
      isAuthenticated: this.isAuthenticated(),
    }
  }

  /**
   * Find links matching manifest file patterns
   */
  protected findManifestLinks(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []
    const links = document.querySelectorAll('a[href]')

    links.forEach((link) => {
      const href = (link as HTMLAnchorElement).href
      const manifest = this.parseManifestLink(href)
      if (manifest) {
        manifests.push(manifest)
      }
    })

    return this.deduplicateManifests(manifests)
  }

  /**
   * Parse a link to extract manifest info
   */
  protected parseManifestLink(href: string): DetectedManifest | null {
    const lowerHref = href.toLowerCase()

    // Check for CSV files
    if (lowerHref.includes('.csv') || lowerHref.includes('format=csv')) {
      return {
        url: href,
        filename: this.extractFilename(href, 'csv'),
        type: 'csv',
      }
    }

    // Check for XLSX files
    if (lowerHref.includes('.xlsx') || lowerHref.includes('format=xlsx')) {
      return {
        url: href,
        filename: this.extractFilename(href, 'xlsx'),
        type: 'xlsx',
      }
    }

    // Check for XLS files
    if (lowerHref.includes('.xls') && !lowerHref.includes('.xlsx')) {
      return {
        url: href,
        filename: this.extractFilename(href, 'xls'),
        type: 'xls',
      }
    }

    // Check for manifest-related keywords in URL
    if (
      lowerHref.includes('manifest') ||
      lowerHref.includes('inventory') ||
      lowerHref.includes('itemlist')
    ) {
      // Try to determine type from content-type or default to CSV
      const type = this.guessTypeFromUrl(href)
      if (type) {
        return {
          url: href,
          filename: this.extractFilename(href, type),
          type,
        }
      }
    }

    return null
  }

  /**
   * Extract filename from URL
   */
  protected extractFilename(url: string, defaultExt: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Try to get filename from path
      const pathParts = pathname.split('/')
      const lastPart = pathParts[pathParts.length - 1]

      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart)
      }

      // Generate filename from URL
      const timestamp = new Date().toISOString().split('T')[0]
      return `manifest_${this.siteName}_${timestamp}.${defaultExt}`
    } catch {
      return `manifest_${this.siteName}.${defaultExt}`
    }
  }

  /**
   * Guess file type from URL patterns
   */
  protected guessTypeFromUrl(url: string): 'csv' | 'xlsx' | 'xls' | null {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('xlsx')) return 'xlsx'
    if (lowerUrl.includes('xls')) return 'xls'
    if (lowerUrl.includes('csv')) return 'csv'
    // Default to CSV for manifest downloads
    if (lowerUrl.includes('download') || lowerUrl.includes('export')) return 'csv'
    return null
  }

  /**
   * Remove duplicate manifests
   */
  protected deduplicateManifests(manifests: DetectedManifest[]): DetectedManifest[] {
    const seen = new Set<string>()
    return manifests.filter((m) => {
      if (seen.has(m.url)) return false
      seen.add(m.url)
      return true
    })
  }
}

/**
 * Set up message listener for content script
 */
export function setupMessageListener(detector: ManifestDetector): void {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExtensionMessage) => void
    ) => {
      switch (message.type) {
        case 'GET_SITE_INFO':
          sendResponse({
            type: 'SITE_INFO',
            payload: detector.getSiteInfo(),
          })
          break

        case 'DETECT_MANIFESTS':
          sendResponse({
            type: 'MANIFESTS_DETECTED',
            payload: detector.detectManifests(),
          })
          break

        default:
          sendResponse({
            type: 'ERROR',
            error: `Unknown message type: ${message.type}`,
          })
      }

      return true
    }
  )
}
