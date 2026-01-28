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

CSS selectors tried in order:
```css
[class*="bid-amount"]
[class*="current-bid"]
[class*="winning-bid"]
[class*="high-bid"]
[id*="currentBid"]
[id*="winningBid"]
```

### Bid Price Fallback Patterns

Regex patterns searched in page body text:
```regex
/Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Winning\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Bid\s*Amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
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
/Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Example HTML Snippet

```html
<!-- Bid price element -->
<div class="current-bid-amount">$1,250.00</div>

<!-- Shipping element -->
<div class="shipping-cost">$150.00</div>
```

### Notes

- Uses B-Stock auction page layout (non-Next.js)
- Retailer code extracted from URL path: `/acehardware/auction/`
- Two-step download: Click "Manifest" button, then "Download Full Manifest"

### Last Verified

Date: _Placeholder for manual verification_

---

## AMZ

**Retailer:** Amazon B-Stock (marketplace auctions)
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Amazon seller pages)

### Bid Price Selectors

**Primary:** `__NEXT_DATA__` JSON extraction

Fields checked in order:
```
currentBid, winningBid, highBid, currentPrice, bidAmount
lot.currentBid, lot.winningBid, lot.highBid, lot.currentPrice, lot.bidAmount
```

**DOM Fallback** (if `__NEXT_DATA__` unavailable):
```css
[data-testid*="bid"]
[data-testid*="price"]
[class*="bid-amount"]
[class*="current-bid"]
[class*="winning-bid"]
[class*="CurrentBid"]
[class*="bidPrice"]
```

### Shipping Fee Selectors

**Primary:** `__NEXT_DATA__` JSON extraction

Fields checked in order:
```
shippingCost, estimatedShipping, freightCost, shipping, deliveryCost
lot.shippingCost, lot.estimatedShipping, lot.freightCost, lot.shipping, lot.deliveryCost
```

**DOM Fallback:**
```css
[class*="shipping"]
[class*="Shipping"]
[class*="freight"]
[class*="Freight"]
[data-testid*="shipping"]
```

### Example HTML Snippet

```html
<!-- __NEXT_DATA__ script tag (primary source) -->
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "dehydratedState": {
        "queries": [{
          "queryKey": ["listing"],
          "state": {
            "data": {
              "currentBid": 1250.00,
              "shippingCost": 150.00,
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
</script>

<!-- DOM fallback elements -->
<div class="bid-amount">$1,250.00</div>
<div class="shipping-cost">$150.00</div>
```

### Notes

- Uses Next.js `__NEXT_DATA__` script for structured data extraction
- Seller identified from `seller.storefront.name` or `seller.account.displayName`
- Auction end time from `datePurchasingEnds`, `auctionEndTime`, or `endTime`
- Free shipping detected by string "free" in shipping field value

### Last Verified

Date: _Placeholder for manual verification_

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

### Example HTML Snippet

```html
<!-- Delivery message element -->
<div id="delivery-message">
  <span>FREE Shipping on orders over $25</span>
</div>

<!-- Alternative shipping element -->
<div class="delivery-message">
  <span>Shipping: $12.99</span>
</div>
```

### Notes

- **AMZD is fixed-price, not auction - bidPrice always null**
- Detected by "Units" pattern in title or "lot manifest" text on page
- Title format: "161 Units (Est 1 pallets) - Returned Damaged- Pc, Electronics And Wireless lot"
- Price calculation done separately (manifest parsing multiplies by 4.5x)

### Last Verified

Date: _Placeholder for manual verification_

---

## ATT

**Retailer:** AT&T
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (AT&T seller pages)

### Bid Price Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace `__NEXT_DATA__` extraction.

**Primary:** `__NEXT_DATA__` JSON fields
**DOM Fallback:** Standard B-Stock selectors

### Shipping Fee Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace extraction.

### Example HTML Snippet

See [AMZ Example](#amz) - same `__NEXT_DATA__` structure.

### Notes

- Detected by seller name containing "at&t" (case-insensitive)
- Retailer code: ATT
- Condition extracted from `lot.description`

### Last Verified

Date: _Placeholder for manual verification_

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

Date: _Placeholder for manual verification_

---

## COSTCO

**Retailer:** Costco
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Costco seller pages)

### Bid Price Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace `__NEXT_DATA__` extraction.

### Shipping Fee Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace extraction.

### Example HTML Snippet

See [AMZ Example](#amz) - same `__NEXT_DATA__` structure.

### Notes

- Detected by seller name containing "costco" (case-insensitive)
- Uses special naming: B (Box) or P (Pallet) prefix
- Naming format: `[B/P]_[ProductName]-[Condition]-[PSTTime]`

### Last Verified

Date: _Placeholder for manual verification_

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

### Last Verified

Date: _Placeholder for manual verification_

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

### Last Verified

Date: _Placeholder for manual verification_

---

## RC

**Retailer:** Royal Closeouts
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Royal Closeouts seller pages)

### Bid Price Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace `__NEXT_DATA__` extraction.

### Shipping Fee Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace extraction.

### Example HTML Snippet

See [AMZ Example](#amz) - same `__NEXT_DATA__` structure.

### Notes

- Detected by seller name containing "royal closeout" (case-insensitive)
- Retailer code: RC
- Product name extracted from title pattern "Pallet/Box of [Product]"

### Last Verified

Date: _Placeholder for manual verification_

---

## TGT

**Retailer:** Target
**Source File:** `src/retailers/sites/bstock.ts`
**Site:** bstock.com (Target seller pages)

### Bid Price Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace `__NEXT_DATA__` extraction.

### Shipping Fee Selectors

Same as [AMZ](#amz) - uses B-Stock marketplace extraction.

### Example HTML Snippet

See [AMZ Example](#amz) - same `__NEXT_DATA__` structure.

### Notes

- Detected by seller name equals "target" (case-insensitive)
- Retailer code: TGT
- Categories extracted from title between "Pallets/Boxes of" and "& More"

### Last Verified

Date: _Placeholder for manual verification_

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
