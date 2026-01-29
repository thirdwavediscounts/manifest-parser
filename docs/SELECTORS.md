# DOM Selector Reference

Reference documentation for bid price and shipping fee DOM selectors across all 11 retailers.

**Purpose:** Enable future maintenance when retailer sites change their HTML structure.

**Last Updated:** 2026-01-28

---

## Table of Contents

- [ACE (Ace Hardware)](#ace)
- [AMZ (Amazon B-Stock)](#amz)
- [AMZD (Amazon Direct)](#amzd)
- [ATT (AT&T)](#att)
- [BY (Bayer)](#by)
- [COSTCO](#costco)
- [JCP (JCPenney)](#jcp)
- [QVC](#qvc)
- [RC (Royal Closeouts)](#rc)
- [TGT (Target)](#tgt)
- [TL (TechLiquidators)](#tl)
- [Fallback Behavior](#fallback-behavior)
- [Maintenance Guide](#maintenance-guide)

---

## ACE

**Retailer:** Ace Hardware
**Source File:** `src/retailers/sites/bstock-auction.ts`
**Site:** bstock.com/acehardware/auction/

### Bid Price Selectors

**Primary:** `#current_bid_amount` — contains the bid value directly (e.g., "$1,425")

**Fallback** regex patterns searched in page body text:
```regex
/Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Bid\s*Amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Shipping Fee Selectors

**Primary:** `#shipping_total_cost` — container for shipping info
- Check text for "free" → return `0`
- `.price` child element contains dollar amount (e.g., "$397.86")

**Fallback** regex patterns searched in page body text:
```regex
/shipping[:\s]*free/i → return 0
/free\s*shipping/i → return 0
/Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Estimated\s*Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### DOM Structure (verified 2026-01-29)

```html
<!-- Bid price: .auction-data-row contains label + content -->
<div class="auction-data-row">
  <div class="auction-data-label">Current bid</div>
  <div class="auction-data-content">
    <span id="current_bid_amount">$1,425</span>
  </div>
</div>

<!-- Shipping: #shipping_total_cost with .price child -->
<div class="auction-data-row">
  <div class="auction-data-label">Shipping Cost</div>
  <div class="auction-data-content">
    <div id="shipping_total_cost">
      <span class="price">$397.86</span>
    </div>
  </div>
</div>

<!-- Free shipping variant (BY example) -->
<div id="shipping_total_cost">
  <strong>Free Shipping</strong>
</div>
```

### Notes

- Uses B-Stock auction page layout (non-Next.js)
- Retailer code extracted from URL path: `/acehardware/auction/`
- Two-step download: Click "Manifest" button, then "Download Full Manifest"
- `#shipping_total_cost` may not render until address is confirmed; free shipping shown as `<strong>Free Shipping</strong>`

### Last Verified

Date: 2026-01-29 (ACE: bid $1,425 + shipping $397.86; BY: bid $4,500 + free shipping)

---

## AMZ

**Retailer:** Amazon B-Stock (marketplace auctions)
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Amazon seller pages)

### Bid Price Selectors

**Primary:** `__NEXT_DATA__` JSON extraction (verified 2026-01-29)

Fields checked in order:
```
auction.winningBidAmount  ← actual winning bid (dollars, NOT cents)
auction.startPrice        ← opening bid if no bids yet (dollars)
```

Legacy fallback fields (not found in current structure but kept for safety):
```
currentBid, winningBid, highBid, currentPrice, bidAmount
lot.currentBid, lot.winningBid, lot.highBid, lot.currentPrice, lot.bidAmount
```

**DOM Fallback** (if `__NEXT_DATA__` unavailable):
```
Regex: /(?:Current\s*Bid|Buy\s*Now)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

Also available: `[data-testid="price-details"]` contains "$6,545/ $10.13 per unit"

### Shipping Fee Selectors

**Primary:** `__NEXT_DATA__` JSON extraction (verified 2026-01-29)

Fields checked in order:
```
selectedQuote.totalPrice  ← shipping cost in CENTS (divide by 100!)
```

**Important:** `selectedQuote.totalPrice` is in **cents**. Value 58207 = $582.07.

This maps to the "Shipping" line in the "Shipping & Other Charges" dropdown on the page. The B-Stock Fee is separate and NOT included.

Other `selectedQuote` fields (for reference, not used):
```
selectedQuote.totalCarrierCost  ← carrier cost in cents
selectedQuote.lineHaulPrice     ← line haul in cents
selectedQuote.basePrice         ← base price in cents
selectedQuote.totalAccessorials ← accessorial fees in cents
```

Legacy fallback fields (not found in current structure but kept for safety):
```
shippingCost, estimatedShipping, freightCost, deliveryCost
lot.shippingCost, lot.estimatedShipping, lot.freightCost, lot.deliveryCost
```

### Example `__NEXT_DATA__` Structure (verified 2026-01-29)

```json
{
  "props": {
    "pageProps": {
      "dehydratedState": {
        "queries": [{
          "queryKey": ["listingDetails", "6972b21217601bac4b79e9da", "JWT-..."],
          "state": {
            "data": {
              "auction": {
                "winningBidAmount": 6545,
                "startPrice": 2500,
                "numberOfBids": 11,
                "nextMinBidAmount": 6570
              },
              "selectedQuote": {
                "totalPrice": 58207,
                "totalCarrierCost": 53895,
                "lineHaulPrice": 46703,
                "freightClass": 125
              },
              "seller": {
                "storefront": { "name": "Amazon" }
              },
              "lot": {
                "title": "6 Pallets of Home Goods..."
              }
            }
          }
        }]
      }
    }
  }
}
```

### Page DOM Reference

The "Shipping & Other Charges" section has a `[data-testid="toggle-button"]` dropdown that expands to show:
- **B-Stock Fee:** $262.80 (buyer premium, NOT in selectedQuote)
- **Shipping:** $582.07 (= `selectedQuote.totalPrice / 100`)

### Notes

- Uses Next.js `__NEXT_DATA__` script for structured data extraction
- Seller identified from `seller.storefront.name` or `seller.account.displayName`
- Auction end time from `datePurchasingEnds`, `auctionEndTime`, or `endTime`
- **bid amounts are in dollars, shipping amounts are in cents** — inconsistent units in the JSON
- Config source: `src/retailers/config/nextjs-paths.ts`

### Last Verified

Date: 2026-01-29 (AMZ: bid $6,545 from `auction.winningBidAmount`, shipping $582.07 from `selectedQuote.totalPrice/100`)

---

## AMZD

**Retailer:** Amazon Direct (fixed-price liquidation)
**Source File:** `src/retailers/sites/amazon.ts`
**Site:** amazon.com/dp/ or amazon.com/gp/

### Bid Price Selectors

**None** - Amazon Direct is fixed-price, not auction.

`bidPrice` always returns `null` for AMZD.

### Shipping Fee Selectors

CSS selectors tried in order:
```css
#delivery-message
[data-csa-c-content-id*="shipping"]
#deliveryBlockMessage
#mir-layout-DELIVERY_BLOCK
[class*="delivery"]
[class*="shipping"]
```

### Shipping Fee Fallback Patterns

Free shipping detection:
```regex
/free\s*(?:shipping|delivery)/i
```

Shipping amount patterns:
```regex
/Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Verified DOM Structure (2026-01-29)

```html
<!-- #deliveryBlockMessage contains delivery info -->
<div id="deliveryBlockMessage">
  FREE delivery March 16 - 18. Details
</div>

<!-- #mir-layout-DELIVERY_BLOCK also contains same info -->
<div id="mir-layout-DELIVERY_BLOCK">
  FREE delivery March 16 - 18. Details
</div>
```

### Notes

- **AMZD is fixed-price, not auction - bidPrice always null**
- Detected by "Units" pattern in title or "lot manifest" text on page
- Title format: "1217 Units (Est 3 pallets) - Returned Damaged- Jewelry, Luggage And Apparel lot"
- `#deliveryBlockMessage` is the most reliable selector — contains "FREE delivery" text
- `#delivery-message` may not exist on all AMZD pages

### Last Verified

Date: 2026-01-29 (AMZD: bidPrice=null, shipping=FREE from `#deliveryBlockMessage`)

---

## ATT

**Retailer:** AT&T
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (AT&T seller pages)

### Bid Price Selectors

Same as [AMZ](#amz): `auction.winningBidAmount` (dollars)

### Shipping Fee Selectors

Same as [AMZ](#amz): `selectedQuote.totalPrice` (cents, divide by 100)

### Notes

- Detected by seller name containing "at&t" (case-insensitive)
- Retailer code: ATT
- Condition extracted from `lot.description`
- Config source: `src/retailers/config/nextjs-paths.ts`

### Last Verified

Date: _Pending E2E verification (same extraction as AMZ, verified 2026-01-29)_

---

## BY

**Retailer:** Bayer
**Source File:** `src/retailers/sites/bstock-auction.ts`
**Site:** bstock.com/bayer/auction/

### Bid Price Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Shipping Fee Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Example HTML Snippet

See [ACE Example](#ace) - same DOM structure.

### Notes

- Uses B-Stock auction page layout (non-Next.js)
- Retailer code extracted from URL path: `/bayer/auction/`

### Last Verified

Date: 2026-01-29 (BY: bid $4,500 + free shipping)

---

## COSTCO

**Retailer:** Costco
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Costco seller pages)

### Bid Price Selectors

Same as [AMZ](#amz): `auction.winningBidAmount` (dollars)

### Shipping Fee Selectors

Same as [AMZ](#amz): `selectedQuote.totalPrice` (cents, divide by 100)

### Notes

- Detected by seller name containing "costco" (case-insensitive)
- Uses special naming: B (Box) or P (Pallet) prefix
- Naming format: `[B/P]_[ProductName]-[Condition]-[PSTTime]`
- Config source: `src/retailers/config/nextjs-paths.ts`

### Last Verified

Date: _Pending E2E verification (same extraction as AMZ, verified 2026-01-29)_

---

## JCP

**Retailer:** JCPenney
**Source File:** `src/retailers/sites/bstock-auction.ts`
**Site:** bstock.com/jcpenney/auction/

### Bid Price Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Shipping Fee Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Example HTML Snippet

See [ACE Example](#ace) - same DOM structure.

### Notes

- Uses B-Stock auction page layout (non-Next.js)
- Retailer code extracted from URL path: `/jcpenney/auction/`
- Same DOM structure as ACE — selectors shared via `bstock-auction.ts`

### Last Verified

Date: _Pending E2E verification (same selectors as ACE, verified 2026-01-29)_

---

## QVC

**Retailer:** QVC
**Source File:** `src/retailers/sites/bstock-auction.ts`
**Site:** bstock.com/qvc/auction/

### Bid Price Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Shipping Fee Selectors

Same as [ACE](#ace) - uses B-Stock auction page selectors.

### Example HTML Snippet

See [ACE Example](#ace) - same DOM structure.

### Notes

- Uses B-Stock auction page layout (non-Next.js)
- Retailer code extracted from URL path: `/qvc/auction/`
- Same DOM structure as ACE — selectors shared via `bstock-auction.ts`

### Last Verified

Date: _Pending E2E verification (same selectors as ACE, verified 2026-01-29)_

---

## RC

**Retailer:** Royal Closeouts
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Royal Closeouts seller pages)

### Bid Price Selectors

Same as [AMZ](#amz): `auction.winningBidAmount` (dollars)

### Shipping Fee Selectors

Same as [AMZ](#amz): `selectedQuote.totalPrice` (cents, divide by 100)

### Notes

- Detected by seller name containing "royal closeout" (case-insensitive)
- Retailer code: RC
- Product name extracted from title pattern "Pallet/Box of [Product]"
- Config source: `src/retailers/config/nextjs-paths.ts`

### Last Verified

Date: _Pending E2E verification (same extraction as AMZ, verified 2026-01-29)_

---

## TGT

**Retailer:** Target
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Target seller pages)

### Bid Price Selectors

Same as [AMZ](#amz): `auction.winningBidAmount` (dollars)

### Shipping Fee Selectors

Same as [AMZ](#amz): `selectedQuote.totalPrice` (cents, divide by 100)

### Notes

- Detected by seller name equals "target" (case-insensitive)
- Retailer code: TGT
- Categories extracted from title between "Pallets/Boxes of" and "& More"
- Config source: `src/retailers/config/nextjs-paths.ts`

### Last Verified

Date: _Pending E2E verification (same extraction as AMZ, verified 2026-01-29)_

---

## TL

**Retailer:** TechLiquidators
**Source File:** `src/retailers/sites/techliquidators.ts`
**Site:** techliquidators.com/detail/

### Bid Price Selectors

CSS selectors tried in order:
```css
[class*="bid-amount"]
[class*="current-bid"]
[class*="high-bid"]
[class*="bidPrice"]
[id*="currentBid"]
[id*="bidAmount"]
```

### Bid Price Fallback Patterns

Regex patterns searched in page body text:
```regex
/Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Bid\s*Price[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Shipping Fee Selectors

CSS selectors tried in order:
```css
[class*="shipping"]
[class*="freight"]
[id*="shipping"]
[id*="freight"]
```

### Shipping Fee Fallback Patterns

Free shipping detection:
```regex
/shipping[:\s]*free/i
/free\s*shipping/i
```

Shipping amount patterns:
```regex
/Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Estimated\s*Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Example HTML Snippet

```html
<!-- Title element -->
<h1>Electric Transportation & Accessories - 1 Pallet</h1>

<!-- Bid price element -->
<div class="current-bid">
  <span class="label">Current Bid:</span>
  <span class="bid-amount">$850.00</span>
</div>

<!-- Shipping element -->
<div class="shipping-info">
  <span>Shipping: $125.00</span>
</div>

<!-- Condition (in body text) -->
<div>Condition: Uninspected Returns</div>

<!-- Time (in body text) -->
<div>End time in PST: 11:39 AM (1139 military)</div>
```

### Notes

- Title extracted from `<h1>` element, split on " - "
- Condition extracted from "Condition: [value]" pattern in body text
- Time extracted from PST military format in parentheses
- Direct URL download strategy using `pallet_manifests` links

### Last Verified

Date: _Placeholder for manual verification_

---

## Fallback Behavior

When selectors find no matching elements:

1. **Bid Price:** Returns `null`
   - Status message: "Could not extract bid price from [retailer]..."
   - CSV output: Empty cell (not 0)

2. **Shipping Fee:** Returns `null`
   - Status message: "Could not extract shipping fee from [retailer]..."
   - CSV output: Empty cell (not 0)

3. **Free Shipping:** Returns `0`
   - Detected by "free" keyword in shipping text
   - CSV output: "0" (distinguishes from not-found)

**Important:** `null` means "not found", `0` means "found and is zero (free)"

---

## Maintenance Guide

### When to Update This Document

1. **Site Structure Changes:** When a retailer updates their HTML structure
2. **New Selectors Added:** When code adds new CSS selectors or regex patterns
3. **New Retailers Added:** When support for new retailers is implemented
4. **Verification:** After manually verifying selectors still work

### How to Update Selectors

1. **Inspect the page** using browser DevTools
2. **Identify the element** containing bid price or shipping fee
3. **Find a reliable selector** (prefer `id`, then `data-*`, then `class`)
4. **Update the source file** in `src/retailers/sites/`
5. **Update this document** with the new selector
6. **Test** by running the extension on a live page

### Selector Priority Guidelines

1. **`__NEXT_DATA__` JSON** - Most reliable for Next.js sites (B-Stock marketplace)
2. **ID selectors** - Stable, rarely change
3. **data-testid** - Intended for automation, usually stable
4. **Class selectors** - May change with redesigns
5. **Regex fallback** - Last resort, searches entire page text

### Testing Selectors

```javascript
// In browser console on retailer page:
document.querySelector('[class*="bid-amount"]')?.textContent
document.querySelector('[class*="shipping"]')?.textContent

// For __NEXT_DATA__:
JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
```

### Common Issues

1. **Dynamic content:** Some prices load via JavaScript after page load
2. **A/B testing:** Different users may see different HTML structures
3. **Regional variations:** International sites may have different layouts
4. **Logged-in state:** Some elements only visible when authenticated
