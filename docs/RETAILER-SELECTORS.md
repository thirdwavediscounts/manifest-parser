# Retailer DOM Selectors Reference

Live auction URL examples and verified DOM selectors for bid price and shipping fee extraction.

**Last Updated:** 2026-01-28
**Source:** Daily Auction Links Google Sheet

---

## Quick Reference

| Retailer | Code | Site Type | Bid Price Selector | Shipping Selector |
|----------|------|-----------|-------------------|-------------------|
| Ace Hardware | ACE | B-Stock Classic | `#current_bid_amount` | `#shipping_fee` |
| Amazon B-Stock | AMZ | B-Stock Next.js | `__NEXT_DATA__` JSON | `__NEXT_DATA__` JSON |
| Amazon Direct | AMZD | Amazon | N/A (fixed price) | `#delivery-message` |
| AT&T | ATT | B-Stock Next.js | `__NEXT_DATA__` JSON | `__NEXT_DATA__` JSON |
| Bayer | BY | B-Stock Classic | `#current_bid_amount` | `#shipping_fee` |
| Costco | COSTCO | B-Stock Next.js | `__NEXT_DATA__` JSON | `__NEXT_DATA__` JSON |
| JCPenney | JCP | B-Stock Classic | `#current_bid_amount` | `#shipping_fee` |
| QVC | QVC | B-Stock Classic | `#current_bid_amount` | `#shipping_fee` |
| Royal Closeout | RC | B-Stock Next.js | `__NEXT_DATA__` JSON | `__NEXT_DATA__` JSON |
| Target | TGT | B-Stock Next.js | `__NEXT_DATA__` JSON | `__NEXT_DATA__` JSON |
| TechLiquidators | TL | Custom | `.bid-amount` | `.shipping-info` |

---

## B-Stock Classic Sites

These sites use the older B-Stock auction layout (non-Next.js).

### Verified Selectors

```javascript
// Bid Price
document.querySelector('#current_bid_amount')?.textContent
// Example: "$100" or "$1,312"

// B-Stock Fee (buyer's premium)
document.querySelector('#buyersPremiumLabelResult')?.textContent
// Example: "$5.00" or "$65.60"

// Shipping Fee (in bid confirmation popup)
document.querySelector('#shipping_fee')?.textContent

// Opening bid (when no bids yet)
document.querySelector('#current_bid_label')?.textContent
// "Current bid" vs "Opening bid"
```

### HTML Structure (Verified 2026-01-28)

```html
<!-- Bid section -->
<div id="current_bid_label" class="auction-data-label">Current bid</div>
<div class="auction-data-content">
    <span id="current_bid_amount">$100</span>
</div>

<!-- Additional charges -->
<span>
    <strong>+ <span id="buyersPremiumLabelResult">$5.00</span></strong>
    B-Stock Fee
</span>

<!-- Shipping (in confirm bid popup) -->
<div class="additional-charges-item">
    <div class="left-text-label">
        <strong class="option-label">Shipping Fee</strong><br>
        <span id="bid-shipping-label" class="label">LTL Shipping Rate</span>
    </div>
    <div class="current-bid-amount">
        <div class="popup-additional-price-section" id="shipping_fee"></div>
    </div>
</div>
```

---

## ACE (Ace Hardware)

**Site Type:** B-Stock Classic
**URL Pattern:** `bstock.com/acehardware/auction/auction/view/id/{id}/`

### Example URL

```
https://bstock.com/acehardware/auction/auction/view/id/2362/
```

### Verified Data (2026-01-28)

- **Listing:** 1 Pallet of Power Tools & More by Stanley
- **Current Bid:** $1,312
- **B-Stock Fee:** $65.60
- **Avg Cost/Unit:** $29.16

### Selectors

| Field | Selector | Example Value |
|-------|----------|---------------|
| Bid Price | `#current_bid_amount` | `$1,312` |
| B-Stock Fee | `#buyersPremiumLabelResult` | `$65.60` |
| Shipping Fee | `#shipping_fee` | (in popup) |
| Close Time | `#auction_end_time` | `Fri Jan 30, 2026 11:00:00 AM` |

