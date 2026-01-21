/**
 * Central registry for retailer modules
 *
 * Provides a single place to:
 * - Register retailer modules
 * - Look up retailers by URL or ID
 * - Get display names for URLs
 */

import type { RetailerModule } from './types'

class RetailerRegistry {
  private retailers: Map<string, RetailerModule> = new Map()

  /**
   * Register a retailer module
   */
  register(retailer: RetailerModule): void {
    if (this.retailers.has(retailer.id)) {
      console.warn(`[RetailerRegistry] Overwriting existing retailer: ${retailer.id}`)
    }
    this.retailers.set(retailer.id, retailer)
  }

  /**
   * Get a retailer by its ID
   */
  getById(id: string): RetailerModule | undefined {
    return this.retailers.get(id)
  }

  /**
   * Find a retailer that matches the given URL
   * Returns the first matching retailer, or undefined if none match
   */
  findByUrl(url: string): RetailerModule | undefined {
    for (const retailer of this.retailers.values()) {
      if (retailer.matches(url)) {
        return retailer
      }
    }
    return undefined
  }

  /**
   * Get the display name for a URL
   * Falls back to "Unknown" if no retailer matches
   */
  getDisplayName(url: string): string {
    const retailer = this.findByUrl(url)
    return retailer?.displayName ?? 'Unknown'
  }

  /**
   * Check if a URL needs tab processing
   * Falls back to true (safer default) if no retailer matches
   */
  needsTabProcessing(url: string): boolean {
    // Direct file URLs never need tab processing
    const lowerUrl = url.toLowerCase()
    if (
      lowerUrl.endsWith('.csv') ||
      lowerUrl.endsWith('.xlsx') ||
      lowerUrl.endsWith('.xls')
    ) {
      return false
    }

    const retailer = this.findByUrl(url)
    if (retailer) {
      return retailer.needsTabProcessing(url)
    }

    // Default: assume tab processing is needed
    return true
  }

  /**
   * Get all registered retailers
   */
  getAllRetailers(): RetailerModule[] {
    return Array.from(this.retailers.values())
  }

  /**
   * Get list of all retailer IDs
   */
  getAllIds(): string[] {
    return Array.from(this.retailers.keys())
  }
}

// Singleton instance
export const retailerRegistry = new RetailerRegistry()
