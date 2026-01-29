/**
 * Per-retailer JSON path configuration for B-Stock Next.js pages
 *
 * Maps each Next.js retailer to their __NEXT_DATA__ JSON extraction paths.
 * This file is the source of truth for path documentation and E2E tests.
 * The extraction logic in bstock.ts mirrors this config inline (ISOLATED world constraint).
 */

export interface NextJsFieldConfig {
  /** Dot-notation path from listing data root (e.g., "auction.winningBidAmount") */
  path: string
  /** Strict unit — no heuristics */
  unit: 'dollars' | 'cents'
  /** Human-readable field description */
  description: string
  /** If true, extraction returns null when unauthenticated */
  authRequired: boolean
  /** ISO date of last live verification */
  lastVerified: string
  /** Example raw value from live inspection */
  exampleValue?: number
}

export interface RetailerNextJsPaths {
  bidPrice: NextJsFieldConfig
  /** Fallback bid price (e.g., opening bid when no bids yet) */
  bidPriceFallback?: NextJsFieldConfig
  shippingFee: NextJsFieldConfig
}

export const NEXTJS_RETAILER_PATHS: Record<string, RetailerNextJsPaths> = {
  AMZ: {
    bidPrice: {
      path: 'auction.winningBidAmount',
      unit: 'dollars',
      description: 'Winning bid amount in dollars',
      authRequired: false,
      lastVerified: '2026-01-29',
      exampleValue: 6545,
    },
    bidPriceFallback: {
      path: 'auction.startPrice',
      unit: 'dollars',
      description: 'Opening bid price if no bids yet',
      authRequired: false,
      lastVerified: '2026-01-29',
      exampleValue: 2500,
    },
    shippingFee: {
      path: 'selectedQuote.totalPrice',
      unit: 'cents',
      description: 'Shipping cost in cents (divide by 100 for dollars)',
      authRequired: true,
      lastVerified: '2026-01-29',
      exampleValue: 58207,
    },
  },
  ATT: {
    bidPrice: {
      path: 'auction.winningBidAmount',
      unit: 'dollars',
      description: 'Winning bid amount in dollars',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    bidPriceFallback: {
      path: 'auction.startPrice',
      unit: 'dollars',
      description: 'Opening bid price if no bids yet',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    shippingFee: {
      path: 'selectedQuote.totalPrice',
      unit: 'cents',
      description: 'Shipping cost in cents (divide by 100 for dollars)',
      authRequired: true,
      lastVerified: '2026-01-29',
    },
  },
  COSTCO: {
    bidPrice: {
      path: 'auction.winningBidAmount',
      unit: 'dollars',
      description: 'Winning bid amount in dollars',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    bidPriceFallback: {
      path: 'auction.startPrice',
      unit: 'dollars',
      description: 'Opening bid price if no bids yet',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    shippingFee: {
      path: 'selectedQuote.totalPrice',
      unit: 'cents',
      description: 'Shipping cost in cents (divide by 100 for dollars)',
      authRequired: true,
      lastVerified: '2026-01-29',
    },
  },
  RC: {
    bidPrice: {
      path: 'auction.winningBidAmount',
      unit: 'dollars',
      description: 'Winning bid amount in dollars',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    bidPriceFallback: {
      path: 'auction.startPrice',
      unit: 'dollars',
      description: 'Opening bid price if no bids yet',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    shippingFee: {
      path: 'selectedQuote.totalPrice',
      unit: 'cents',
      description: 'Shipping cost in cents (divide by 100 for dollars)',
      authRequired: true,
      lastVerified: '2026-01-29',
    },
  },
  TGT: {
    bidPrice: {
      path: 'auction.winningBidAmount',
      unit: 'dollars',
      description: 'Winning bid amount in dollars',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    bidPriceFallback: {
      path: 'auction.startPrice',
      unit: 'dollars',
      description: 'Opening bid price if no bids yet',
      authRequired: false,
      lastVerified: '2026-01-29',
    },
    shippingFee: {
      path: 'selectedQuote.totalPrice',
      unit: 'cents',
      description: 'Shipping cost in cents (divide by 100 for dollars)',
      authRequired: true,
      lastVerified: '2026-01-29',
    },
  },
}

/**
 * Resolve a dot-notation path on an object.
 * e.g., resolvePath(data, "auction.winningBidAmount") -> data.auction.winningBidAmount
 * Returns undefined if any segment is missing.
 */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/**
 * Extract a numeric value from __NEXT_DATA__ using config.
 * Applies unit conversion and sanity checks.
 * Returns null if path doesn't resolve, value is not a number, or value is negative.
 */
export function extractFieldValue(
  data: Record<string, unknown>,
  config: NextJsFieldConfig
): number | null {
  const value = resolvePath(data, config.path)
  if (typeof value !== 'number') return null
  if (value < 0) return null
  if (config.unit === 'cents') {
    return Math.round((value / 100) * 100) / 100
  }
  return value
}
