/**
 * Metadata about an auction (appears once per manifest)
 */
export interface AuctionMetadata {
  auctionUrl: string
  bidPrice: number | null
  shippingFee: number | null
}

/**
 * A single row in the unified manifest output
 * Maps to CSV columns: item_number, product_name, qty, unit_retail, auction_url, bid_price, shipping_fee
 */
export interface UnifiedManifestRow {
  item_number: string
  product_name: string
  qty: number
  unit_retail: number
  auction_url: string
  bid_price: string
  shipping_fee: string
}

/**
 * Complete unified manifest output
 */
export interface UnifiedManifestOutput {
  rows: UnifiedManifestRow[]
  metadata: AuctionMetadata
}
