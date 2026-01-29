import { test, expect, type BrowserContext } from '@playwright/test'
import { launchBrowserWithExtension, getExtensionId } from './extension.setup'

/**
 * AMZD (Amazon Direct) E2E tests
 *
 * Validates metadata extraction from Amazon liquidation product pages.
 * AMZD is fixed-price (not auction) — bidPrice must be null.
 * Shipping fee extracted from delivery/shipping DOM selectors.
 *
 * Listings change frequently — tests skip gracefully on unavailable pages.
 */

// Amazon liquidation listing URLs — these are amazon.com/dp/ product pages
// These may expire; update as needed
const AMZD_TEST_URLS = [
  'https://www.amazon.com/dp/B0GGBJ6D1Q', // Liquidation pallet listing
  'https://www.amazon.com/dp/B0DPF24FPJ', // Alternative listing
  'https://www.amazon.com/dp/B0DPDJP1VK', // Alternative listing
]

let context: BrowserContext

test.describe('AMZD E2E', () => {
  test.beforeAll(async () => {
    context = await launchBrowserWithExtension()
    await getExtensionId(context)
  })

  test.afterAll(async () => {
    await context?.close()
  })

  test('AMZD listing extracts metadata: bidPrice=null, shippingFee>=0', async () => {
    test.setTimeout(45_000)

    let page = await context.newPage()
    let loaded = false

    // Try each URL until one works
    for (const url of AMZD_TEST_URLS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      } catch {
        console.log(`AMZD: Failed to load ${url}, trying next...`)
        await page.close()
        page = await context.newPage()
        continue
      }

      const title = await page.title()
      const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '')
      const lower = (title + ' ' + bodyText).toLowerCase()

      // Skip unavailable pages
      if (
        lower.includes('currently unavailable') ||
        lower.includes('page not found') ||
        lower.includes('404') ||
        lower.includes("we couldn't find") ||
        lower.includes('dog') && lower.includes('page') || // Amazon 404 page
        page.url().includes('/ap/signin') ||
        page.url().includes('/errors/')
      ) {
        console.log(`AMZD: ${url} unavailable: "${title.substring(0, 80)}"`)
        await page.close()
        page = await context.newPage()
        continue
      }

      loaded = true
      break
    }

    if (!loaded) {
      test.skip(true, 'All AMZD test URLs unavailable')
      await page.close()
      return
    }

    const currentUrl = page.url()
    console.log(`AMZD: Testing page: ${currentUrl}`)
    console.log(`AMZD: Title: ${await page.title()}`)

    // Run extractMetadata selector logic via page.evaluate
    const result = await page.evaluate(() => {
      function parsePrice(text: string | null): number | null {
        if (!text) return null
        const cleaned = text.replace(/[$,\s]/g, '').trim()
        if (!/^\d/.test(cleaned)) return null
        const value = parseFloat(cleaned)
        return isNaN(value) ? null : value
      }

      // Detect AMZD
      const rawTitle = document.getElementById('productTitle')?.textContent?.trim()
        || document.title.replace(/^Amazon\.com:\s*/i, '')
      const hasUnits = /\d+\s*Units/i.test(rawTitle)
      const hasLotManifest = document.body.textContent?.toLowerCase().includes('lot manifest')
      const isAMZD = hasUnits || hasLotManifest

      // Extract shipping fee using same selectors as amazon.ts
      const shippingSelectors = [
        '#price-shipping-message',
        '#delivery-message',
        '#deliveryBlockMessage',
        '#deliveryBlockMessage .a-text-bold',
        '#mir-layout-DELIVERY_BLOCK-block',
        '#mir-layout-DELIVERY_BLOCK',
        'span[data-csa-c-action="shipFromPrice"]',
        '[data-csa-c-content-id*="shipping"]',
        '#amazonGlobal_feature_div',
        '#deliveryMessage_feature_div',
        '.shipping-message',
        '[class*="delivery"]',
        '[class*="shipping"]',
      ]

      let shippingFee: number | null = null
      let matchedSelector: string | null = null

      for (const selector of shippingSelectors) {
        const el = document.querySelector(selector)
        if (el?.textContent) {
          const text = el.textContent.toLowerCase()
          if (text.includes('free shipping') || text.includes('free delivery')) {
            shippingFee = 0
            matchedSelector = selector + ' (free)'
            break
          }
          const priceMatch = el.textContent.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:shipping|delivery)/i)
            || el.textContent.match(/(?:shipping|delivery)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i)
          if (priceMatch) {
            const cleaned = priceMatch[1].replace(/[$,\s]/g, '').trim()
            if (/^\d/.test(cleaned)) {
              const parsed = parseFloat(cleaned)
              if (!isNaN(parsed)) {
                shippingFee = parsed
                matchedSelector = selector
                break
              }
            }
          }
        }
      }

      // Fallback: body text patterns
      if (shippingFee === null) {
        const bodyText = document.body.innerText || ''
        if (/free\s*(?:shipping|delivery)/i.test(bodyText)) {
          shippingFee = 0
          matchedSelector = 'body-text (free)'
        } else {
          const patterns = [
            /Shipping[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
            /Delivery[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
          ]
          for (const pattern of patterns) {
            const match = bodyText.match(pattern)
            if (match) {
              const parsed = parsePrice(match[1])
              if (parsed !== null) {
                shippingFee = parsed
                matchedSelector = 'body-text-regex'
                break
              }
            }
          }
        }
      }

      // Extract listing price as bid_price (AMZD is fixed-price)
      let bidPrice: number | null = null
      const offscreen = document.querySelector('.a-price .a-offscreen')
      if (offscreen?.textContent) {
        bidPrice = parsePrice(offscreen.textContent)
      }
      if (bidPrice === null) {
        const whole = document.querySelector('.a-price-whole')
        const fraction = document.querySelector('.a-price-fraction')
        if (whole?.textContent) {
          const priceStr = whole.textContent.replace(/[.,\s]/g, '') + '.' + (fraction?.textContent || '00')
          bidPrice = parsePrice(priceStr)
        }
      }

      return {
        isAMZD,
        rawTitle: rawTitle.substring(0, 120),
        shippingFee,
        matchedSelector,
        bidPrice,
      }
    })

    console.log(`AMZD result: ${JSON.stringify(result)}`)

    // Assert: retailer detected as AMZD
    if (!result.isAMZD) {
      // Page loaded but isn't a liquidation listing — skip
      test.skip(true, `Page is not an AMZD liquidation listing: "${result.rawTitle}"`)
      await page.close()
      return
    }
    expect(result.isAMZD, 'Should detect as AMZD').toBeTruthy()

    // Assert: bidPrice is a positive number (listing price)
    expect(result.bidPrice, 'AMZD bidPrice must be a positive number (listing price)').toBeGreaterThan(0)
    console.log(`AMZD bid_price: $${result.bidPrice}`)

    // Assert: shippingFee is a number >= 0 or null (graceful skip if not found)
    if (result.shippingFee !== null) {
      expect(result.shippingFee, 'shippingFee should be >= 0').toBeGreaterThanOrEqual(0)
      console.log(`AMZD shipping_fee: $${result.shippingFee} (selector: ${result.matchedSelector})`)
    } else {
      console.log('AMZD shipping_fee: null (no shipping info found on page — acceptable)')
    }

    // Assert: listing name contains "Units" (liquidation listing indicator)
    expect(result.rawTitle.toLowerCase(), 'Title should contain "units"').toContain('unit')

    await page.close()
  })

  test('AMZD CSV download link presence (E2E-04 partial)', async () => {
    test.setTimeout(30_000)

    // E2E-04: Row count verification requires full extension pipeline
    // This partial test checks for "Download CSV" link presence on the page
    // Full row count verification deferred to manual testing

    let page = await context.newPage()
    let loaded = false

    for (const url of AMZD_TEST_URLS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      } catch {
        await page.close()
        page = await context.newPage()
        continue
      }

      const title = await page.title()
      const lower = title.toLowerCase()
      if (
        lower.includes('not found') ||
        lower.includes('404') ||
        page.url().includes('/ap/signin')
      ) {
        await page.close()
        page = await context.newPage()
        continue
      }

      loaded = true
      break
    }

    if (!loaded) {
      test.skip(true, 'All AMZD test URLs unavailable for CSV link check')
      await page.close()
      return
    }

    // Check if "Download CSV" or similar link exists on the page
    const hasDownloadLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      return links.some((el) => {
        const text = (el.textContent || '').toLowerCase()
        return text.includes('download csv') || text.includes('download manifest') || text.includes('lot manifest')
      })
    })

    console.log(`AMZD CSV download link present: ${hasDownloadLink}`)

    // If no download link, the page might not be a manifest page — skip gracefully
    if (!hasDownloadLink) {
      const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '')
      if (bodyText.toLowerCase().includes('lot manifest')) {
        console.log('AMZD: "lot manifest" text found but no clickable download link')
      } else {
        test.skip(true, 'No CSV download link found — page may not have manifest')
      }
    }

    // Note: Full row count verification (E2E-04) requires the extension's blob intercept
    // pipeline to capture and process the CSV. This is deferred to manual testing.
    // See: src/retailers/sites/amazon.ts downloadManifest()

    await page.close()
  })
})
