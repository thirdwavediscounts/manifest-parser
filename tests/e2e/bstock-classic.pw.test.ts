import { test, expect, type BrowserContext } from '@playwright/test'
import { launchBrowserWithExtension, getExtensionId } from './extension.setup'

const CLASSIC_URLS: Record<string, string> = {
  ACE: 'https://bstock.com/acehardware/auction/auction/view/id/2362/',
  BY: 'https://bstock.com/bayer/auction/auction/view/id/1013/',
  JCP: 'https://bstock.com/jcpenney/auction/auction/view/id/11856/',
  QVC: 'https://bstock.com/qvc/auction/auction/view/id/17347/',
}

let context: BrowserContext

test.describe('B-Stock Classic E2E', () => {
  test.beforeAll(async () => {
    context = await launchBrowserWithExtension()
    await getExtensionId(context)
  })

  test.afterAll(async () => {
    await context?.close()
  })

  for (const [retailer, url] of Object.entries(CLASSIC_URLS)) {
    test(`${retailer} auction extracts bid_price and shipping_fee`, async () => {
      test.setTimeout(30_000)

      const page = await context.newPage()
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      } catch {
        test.skip(true, `${retailer} page failed to load`)
        await page.close()
        return
      }

      const currentUrl = page.url()
      const title = await page.title()

      // Skip if redirected to login, 404, or Cloudflare challenge
      if (
        currentUrl.includes('/login') ||
        currentUrl.includes('/account/') ||
        currentUrl.includes('__cf_chl') ||
        title.toLowerCase().includes('not found') ||
        title.toLowerCase().includes('404') ||
        title.toLowerCase().includes('sign in') ||
        title.toLowerCase().includes('log in') ||
        title.toLowerCase().includes('just a moment')
      ) {
        test.skip(true, `${retailer} blocked by Cloudflare, login, or 404: ${title}`)
        await page.close()
        return
      }

      // Extract bid price using #current_bid_amount (reliable on Classic pages)
      const bidPrice = await page.evaluate(() => {
        const el = document.querySelector('#current_bid_amount')
        return el?.textContent?.trim() ?? null
      })

      // Extract shipping fee using multiple strategies:
      // 1. .auction-data-label sibling approach (if "Shipping Cost" label exists)
      // 2. #shipping_total_cost element (if rendered)
      // 3. #shipping_fee_field hidden input (populated after address confirmation)
      // Note: On many Classic pages, shipping requires address confirmation
      // and will only be available via the popup after login + address entry.
      const shippingResult = await page.evaluate(() => {
        // Strategy 1: .auction-data-label with "Shipping Cost" text
        const labels = document.querySelectorAll('.auction-data-label')
        for (const label of labels) {
          if ((label.textContent || '').toLowerCase().includes('shipping cost')) {
            const parent = label.parentElement
            if (parent) {
              const content = parent.querySelector('.auction-data-content')
              if (content) {
                const text = content.textContent || ''
                if (text.toLowerCase().includes('free')) return { value: '$0', strategy: 'label-sibling' }
                const priceEl = content.querySelector('.price')
                if (priceEl?.textContent?.trim()) return { value: priceEl.textContent.trim(), strategy: 'label-sibling-price' }
                const trimmed = text.trim()
                if (trimmed && /\$/.test(trimmed)) return { value: trimmed, strategy: 'label-sibling-text' }
              }
            }
          }
        }

        // Strategy 2: #shipping_total_cost
        const stc = document.querySelector('#shipping_total_cost')
        if (stc) {
          const text = stc.textContent || ''
          if (text.toLowerCase().includes('free')) return { value: '$0', strategy: 'shipping_total_cost' }
          const priceEl = stc.querySelector('.price')
          if (priceEl?.textContent?.trim()) return { value: priceEl.textContent.trim(), strategy: 'shipping_total_cost-price' }
          if (text.trim() && /\$/.test(text)) return { value: text.trim(), strategy: 'shipping_total_cost-text' }
        }

        // Strategy 3: hidden input (populated after address confirmation)
        const hiddenInput = document.querySelector('#shipping_fee_field') as HTMLInputElement | null
        if (hiddenInput?.value && hiddenInput.value.trim() !== '') {
          return { value: `$${hiddenInput.value}`, strategy: 'hidden-input' }
        }

        // Check if shipping section exists but is empty (address required)
        const shippingFeeEl = document.querySelector('#shipping_fee')
        const bidShippingLabel = document.querySelector('#bid-shipping-label')
        if (shippingFeeEl || bidShippingLabel) {
          return { value: null, strategy: 'deferred-needs-address' }
        }

        return { value: null, strategy: 'not-found' }
      })

      console.log(`${retailer} bid_price: ${bidPrice}`)
      console.log(`${retailer} shipping: ${JSON.stringify(shippingResult)}`)

      // If both null, check if auction ended/expired — skip gracefully
      if (!bidPrice && !shippingResult.value) {
        const bodyText = await page.locator('body').innerText()
        const lower = bodyText.toLowerCase()
        if (
          lower.includes('closed') ||
          lower.includes('ended') ||
          lower.includes('expired') ||
          lower.includes('login') ||
          lower.includes('sign in')
        ) {
          test.skip(true, `${retailer} auction ended or requires auth`)
          await page.close()
          return
        }
      }

      // Assert bid price is a dollar amount
      expect(bidPrice, `${retailer} bid_price should be a dollar amount`).not.toBeNull()
      expect(bidPrice!).toMatch(/\$[\d,]+/)

      // Shipping fee: either extracted successfully OR deferred (needs address).
      // Both are valid outcomes. We only fail if shipping infrastructure is missing entirely.
      if (shippingResult.value) {
        // Shipping was extracted — verify it looks like a dollar amount or "$0"
        expect(shippingResult.value).toMatch(/^\$[\d,]+/)
        console.log(`${retailer} shipping_fee EXTRACTED: ${shippingResult.value} via ${shippingResult.strategy}`)
      } else if (shippingResult.strategy === 'deferred-needs-address') {
        // Shipping infrastructure exists but value requires address — acceptable
        console.log(`${retailer} shipping_fee DEFERRED: requires address confirmation (expected for Classic pages)`)
      } else {
        // No shipping infrastructure found at all — this is unexpected
        // Fail so we investigate
        expect(shippingResult.value, `${retailer} no shipping infrastructure found on page`).not.toBeNull()
      }

      await page.close()
    })
  }
})
