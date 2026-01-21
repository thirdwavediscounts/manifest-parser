# Retailer Manifest Button Reference

This document maps each retailer to their manifest download button/link pattern.

## B-Stock Marketplace Retailers

These retailers use the `bstock.com/buy/listings/details/*` URL pattern and are identified by the page title.

### Royal Closeouts
- **URL Pattern:** `bstock.com/buy/listings/details/*`
- **Site Identifier:** Page title contains "Royal Closeouts"
- **Manifest Button:** "Download Manifest" (blue outlined button)
- **Button Location:** Near title, next to "View Manifest" button
- **Layout Type:** Marketplace

---

### AT&T Accessories
- **URL Pattern:** `bstock.com/buy/listings/details/*`
- **Site Identifier:** Page title contains "AT&T Accessories"
- **Manifest Button:** "Download Manifest" (blue outlined button)
- **Button Location:** Near title, next to "View Manifest" button
- **Layout Type:** Marketplace

---

### Costco Wholesale
- **URL Pattern:** `bstock.com/buy/listings/details/*`
- **Site Identifier:** Page title contains "Costco Wholesale"
- **Manifest Button:** "Download Manifest" (blue outlined button)
- **Button Location:** Near title, next to "View Manifest" button
- **Layout Type:** Marketplace

---

### Target
- **URL Pattern:** `bstock.com/buy/listings/details/*`
- **Site Identifier:** Page title contains "Target"
- **Manifest Button:** "Download Manifest" (blue outlined button)
- **Button Location:** Near title, next to "View Manifest" button
- **Layout Type:** Marketplace

---

### Amazon (B-Stock)
- **URL Pattern:** `bstock.com/buy/listings/details/*`
- **Site Identifier:** Page title contains "Amazon" AND URL contains `bstock.com`
- **Manifest Button:** "Download Manifest" (blue outlined button)
- **Button Location:** Near title, next to "View Manifest" button
- **Layout Type:** Marketplace

---

## B-Stock Auction Retailers

These retailers use the `bstock.com/{retailer}/auction/*` URL pattern and are identified by the URL path.

### QVC
- **URL Pattern:** `bstock.com/qvc/auction/*`
- **Site Identifier:** URL contains `/qvc/`
- **Manifest Button:** "Download Full Manifest" (red button)
- **Button Location:** Right sidebar, under auction details
- **Layout Type:** Auction

---

### Bayer
- **URL Pattern:** `bstock.com/bayer/auction/*`
- **Site Identifier:** URL contains `/bayer/`
- **Manifest Button:** "Download Full Manifest" (red button)
- **Button Location:** Right sidebar, under auction details
- **Layout Type:** Auction

---

### Ace Hardware
- **URL Pattern:** `bstock.com/acehardware/auction/*`
- **Site Identifier:** URL contains `/acehardware/`
- **Manifest Button:** "Full Manifest" (red button)
- **Button Location:** Right sidebar, under auction details
- **Layout Type:** Auction

---

### JCPenney
- **URL Pattern:** `bstock.com/jcpenney/auction/*`
- **Site Identifier:** URL contains `/jcpenney/`
- **Manifest Button:** "Full Manifest" (red button)
- **Button Location:** Right sidebar, under auction details
- **Layout Type:** Auction

---

## Other Platforms

### TechLiquidators
- **URL Pattern:** `techliquidators.com/detail/*`
- **Site Identifier:** Domain is `techliquidators.com`
- **Manifest Button:** "Download Manifest" (gray button)
- **Button Location:** Right sidebar panel
- **Layout Type:** Different platform (not B-Stock)

---

### Amazon.com (Direct Liquidation)
- **URL Pattern:** `amazon.com/dp/*`
- **Site Identifier:** Domain is `amazon.com` (NOT bstock.com)
- **Manifest Button:** "Download CSV" (blue link)
- **Button Location:** Above the lot manifest table
- **Layout Type:** Amazon marketplace liquidation listing

---

## Excluded Retailers (No current listings)
- Hanes
- Petco
- SupplyStore
- Footlocker
- Looprl
- Direct Liquidation (DLQ)

---

## Summary by Layout Type

### Marketplace Layout (bstock.com/buy/listings/details/*)
| Retailer | Identifier | Button Text |
|----------|------------|-------------|
| Royal Closeouts | Title contains "Royal Closeouts" | "Download Manifest" |
| AT&T Accessories | Title contains "AT&T Accessories" | "Download Manifest" |
| Costco Wholesale | Title contains "Costco Wholesale" | "Download Manifest" |
| Target | Title contains "Target" | "Download Manifest" |
| Amazon | Title contains "Amazon" | "Download Manifest" |

### Auction Layout (bstock.com/{retailer}/auction/*)
| Retailer | URL Path | Button Text |
|----------|----------|-------------|
| QVC | `/qvc/` | "Download Full Manifest" |
| Bayer | `/bayer/` | "Download Full Manifest" |
| Ace Hardware | `/acehardware/` | "Full Manifest" |
| JCPenney | `/jcpenney/` | "Full Manifest" |

### Other Platforms
| Retailer | Domain | Button Text |
|----------|--------|-------------|
| TechLiquidators | techliquidators.com | "Download Manifest" |
| Amazon.com (Direct) | amazon.com | "Download CSV" |

---

## Implementation Notes

1. **Marketplace retailers** (`/buy/listings/details/*`): Identify by page title, button is always "Download Manifest"
2. **Auction retailers** (`/{retailer}/auction/*`): Identify by URL path, button text varies ("Download Full Manifest" or "Full Manifest")
3. **TechLiquidators**: Completely different platform, use domain detection
4. **Amazon.com Direct**: Use domain detection (amazon.com), button is "Download CSV" link above the manifest table