---

## AMZ (Amazon B-Stock)

**Site Type:** B-Stock Next.js Marketplace
**URL Pattern:** `bstock.com/buy/listings/details/{hash}`

### Example URL

```
https://bstock.com/buy/listings/details/6971ef333172ac79a96f7778
```

### Selectors

Primary extraction from `__NEXT_DATA__` script tag:

```javascript
const nextData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
const listing = nextData.props.pageProps.dehydratedState.queries[0].state.data;

// Bid price
listing.currentBid || listing.winningBid || listing.highBid

// Shipping fee
listing.shippingCost || listing.estimatedShipping
```

### Notes

- Requires authentication for some listings
- May show "Unexpected error" for expired/restricted listings

---

## AMZD (Amazon Direct)

**Site Type:** Amazon Product Page
**URL Pattern:** `amazon.com/{title}/dp/{ASIN}`

### Example URL

```
https://www.amazon.com/888-Units-Est-pallets-Returned/dp/B0GH7Y84RB/ref=lp_2351101
```

### Selectors

**No bid price** - Amazon Direct is fixed-price liquidation, not auction.

```javascript
// Shipping/Delivery info
document.querySelector('#delivery-message')?.textContent
document.querySelector('#deliveryBlockMessage')?.textContent
document.querySelector('[data-csa-c-content-id*="shipping"]')?.textContent
```

### Notes

- Price calculated from manifest: `Lot item price * 4.5`
- ASIN extracted via regex: `/B0[A-Z0-9]{8,}/`
- Look for "Units" pattern in title to identify AMZD listings

---

## ATT (AT&T)

**Site Type:** B-Stock Next.js Marketplace
**URL Pattern:** `bstock.com/buy/listings/details/{hash}`

### Example URL

```
https://bstock.com/buy/listings/details/696faee72b4f9c55a80526ad
```

### Selectors

