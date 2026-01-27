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

/** Sub-retailers hosted on B-Stock marketplace - mapped to short retailer codes */
const SUB_RETAILERS: SubRetailerMap = {
  qvc: 'QVC',
  bayer: 'BY',
  acehardware: 'ACE',
  jcpenney: 'JCP',
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
   *
   * Costco & Amazon naming convention:
   * - Retailer: "B" for Box, "P" for Pallet (based on title)
   * - Format: "[B/P]_[ProductName]_[Condition]_[PSTMilitaryTime]"
   * - Example: "B_Apple-Watches-LN-1101" or "P_Home-Goods-UG-1107"
   */
  extractMetadata: function () {
    const url = window.location.href.toLowerCase()

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
     * Extract bid price from __NEXT_DATA__ or DOM
     */
    function extractBidPrice(nextData: Record<string, unknown> | null): number | null {
      // Try __NEXT_DATA__ fields first
      if (nextData) {
        const data = nextData as Record<string, unknown>
        // Look for common bid price fields
        const bidFields = ['currentBid', 'winningBid', 'highBid', 'currentPrice', 'bidAmount']
        for (const field of bidFields) {
          if (typeof data[field] === 'number') {
            return data[field] as number
          }
          if (typeof data[field] === 'string') {
            const parsed = parsePrice(data[field] as string)
            if (parsed !== null) return parsed
          }
        }
        // Check nested lot object
        const lot = data.lot as Record<string, unknown> | undefined
        if (lot) {
          for (const field of bidFields) {
            if (typeof lot[field] === 'number') {
              return lot[field] as number
            }
            if (typeof lot[field] === 'string') {
              const parsed = parsePrice(lot[field] as string)
              if (parsed !== null) return parsed
            }
          }
        }
      }

      // DOM fallback selectors
      const bidSelectors = [
        '[data-testid*="bid"]',
        '[data-testid*="price"]',
        '[class*="bid-amount"]',
        '[class*="current-bid"]',
        '[class*="winning-bid"]',
        '[class*="CurrentBid"]',
        '[class*="bidPrice"]',
      ]
      for (const selector of bidSelectors) {
        const el = document.querySelector(selector)
        if (el?.textContent?.trim()) {
          const parsed = parsePrice(el.textContent.trim())
          if (parsed !== null) return parsed
        }
      }

      return null
    }

    /**
     * Extract shipping fee from __NEXT_DATA__ or DOM
     */
    function extractShippingFee(nextData: Record<string, unknown> | null): number | null {
      // Try __NEXT_DATA__ fields first
      if (nextData) {
        const data = nextData as Record<string, unknown>
        // Look for common shipping fields
        const shippingFields = ['shippingCost', 'estimatedShipping', 'freightCost', 'shipping', 'deliveryCost']
        for (const field of shippingFields) {
          if (typeof data[field] === 'number') {
            return data[field] as number
          }
          if (typeof data[field] === 'string') {
            const text = (data[field] as string).toLowerCase()
            // Check for free shipping
            if (text.includes('free')) return 0
            const parsed = parsePrice(data[field] as string)
            if (parsed !== null) return parsed
          }
        }
        // Check nested lot or shipping object
        const lot = data.lot as Record<string, unknown> | undefined
        if (lot) {
          for (const field of shippingFields) {
            if (typeof lot[field] === 'number') {
              return lot[field] as number
            }
            if (typeof lot[field] === 'string') {
              const text = (lot[field] as string).toLowerCase()
              if (text.includes('free')) return 0
              const parsed = parsePrice(lot[field] as string)
              if (parsed !== null) return parsed
            }
          }
        }
      }

      // DOM fallback selectors
      const shippingSelectors = [
        '[class*="shipping"]',
        '[class*="Shipping"]',
        '[class*="freight"]',
        '[class*="Freight"]',
        '[data-testid*="shipping"]',
      ]
      for (const selector of shippingSelectors) {
        const el = document.querySelector(selector)
        if (el?.textContent?.trim()) {
          const text = el.textContent.trim().toLowerCase()
          // Check for free shipping
          if (text.includes('free')) return 0
          const parsed = parsePrice(el.textContent.trim())
          if (parsed !== null) return parsed
        }
      }

      return null
    }

    // Try __NEXT_DATA__ first (B-Stock marketplace pages)
    let listingData: Record<string, unknown> | null = null
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
          listingData = listingQuery.state.data
          const data = listingData as Record<string, unknown>
          const seller = data.seller as Record<string, unknown> | undefined
          const sellerName =
            (seller?.storefront as Record<string, unknown>)?.name ||
            (seller?.account as Record<string, unknown>)?.displayName ||
            extractRetailerFromTitle()

          // Get lot title and end time
          const lot = data.lot as Record<string, unknown> | undefined
          const lotTitle = (lot?.title || data.title || data.name || '') as string
          const endTimeUtc = (data.datePurchasingEnds || data.auctionEndTime || data.endTime || null) as string | null

          // Get itemConditions for Amazon (condition is in data, not title)
          const itemConditions = (lot?.itemConditions || []) as Array<{ itemConditions?: string[] }>

          // Get the lot's displayed condition from description
          // Description starts with condition like "Used - Good Condition." or "Like New Condition."
          const lotDescription = (lot?.description || '') as string
          const lotCondition = extractConditionFromDescription(lotDescription)

          // Extract bid price and shipping fee from __NEXT_DATA__
          const bidPrice = extractBidPrice(listingData)
          const shippingFee = extractShippingFee(listingData)

          // Check if Costco - use special naming convention
          if ((sellerName as string)?.toLowerCase().includes('costco')) {
            const costcoResult = extractCostcoMetadata(lotTitle, endTimeUtc)
            return { ...costcoResult, bidPrice, shippingFee }
          }

          // Check if Amazon - use special naming convention
          if ((sellerName as string)?.toLowerCase() === 'amazon') {
            const amazonResult = extractAmazonMetadata(lotTitle, endTimeUtc, itemConditions, lotCondition)
            return { ...amazonResult, bidPrice, shippingFee }
          }

          // Check if Target - use TGT naming convention
          if ((sellerName as string)?.toLowerCase() === 'target') {
            const targetResult = extractTargetMetadata(lotTitle, endTimeUtc, itemConditions, lotCondition)
            return { ...targetResult, bidPrice, shippingFee }
          }

          // Check if AT&T - use ATT naming convention
          if ((sellerName as string)?.toLowerCase().includes('at&t')) {
            const attResult = extractAttMetadata(lotTitle, endTimeUtc, lotCondition)
            return { ...attResult, bidPrice, shippingFee }
          }

          // Check if Royal Closeouts - use RC naming convention
          if ((sellerName as string)?.toLowerCase().includes('royal closeout')) {
            const rcResult = extractRoyalCloseoutsMetadata(lotTitle, endTimeUtc, lotCondition)
            return { ...rcResult, bidPrice, shippingFee }
          }

          // Non-specialized B-Stock listing
          const listingName = lotTitle || extractListingFromTitle()
          const auctionEndTime =
            endTimeUtc ||
            (data.closingTime as string | null) ||
            ((data.auction as Record<string, unknown>)?.endTime as string | null) ||
            ((data.auction as Record<string, unknown>)?.closingTime as string | null) ||
            null

          return { retailer: sellerName as string, listingName, auctionEndTime, bidPrice, shippingFee }
        }
      }
    } catch {
      // Fall through to URL/title parsing
    }

    // Try URL-based extraction (auction pages like /qvc/auction/, /jcpenney/auction/, etc.)
    const urlRetailer = extractRetailerFromUrl()
    if (urlRetailer) {
      // For auction pages, parse title for product info, condition, and close time
      // Title format: "ProductInfo, Condition, Details | Closes: Date Time PST | Retailer..."
      const auctionData = extractAuctionPageMetadata(urlRetailer)
      // For URL-based pages, try DOM extraction for bid/shipping
      const bidPrice = extractBidPrice(null)
      const shippingFee = extractShippingFee(null)
      return { ...auctionData, bidPrice, shippingFee }
    }

    // Fallback to title parsing
    const bidPrice = extractBidPrice(null)
    const shippingFee = extractShippingFee(null)
    return {
      retailer: extractRetailerFromTitle(),
      listingName: extractListingFromTitle(),
      auctionEndTime: null,
      bidPrice,
      shippingFee,
    }

    /**
     * Extract Costco-specific metadata
     * Retailer code: B (Box) or P (Pallet)
     * Format: "[ProductName] [Condition] [PSTMilitaryTime]"
     */
    function extractCostcoMetadata(
      title: string,
      endTimeUtc: string | null
    ): { retailer: string; listingName: string; auctionEndTime: string | null } {
      // Determine B or P based on title
      const titleLower = title.toLowerCase()
      let retailerCode = 'B' // Default to Box
      if (titleLower.includes('pallet of') || titleLower.includes('pallets of')) {
        retailerCode = 'P'
      } else if (titleLower.includes('box of') || titleLower.includes('boxes of')) {
        retailerCode = 'B'
      }

      // Extract product name (text after "Box of" or "Pallet of", before parentheses)
      let productName = ''
      const boxMatch = title.match(/(?:box(?:es)?|pallet(?:s)?)\s+of\s+([^(,]+)/i)
      if (boxMatch) {
        productName = boxMatch[1].trim()
      } else {
        // Fallback: take first part of title
        productName = title.split(',')[0].replace(/^\d+\s+/, '').trim()
      }

      // Extract condition from title
      const condition = extractConditionFromTitle(title)

      // Convert UTC end time to PST military time
      const pstTime = convertToPstMilitary(endTimeUtc)

      // Build listing name: "ProductName Condition Time"
      // Truncation will happen in generateListingFilename
      const parts = [productName, condition, pstTime].filter((p) => p.length > 0)
      const listingName = parts.join(' ')

      return {
        retailer: retailerCode,
        listingName,
        auctionEndTime: endTimeUtc,
      }
    }

    /**
     * Extract Amazon B-Stock metadata
     * Retailer code: AMZ
     * Condition comes from lot.condition or itemConditions array
     * Format: "AMZ_[ProductCategory]-[Condition]-[PSTMilitaryTime].csv"
     * Example: "AMZ_Home-Goods-UG-1107.csv"
     */
    function extractAmazonMetadata(
      title: string,
      endTimeUtc: string | null,
      itemConditions: Array<{ itemConditions?: string[] }>,
      lotCondition: string
    ): { retailer: string; listingName: string; auctionEndTime: string | null } {
      // Clean up title: remove "Fast Shipping - " prefix and similar
      let cleanTitle = title
        .replace(/^Fast Shipping\s*-\s*/i, '')
        .replace(/^Priority Shipping\s*-\s*/i, '')
        .replace(/^Standard Shipping\s*-\s*/i, '')
        .trim()

      // Remove "X Units" prefix from title (e.g., "161 Units Pc Electronics..." -> "Pc Electronics...")
      cleanTitle = cleanTitle.replace(/^\d+\s+Units?\s+/i, '').trim()

      // Extract product category from cleaned title
      // Title format after cleanup: "6 Pallets of Home Goods by AT&T, Brita & More"
      let productCategory = ''

      // Try to extract "X Pallets/Boxes of [Category]" pattern
      const categoryMatch = cleanTitle.match(/(?:pallet|box)(?:es|s)?\s+of\s+([^,]+?)(?:\s+by\s+|\s*$)/i)
      if (categoryMatch) {
        productCategory = categoryMatch[1].trim()
      } else {
        // Fallback: take first part before "by" or comma
        let firstPart = cleanTitle
        const byIndex = firstPart.toLowerCase().indexOf(' by ')
        if (byIndex > 0) {
          firstPart = firstPart.substring(0, byIndex).trim()
        }
        // Remove quantity prefix like "6 Pallets of "
        firstPart = firstPart.replace(/^\d+\s+(?:pallet|box)(?:es|s)?\s+(?:of\s+)?/i, '')
        productCategory = firstPart.split(',')[0].trim()
      }

      // If still empty, use cleaned title
      if (!productCategory) {
        productCategory = cleanTitle.split(',')[0].replace(/^\d+\s+/, '').trim()
      }

      // Extract condition: prefer lot.condition over itemConditions breakdown
      const condition = extractConditionAbbrev(lotCondition) || extractConditionFromItemConditions(itemConditions)

      // Convert UTC end time to PST military time
      const pstTime = convertToPstMilitary(endTimeUtc)

      // Build listing name: "ProductCategory Condition Time"
      const parts = [productCategory, condition, pstTime].filter((p) => p.length > 0)
      const listingName = parts.join(' ')

      return {
        retailer: 'AMZ',
        listingName,
        auctionEndTime: endTimeUtc,
      }
    }

    /**
     * Extract Target B-Stock metadata
     * Retailer code: TGT
     * Format: "TGT_[Categories]-[Condition]-[PSTMilitaryTime].csv"
     * Example: "TGT_Mobile-Accessories,-Home-Electronics-UG-1204.csv"
     */
    function extractTargetMetadata(
      title: string,
      endTimeUtc: string | null,
      itemConditions: Array<{ itemConditions?: string[] }>,
      lotCondition: string
    ): { retailer: string; listingName: string; auctionEndTime: string | null } {
      // Extract categories from title
      // Title format: "5 Pallets of Mobile Accessories, Home Electronics & More, 3,161 Units, ..."
      let categories = ''

      // Try to extract categories between "Pallets/Boxes of" and "& More" or ", X Units"
      const categoryMatch = title.match(/(?:pallet|box)(?:es|s)?\s+of\s+([^&]+?)(?:\s*&\s*More|,\s*\d)/i)
      if (categoryMatch) {
        categories = categoryMatch[1].trim()
        // Remove trailing comma if present
        categories = categories.replace(/,\s*$/, '').trim()
      } else {
        // Fallback: take content after "of" until first major delimiter
        const ofMatch = title.match(/\bof\s+([^,]+(?:,\s*[^,&]+)?)/i)
        if (ofMatch) {
          categories = ofMatch[1].trim()
        }
      }

      // If still empty, use first part of title
      if (!categories) {
        categories = title.split(',')[0].replace(/^\d+\s+(?:pallet|box)(?:es|s)?\s+(?:of\s+)?/i, '').trim()
      }

      // Extract condition: prefer lot.condition over itemConditions breakdown
      const condition = extractConditionAbbrev(lotCondition) || extractConditionFromItemConditions(itemConditions)

      // Convert UTC end time to PST military time
      const pstTime = convertToPstMilitary(endTimeUtc)

      // Build listing name: "Categories Condition Time"
      const parts = [categories, condition, pstTime].filter((p) => p.length > 0)
      const listingName = parts.join(' ')

      return {
        retailer: 'TGT',
        listingName,
        auctionEndTime: endTimeUtc,
      }
    }

    /**
     * Extract AT&T B-Stock metadata
     * Retailer code: ATT
     * Format: "ATT_[Categories]-[Condition]-[PSTMilitaryTime].csv"
     * Example: "ATT_Chargers-Phone-Grips-LN-1315.csv"
     */
    function extractAttMetadata(
      title: string,
      endTimeUtc: string | null,
      lotCondition: string
    ): { retailer: string; listingName: string; auctionEndTime: string | null } {
      // Extract categories from title
      // Title format: "Chargers, Phone Grips, Miscellaneous App-Enabled Accessories & More by Tylt..."
      let categories = title

      // Remove "& More" suffix first
      categories = categories.replace(/\s*&\s*More\s*/gi, ' ').trim()

      // Remove "by [Brand]..." suffix
      const byIndex = categories.toLowerCase().indexOf(' by ')
      if (byIndex > 0) {
        categories = categories.substring(0, byIndex).trim()
      }

      // Remove " - X Units" or similar suffix
      const dashIndex = categories.indexOf(' - ')
      if (dashIndex > 0) {
        categories = categories.substring(0, dashIndex).trim()
      }

      // Clean up: remove trailing commas
      categories = categories.replace(/,\s*$/, '').trim()

      // Extract condition from description
      const condition = extractConditionAbbrev(lotCondition)

      // Convert UTC end time to PST military time
      const pstTime = convertToPstMilitary(endTimeUtc)

      // Build listing name
      const parts = [categories, condition, pstTime].filter((p) => p.length > 0)
      const listingName = parts.join(' ')

      return {
        retailer: 'ATT',
        listingName,
        auctionEndTime: endTimeUtc,
      }
    }

    /**
     * Extract Royal Closeouts B-Stock metadata
     * Retailer code: RC
     * Format: "RC_[ProductName]-[Condition]-[PSTMilitaryTime].csv"
     * Example: "RC_Mens-2Pk-Knit-Cotton-Boxer-Briefs-NEW-1100.csv"
     */
    function extractRoyalCloseoutsMetadata(
      title: string,
      endTimeUtc: string | null,
      lotCondition: string
    ): { retailer: string; listingName: string; auctionEndTime: string | null } {
      // Extract product name from title
      // Title format: "1 Pallet of Men's 2Pk Knit Cotton Boxer Briefs, 1,152 Packs, New Condition..."
      let productName = ''

      // Try to extract product name after "Pallet/Box of" and before quantity/condition
      const productMatch = title.match(/(?:pallet|box)(?:es|s)?\s+of\s+([^,]+)/i)
      if (productMatch) {
        productName = productMatch[1].trim()
      } else {
        // Fallback: take first part of title
        productName = title.split(',')[0].replace(/^\d+\s+/, '').trim()
      }

      // Extract condition from description or title
      let condition = extractConditionAbbrev(lotCondition)
      if (!condition) {
        // Try to get from title (e.g., "New Condition" in title)
        condition = conditionToAbbrev(title)
      }

      // Convert UTC end time to PST military time
      const pstTime = convertToPstMilitary(endTimeUtc)

      // Build listing name
      const parts = [productName, condition, pstTime].filter((p) => p.length > 0)
      const listingName = parts.join(' ')

      return {
        retailer: 'RC',
        listingName,
        auctionEndTime: endTimeUtc,
      }
    }

    /**
     * Extract condition from lot description
     * Description starts with condition like "Used - Good Condition." or "Like New Condition."
     * Returns the condition text before "Condition" or first period
     */
    function extractConditionFromDescription(description: string): string {
      if (!description) return ''

      // Get first line/sentence - condition is at the start
      // Examples: "Used - Good Condition.", "Like New Condition.", "New Condition."
      const firstPart = description.split('.')[0].trim()

      // Extract condition part (before "Condition" word if present)
      const condMatch = firstPart.match(/^(.+?)\s*Condition/i)
      if (condMatch) {
        return condMatch[1].trim()
      }

      // Fallback: return first part if it looks like a condition
      if (firstPart.length < 50) {
        return firstPart
      }

      return ''
    }

    /**
     * Convert condition string to abbreviation
     * Shared by all condition extraction functions
     * Order matters: check more specific conditions before generic ones
     *
     * Mappings:
     * NEW/NC → New, LN → Like New, UG → Used Good, UF → Used Fair,
     * UR → Uninspected Returns, RD → Returned Damaged, S → Salvage,
     * UW → Used Working, DC → Data Cleared, MC → Mixed Condition,
     * OS → Overstock, D → Damaged, R → Returns,
     * GA/GB/GC → Grade A/B/C, NG → New Grade, AA+ → AA+
     */
    function conditionToAbbrev(condition: string): string {
      if (!condition) return ''

      // Normalize: lowercase, replace underscores/hyphens with spaces, collapse multiple spaces
      const condLower = condition
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!condLower) return ''

      // Check more specific conditions first (order matters!)
      // Grade conditions
      if (condLower.includes('grade a') || condLower === 'ga') return 'GA'
      if (condLower.includes('grade b') || condLower === 'gb') return 'GB'
      if (condLower.includes('grade c') || condLower === 'gc') return 'GC'
      if (condLower.includes('new grade') || condLower === 'ng') return 'NG'
      if (condLower.includes('aa+') || condLower === 'aa+') return 'AA+'
      if (condLower.includes('a/b') || condLower === 'ab') return 'AB'
      if (condLower.includes('c/d') || condLower === 'cd') return 'CD'

      // Used conditions (specific before generic)
      if (condLower.includes('used good')) return 'UG'
      if (condLower.includes('used fair') || condLower.includes('used acceptable')) return 'UF'
      if (condLower.includes('used working')) return 'UW'

      // Return/damage conditions
      if (condLower.includes('returned damaged') || condLower.includes('return damaged')) return 'RD'
      if (condLower.includes('uninspected return') || condLower.includes('uninspected')) return 'UR'
      if (condLower.includes('return')) return 'R'
      if (condLower.includes('damaged')) return 'D'

      // New conditions
      if (condLower.includes('like new')) return 'LN'
      if (condLower.includes('brand new')) return 'NC'
      if (condLower.includes('new condition')) return 'NC'
      if (condLower === 'new') return 'NEW'

      // Other conditions
      if (condLower.includes('salvage')) return 'S'
      if (condLower.includes('data cleared')) return 'DC'
      if (condLower.includes('mixed condition') || condLower.includes('mixed')) return 'MC'
      if (condLower.includes('overstock')) return 'OS'

      // Generic "used" last (maps to UW - Used Working)
      if (condLower.includes('used')) return 'UW'

      return ''
    }

    /**
     * Extract condition abbreviation from lot.condition string
     * e.g., "USED_GOOD" -> "UG", "Like New" -> "LN"
     */
    function extractConditionAbbrev(condition: string): string {
      return conditionToAbbrev(condition)
    }

    /**
     * Extract condition abbreviation from itemConditions array
     * Amazon/Target uses: USED_GOOD, USED_ACCEPTABLE, NEW, etc.
     */
    function extractConditionFromItemConditions(
      itemConditions: Array<{ itemConditions?: string[] }>
    ): string {
      if (!itemConditions || itemConditions.length === 0) return ''

      const firstCondition = itemConditions[0]?.itemConditions?.[0] || ''
      return conditionToAbbrev(firstCondition)
    }

    /**
     * Extract condition abbreviation from title
     * Uses conditionToAbbrev for consistency
     */
    function extractConditionFromTitle(title: string): string {
      // Check for condition keywords - use shared function
      const abbrev = conditionToAbbrev(title)
      if (abbrev) return abbrev

      // Additional check for standalone "new" with word boundary
      // to avoid false positives (e.g., "renewal")
      if (/\bnew\b/.test(title.toLowerCase())) return 'NC'

      return ''
    }

    /**
     * Convert UTC timestamp to PST military time (4 digits)
     * TODO: Add proper DST handling - currently uses PST (UTC-8) year-round
     * PDT (UTC-7) is used roughly March-November, so times will be off by 1 hour during summer
     */
    function convertToPstMilitary(utcTime: string | null): string {
      if (!utcTime) return ''

      try {
        const date = new Date(utcTime)
        if (isNaN(date.getTime())) {
          console.warn('[B-Stock] Invalid date format:', utcTime)
          return ''
        }
        // Convert to PST (UTC-8) - note: this doesn't account for DST
        // For proper DST handling, we'd need a timezone library
        const pstHours = (date.getUTCHours() - 8 + 24) % 24
        const pstMinutes = date.getUTCMinutes()

        // Format as 4-digit military time (e.g., "1101" for 11:01 AM)
        return `${pstHours.toString().padStart(2, '0')}${pstMinutes.toString().padStart(2, '0')}`
      } catch {
        return ''
      }
    }

    function extractRetailerFromUrl(): string | null {
      const auctionMatch = url.match(/\/([a-z0-9-]+)\/auction\//)
      if (auctionMatch) {
        const retailerKey = auctionMatch[1]
        if (!['buy', 'sell', 'about', 'help', 'login'].includes(retailerKey)) {
          // Map URL slugs to retailer codes
          const retailerCodes: Record<string, string> = {
            qvc: 'QVC',
            bayer: 'BY',
            acehardware: 'ACE',
            jcpenney: 'JCP',
          }
          return retailerCodes[retailerKey] || retailerKey.toUpperCase()
        }
      }
      return null
    }

    /**
     * Extract metadata from B-Stock auction pages (non-Next.js pages)
     * Title format: "ProductInfo, Condition, Details | Closes: Date Time PST | Retailer..."
     * Example: "Watches by Invicta, Used - Good Condition, 35 Units... | Closes: Jan 23, 2026 12:05:00 PM PST | JCPenney..."
     */
    function extractAuctionPageMetadata(retailerCode: string): {
      retailer: string
      listingName: string
      auctionEndTime: string | null
    } {
      const pageTitle = document.title
      console.log('[B-Stock] Auction page title:', pageTitle)

      // Split by | to get parts
      const parts = pageTitle.split('|').map((p) => p.trim())
      const productPart = parts[0] || ''
      const closesPart = parts[1] || ''
      console.log('[B-Stock] Product part:', productPart)
      console.log('[B-Stock] Closes part:', closesPart)

      // First, remove quantity prefix like "2 Pallets of " or "1 Box of " from the start
      let cleanProductPart = productPart
        .replace(/^\d+\s+(?:pallet|box)(?:es|s)?\s+of\s+/i, '')
        .trim()

      // Extract product name (before "by" or condition/units info)
      let productName = ''
      const byMatch = cleanProductPart.match(/^(.+?)\s+by\s+/i)
      if (byMatch) {
        productName = byMatch[1].trim()
      } else {
        // Take text before first comma
        productName = cleanProductPart.split(',')[0].trim()
      }

      // Clean up: remove trailing "& More" if it's at the end
      productName = productName.replace(/\s*&\s*More\s*$/i, '').trim()

      // Extract condition from original product part
      const condition = conditionToAbbrev(productPart)

      // Extract close time - try multiple formats
      let pstTime = ''

      // Format 1: "Closes: Jan 23, 2026 12:05:00 PM PST"
      let timeMatch = closesPart.match(/Closes:\s*\w+\s+\d+,?\s*\d*\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*(?:PST|PT)/i)

      // Format 2: Try without "Closes:" prefix - "Jan 23, 2026 12:05:00 PM PST"
      if (!timeMatch) {
        timeMatch = closesPart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*(?:PST|PT)/i)
      }

      // Format 3: Check productPart for time info (some pages put it there)
      if (!timeMatch) {
        timeMatch = productPart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\s*(?:PST|PT)/i)
      }

      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10)
        const minutes = timeMatch[2]
        const ampm = timeMatch[3].toUpperCase()

        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0

        pstTime = `${hours.toString().padStart(2, '0')}${minutes}`
        console.log('[B-Stock] Extracted PST time:', pstTime)
      } else {
        console.log('[B-Stock] No time match found in title')
      }

      // Build listing name
      const nameParts = [productName, condition, pstTime].filter((p) => p.length > 0)
      const listingName = nameParts.join(' ')
      console.log('[B-Stock] Final listing name:', listingName)

      return {
        retailer: retailerCode,
        listingName,
        auctionEndTime: null, // These pages don't have UTC time, just PST display
      }
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
