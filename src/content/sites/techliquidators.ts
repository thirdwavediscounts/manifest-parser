import type { DetectedManifest } from '../../parsers/types'
import { ManifestDetector, setupMessageListener } from '../detector'

/**
 * TechLiquidators manifest detector
 */
class TechLiquidatorsDetector extends ManifestDetector {
  siteName = 'techliquidators' as const

  urlPatterns = [
    /techliquidators\.com/i,
    /tech-liquidators\.com/i,
  ]

  /**
   * Detect manifests on TechLiquidators pages
   */
  detectManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Find standard manifest links
    manifests.push(...this.findManifestLinks())

    // Look for TechLiquidators-specific manifest buttons
    manifests.push(...this.findTechLiquidatorsManifests())

    // Look for product lot manifests
    manifests.push(...this.findProductLotManifests())

    return this.deduplicateManifests(manifests)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Check for common auth indicators
    const hasLogoutLink = document.querySelector('a[href*="logout"], a[href*="sign-out"]') !== null
    const hasMyAccount = document.querySelector('a[href*="my-account"], a[href*="account"]') !== null
    const hasWelcome = document.body.textContent?.includes('Welcome,') || false

    return hasLogoutLink || hasMyAccount || hasWelcome
  }

  /**
   * Find TechLiquidators-specific manifest downloads
   */
  private findTechLiquidatorsManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Look for manifest download links specific to TechLiquidators
    const manifestLinks = document.querySelectorAll(
      'a[href*="manifest"], a[href*="download"], [class*="manifest"], [class*="download-btn"]'
    )

    manifestLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement && link.href) {
        const href = link.href.toLowerCase()
        const text = link.textContent?.toLowerCase() || ''

        // Filter for actual manifest/inventory downloads
        if (
          href.includes('.csv') ||
          href.includes('.xlsx') ||
          href.includes('.xls') ||
          text.includes('manifest') ||
          text.includes('inventory') ||
          text.includes('item list')
        ) {
          const type = this.guessTypeFromUrl(link.href) || 'csv'
          manifests.push({
            url: link.href,
            filename: this.extractFilename(link.href, type),
            type,
          })
        }
      }
    })

    return manifests
  }

  /**
   * Find manifests in product lot pages
   */
  private findProductLotManifests(): DetectedManifest[] {
    const manifests: DetectedManifest[] = []

    // Look for lot/product detail sections
    const lotContainers = document.querySelectorAll(
      '.product-detail, .lot-detail, [class*="product-info"], [class*="lot-info"]'
    )

    lotContainers.forEach((container) => {
      // Find download links within lot containers
      const links = container.querySelectorAll('a[href]')

      links.forEach((link) => {
        const anchor = link as HTMLAnchorElement
        const href = anchor.href.toLowerCase()
        const text = anchor.textContent?.toLowerCase() || ''
        const title = anchor.title?.toLowerCase() || ''

        const isManifestLink =
          href.includes('.csv') ||
          href.includes('.xlsx') ||
          href.includes('.xls') ||
          href.includes('manifest') ||
          href.includes('inventory') ||
          text.includes('manifest') ||
          text.includes('download') ||
          title.includes('manifest')

        if (isManifestLink && !href.startsWith('javascript:')) {
          const type = this.guessTypeFromUrl(anchor.href) || 'csv'
          manifests.push({
            url: anchor.href,
            filename: this.extractFilename(anchor.href, type),
            type,
          })
        }
      })
    })

    // Also check for manifest tables or sections
    const manifestSections = document.querySelectorAll(
      '[class*="manifest-table"], [class*="inventory-list"], table[id*="manifest"]'
    )

    manifestSections.forEach((section) => {
      const exportLinks = section.querySelectorAll('a[href*="export"], a[href*="download"]')
      exportLinks.forEach((link) => {
        if (link instanceof HTMLAnchorElement && link.href) {
          const type = this.guessTypeFromUrl(link.href) || 'csv'
          manifests.push({
            url: link.href,
            filename: this.extractFilename(link.href, type),
            type,
          })
        }
      })
    })

    return manifests
  }
}

// Initialize detector
const detector = new TechLiquidatorsDetector()

// Only activate if we're on a matching site
if (detector.matches(window.location.href)) {
  setupMessageListener(detector)
}
