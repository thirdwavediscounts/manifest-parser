import { test, expect, type BrowserContext } from '@playwright/test'
import {
  launchBrowserWithExtension,
  getExtensionId,
  openPopup,
} from './extension.setup'

// TL auction URL for smoke testing
// If this auction expires, replace with any live TL detail page
const TL_AUCTION_URL =
  'https://www.techliquidators.com/detail/dng21883/home-theater-accessories-computer-accessories'

let context: BrowserContext
let extensionId: string

test.describe('TL Smoke Test', () => {
  test.beforeAll(async () => {
    context = await launchBrowserWithExtension()
    extensionId = await getExtensionId(context)
  })

  test.afterAll(async () => {
    await context?.close()
  })

  test('extension loads and popup opens', async () => {
    const popup = await openPopup(context, extensionId)
    // Verify popup loaded by checking for a known element
    // The popup should have some content (process button, format toggle, etc.)
    await expect(popup.locator('body')).not.toBeEmpty()
    // Check page has meaningful content (not a blank page)
    const bodyText = await popup.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
    await popup.close()
  })

  test('TL auction page loads metadata', async () => {
    const page = await context.newPage()
    await page.goto(TL_AUCTION_URL, { waitUntil: 'domcontentloaded' })

    // Check if auction is still live (not a 404 or expired page)
    const title = await page.title()
    const h1 = await page.locator('h1').first().textContent().catch(() => null)

    if (!h1 || title.toLowerCase().includes('not found') || title.toLowerCase().includes('404')) {
      test.skip(true, `Auction page not available: ${title}`)
      await page.close()
      return
    }

    console.log(`Page title: ${title}`)
    console.log(`H1: ${h1}`)

    // Extract bid price using TL selectors
    const bidPrice = await page.evaluate(() => {
      const pricingBox = document.querySelector('.lot-pricing-box')
      if (!pricingBox) return null
      const items = pricingBox.querySelectorAll('.lot-pricing-box-item')
      for (const item of items) {
        const text = (item.textContent || '').toLowerCase()
        if (text.includes('bid')) {
          const priceEl = item.querySelector('.col-xs-3')
          return priceEl?.textContent?.trim() ?? null
        }
      }
      // Fallback: first price in pricing box
      const first = pricingBox.querySelector('.col-xs-3')
      return first?.textContent?.trim() ?? null
    })

    // Extract shipping fee using TL selectors
    const shippingFee = await page.evaluate(() => {
      const pricingBox = document.querySelector('.lot-pricing-box')
      if (!pricingBox) return null
      const items = pricingBox.querySelectorAll('.lot-pricing-box-item')
      for (const item of items) {
        const text = (item.textContent || '').toLowerCase()
        if (text.includes('shipping') || text.includes('freight')) {
          const priceEl = item.querySelector('.col-xs-3')
          return priceEl?.textContent?.trim() ?? null
        }
      }
      return null
    })

    console.log(`Bid price: ${bidPrice}`)
    console.log(`Shipping fee: ${shippingFee}`)

    // If the auction is expired/closed, prices may not be present
    // Skip gracefully rather than fail
    if (!bidPrice && !shippingFee) {
      const bodyText = await page.locator('body').innerText()
      if (
        bodyText.toLowerCase().includes('closed') ||
        bodyText.toLowerCase().includes('ended') ||
        bodyText.toLowerCase().includes('expired')
      ) {
        test.skip(true, 'Auction has ended - no active pricing available')
        await page.close()
        return
      }
    }

    // Assert bid price is a dollar amount
    expect(bidPrice).not.toBeNull()
    expect(bidPrice).toMatch(/\$[\d,]+/)

    // Assert shipping fee is a dollar amount
    expect(shippingFee).not.toBeNull()
    expect(shippingFee).toMatch(/\$[\d,]+/)

    await page.close()
  })
})