Same as [AMZ](#amz-amazon-b-stock) - uses `__NEXT_DATA__` extraction.

### Notes

- Detected by seller name containing "at&t" (case-insensitive)

---

## BY (Bayer)

**Site Type:** B-Stock Classic
**URL Pattern:** `bstock.com/bayer/auction/auction/view/id/{id}/`

### Example URL

```
https://bstock.com/bayer/auction/auction/view/id/1013/
```

### Selectors

Same as [ACE](#ace-ace-hardware) - uses B-Stock Classic selectors.

### Notes

- Requires authentication to view auction details
- Redirects to login page for non-authenticated users

---

## COSTCO

**Site Type:** B-Stock Next.js Marketplace
**URL Pattern:** `bstock.com/buy/listings/details/{hash}`

### Example URL

```
https://bstock.com/buy/listings/details/6977cb5433214009ee0fa42
```

### Selectors

Same as [AMZ](#amz-amazon-b-stock) - uses `__NEXT_DATA__` extraction.

### Notes

- Detected by seller name containing "costco"
- Uses B (Box) or P (Pallet) naming prefix

---

## JCP (JCPenney)

**Site Type:** B-Stock Classic
**URL Pattern:** `bstock.com/jcpenney/auction/auction/view/id/{id}/`

### Example URL

```
https://bstock.com/jcpenney/auction/auction/view/id/11856/
```

### Verified Data (2026-01-28)

- **Listing:** 1 Pallet of Women's Footwear, Men's Footwear & More
- **Current Bid:** $100
- **B-Stock Fee:** $5.00
- **Avg Cost/Unit:** $0.63
- **Ext. Retail:** $13,937

### Selectors

| Field | Selector | Example Value |
|-------|----------|---------------|
| Bid Price | `#current_bid_amount` | `$100` |
| B-Stock Fee | `#buyersPremiumLabelResult` | `$5.00` |
| Shipping Fee | `#shipping_fee` | (in popup) |
| Close Time | `#auction_end_time` | `Wed Jan 28, 2026 12:05:00 PM` |
| Bid Count | `#bid_number` | `1` |

---

## QVC

**Site Type:** B-Stock Classic
**URL Pattern:** `bstock.com/qvc/auction/auction/view/id/{id}/`

### Example URL

```
https://bstock.com/qvc/auction/auction/view/id/17347/
```

### Verified Data (2026-01-28)

- **Listing:** 1 Pallet of Countertop Nugget Ice Maker by Technique
- **Opening Bid:** $100 (no bids yet)
- **B-Stock Fee:** $5.00
- **Avg Cost/Unit:** $6.67
- **Ext. Retail:** $4,800

### Selectors

Same as [JCP](#jcp-jcpenney) - uses B-Stock Classic selectors.

### Notes

- Shows "Opening bid" instead of "Current bid" when no bids placed

---

## RC (Royal Closeout)

**Site Type:** B-Stock Next.js Marketplace
**URL Pattern:** `bstock.com/buy/listings/details/{hash}`

### Example URL

```
https://bstock.com/buy/listings/details/696faee72b4f9c55a80526ad
```

### Selectors

Same as [AMZ](#amz-amazon-b-stock) - uses `__NEXT_DATA__` extraction.

### Notes

- Detected by seller name containing "royal closeout"

---

## TGT (Target)

**Site Type:** B-Stock Next.js Marketplace
**URL Pattern:** `bstock.com/buy/listings/details/{hash}`

### Example URL

```
https://bstock.com/buy/listings/details/6974162ed863dda233701e94
```

### Selectors

Same as [AMZ](#amz-amazon-b-stock) - uses `__NEXT_DATA__` extraction.

### Notes

- Detected by seller name equals "target" (case-insensitive)

---

## TL (TechLiquidators)

**Site Type:** Custom Auction Site
**URL Pattern:** `techliquidators.com/detail/{slug}/{category}`

### Example URL

```
https://www.techliquidators.com/detail/dng21883/home-theater-accessories-computer-accessories
```

### Selectors

```javascript
// Bid price
document.querySelector('.bid-amount')?.textContent
document.querySelector('.current-bid')?.textContent
document.querySelector('[class*="bid"]')?.textContent

// Shipping fee
document.querySelector('.shipping-info')?.textContent
document.querySelector('[class*="shipping"]')?.textContent
```

### Fallback Regex Patterns

```javascript
// Bid price from body text
/Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/High\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i

// Shipping from body text
/Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
/Freight[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
```

### Notes

- Site blocks automated scrapers (returns 406 Not Acceptable)
- Requires real browser for verification
- Title extracted from `<h1>` element
- Condition from "Condition: [value]" pattern

---

## Verification Checklist

When verifying selectors on live pages:

### B-Stock Classic Sites

- [ ] `#current_bid_amount` shows bid price with $ prefix
- [ ] `#buyersPremiumLabelResult` shows B-Stock fee
- [ ] `#auction_end_time` shows close date/time
- [ ] `#bid_number` shows number of bids
- [ ] Confirm bid popup loads with shipping info

### B-Stock Next.js Sites

- [ ] `#__NEXT_DATA__` script tag exists
- [ ] JSON contains `currentBid` or similar field
- [ ] JSON contains `shippingCost` or similar field
- [ ] Seller name correctly identifies retailer

### TechLiquidators

- [ ] `<h1>` contains auction title
- [ ] Bid price visible in page content
- [ ] Shipping info visible in page content
- [ ] "Condition:" pattern present

---

## Source Files

| Retailer Type | Source File |
|---------------|-------------|
| B-Stock Classic | `src/retailers/sites/bstock-auction.ts` |
| B-Stock Next.js | `src/retailers/sites/bstock.ts` |
| Amazon Direct | `src/retailers/sites/amazon.ts` |
| TechLiquidators | `src/retailers/sites/techliquidators.ts` |

---

*Generated from live page scraping on 2026-01-28*
