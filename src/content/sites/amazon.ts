import type { DetectedManifest } from '../../parsers/types'
import { ManifestDetector, setupMessageListener } from '../detector'

/**
 * Amazon.com liquidation manifest detector
 * For Amazon direct liquidation listings (amazon.com/dp/*)
 */
class AmazonDetector extends ManifestDetector {
  siteName = 'amazon' as const

  urlPatterns = [/amazon\.com\/dp\//i, /amazon\.com\/gp\/product\//i]

  /**
   * Detect manifests on Amazon liquidation pages
   */
  detectManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Find standard manifest links
    manifests.push(...this.findManifestLinks())

    // Look for Amazon-specific "Download CSV" links
    manifests.push(...this.findAmazonCsvLinks())

    return this.deduplicateManifests(manifests)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Check for Amazon auth indicators
    const hasAccountNav =
      document.querySelector('#nav-link-accountList') !== null
    const hasSignInText =
      document.querySelector('#nav-link-accountList')?.textContent?.includes(
        'Hello,'
      ) || false
    const notSignInPrompt =
      !document.querySelector('#nav-link-accountList')?.textContent?.includes(
        'Sign in'
      )

    return hasAccountNav && hasSignInText && notSignInPrompt
  }

  /**
   * Find Amazon-specific CSV download links
   * Amazon liquidation pages have "Download CSV" links above the manifest table
   */
  private findAmazonCsvLinks(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Look for "Download CSV" links - the primary manifest download on Amazon liquidation pages
    const allLinks = document.querySelectorAll('a')

    allLinks.forEach((link) => {
      const text = link.textContent?.trim().toLowerCase() || ''
      const href = link.href || ''

      // Match "Download CSV" links
      if (
        text.includes('download csv') ||
        text.includes('download manifest') ||
        text === 'download csv'
      ) {
        if (href && !href.startsWith('javascript:')) {
          manifests.push({
            url: href,
            filename: this.extractFilename(href, 'csv'),
            type: 'csv',
          })
        }
      }
    })

    // Also look for links with CSV in the href
    const csvLinks = document.querySelectorAll(
      'a[href*=".csv"], a[href*="csv"], a[href*="manifest"]'
    )

    csvLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement && link.href) {
        const href = link.href.toLowerCase()

        if (
          (href.includes('.csv') || href.includes('csv')) &&
          !href.startsWith('javascript:')
        ) {
          // Avoid duplicates
          const exists = manifests.some((m) => m.url === link.href)
          if (!exists) {
            manifests.push({
              url: link.href,
              filename: this.extractFilename(link.href, 'csv'),
              type: 'csv',
            })
          }
        }
      }
    })

    return manifests
  }
}

// Initialize detector
const detector = new AmazonDetector()

// Only activate if we're on a matching site
if (detector.matches(window.location.href)) {
  setupMessageListener(detector)
}
