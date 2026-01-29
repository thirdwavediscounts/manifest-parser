import { test, expect, type BrowserContext } from '@playwright/test'
import { launchBrowserWithExtension, getExtensionId } from './extension.setup'

/**
 * B-Stock Next.js E2E tests
 *
 * Validates __NEXT_DATA__ extraction for all 5 Next.js retailers.
 * Uses the same JSON paths as src/retailers/config/nextjs-paths.ts:
 *   bid_price:    auction.winningBidAmount (dollars) | auction.startPrice (fallback)
 *   shipping_fee: selectedQuote.totalPrice (cents, auth-required)
 *
 * Listings expire — tests skip gracefully on 404/login/Cloudflare/expired.
 */

const NEXTJS_URLS: Record<string, string> = {
  AMZ: 'https://bstock.com/buy/listings/details/6971ef333172ac79a96f7778',
  ATT: 'https://bstock.com/buy/listings/details/696faee72b4f9c55a80526ad',
  COSTCO: 'https://bstock.com/buy/listings/details/6977cb5433214009ee0fa42',
  RC: 'https://bstock.com/buy/listings/details/696faee72b4f9c55a80526ad',
  TGT: 'https://bstock.com/buy/listings/details/6974162ed863dda233701e94',
}

/** Expected seller name substrings (case-insensitive) for each retailer */
const EXPECTED_SELLERS: Record<string, string> = {
  AMZ: 'amazon',
  ATT: 'at&t',
  COSTCO: 'costco',
  RC: 'royal closeout',
  TGT: 'target',
}

let context: BrowserContext

test.describe('B-Stock Next.js E2E', () => {
  test.beforeAll(async () => {
    context = await launchBrowserWithExtension()
    await getExtensionId(context)
  })

  test.afterAll(async () => {
    await context?.close()
  })

  for (const [retailer, url] of Object.entries(NEXTJS_URLS)) {
    test(`${retailer} listing extracts bid_price and shipping_fee from __NEXT_DATA__`, async () => {
      test.setTimeout(30_000)

      if (!url) {
        test.skip(true, `${retailer} has no test URL configured`)
        return
      }

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

      // Extract __NEXT_DATA__ using same JSON paths as nextjs-paths.ts config
      const result = await page.evaluate(() => {
        const nextDataEl = document.getElementById('__NEXT_DATA__')
        if (!nextDataEl) return { error: 'no __NEXT_DATA__ element found' }

        try {
          const nextData = JSON.parse(nextDataEl.textContent || '{}')
          const queries = nextData?.props?.pageProps?.dehydratedState?.queries || []
          const listingQuery = queries.find((q: any) =>
            JSON.stringify(q.queryKey).includes('listing')
          )
          if (!listingQuery?.state?.data) return { error: 'no listing data in dehydratedState queries' }

          const data = listingQuery.state.data as Record<string, any>

          // Extract seller name for retailer identification
          const seller = data.seller
          const sellerName = seller?.storefront?.name || seller?.account?.displayName || 'unknown'

          // Extract bid price: auction.winningBidAmount (dollars)
          // Fallback: auction.startPrice (dollars) — opening bid if no bids yet
          const auction = data.auction
          let bidPrice: number | null = null
          if (auction && typeof auction.winningBidAmount === 'number' && auction.winningBidAmount > 0) {
            bidPrice = auction.winningBidAmount
          } else if (auction && typeof auction.startPrice === 'number' && auction.startPrice > 0) {
            bidPrice = auction.startPrice
          }

          // Extract shipping fee: selectedQuote.totalPrice (CENTS)
          // Auth-required — unauthenticated pages may not have this field
          let shippingFee: number | null = null
          const selectedQuote = data.selectedQuote
          if (selectedQuote && typeof selectedQuote.totalPrice === 'number') {
            shippingFee = Math.round(selectedQuote.totalPrice) / 100 // cents to dollars
          }

          return { sellerName, bidPrice, shippingFee, hasNextData: true }
        } catch (e) {
          return { error: `parse error: ${e}` }
        }
      })

      console.log(`${retailer} __NEXT_DATA__ result: ${JSON.stringify(result)}`)

      // If extraction hit an error, check for expired/auth pages
      if ('error' in result) {
        const bodyText = await page.locator('body').innerText()
        const lower = bodyText.toLowerCase()
        if (
          lower.includes('unexpected error') ||
          lower.includes('closed') ||
          lower.includes('ended') ||
          lower.includes('expired') ||
          lower.includes('login') ||
          lower.includes('sign in') ||
          lower.includes('not found')
        ) {
          test.skip(true, `${retailer} listing expired or requires auth: ${result.error}`)
          await page.close()
          return
        }
        // Genuine extraction failure
        expect.soft(false, `${retailer} extraction error: ${result.error}`).toBeTruthy()
        await page.close()
        return
      }

      // Verify seller name matches expected retailer
      const expectedSeller = EXPECTED_SELLERS[retailer]
      if (expectedSeller && result.sellerName !== 'unknown') {
        console.log(`${retailer} seller: "${result.sellerName}" (expected substring: "${expectedSeller}")`)
        expect(
          result.sellerName.toLowerCase().includes(expectedSeller),
          `${retailer} seller "${result.sellerName}" should contain "${expectedSeller}"`
        ).toBeTruthy()
      }

      // Assert bid_price is a positive number
      if (result.bidPrice === null) {
        // Auction may have ended with no bids — skip gracefully
        const bodyText = await page.locator('body').innerText()
        const lower = bodyText.toLowerCase()
        if (lower.includes('closed') || lower.includes('ended') || lower.includes('expired')) {
          test.skip(true, `${retailer} auction ended — no bid price available`)
          await page.close()
          return
        }
      }
      expect(result.bidPrice, `${retailer} bid_price should be a positive number`).not.toBeNull()
      expect(result.bidPrice).toBeGreaterThan(0)
      console.log(`${retailer} bid_price: $${result.bidPrice}`)

      // Assert shipping_fee: null is acceptable (auth-required), but if present must be >= 0
      if (result.shippingFee !== null) {
        expect(result.shippingFee, `${retailer} shipping_fee should be non-negative`).toBeGreaterThanOrEqual(0)
        console.log(`${retailer} shipping_fee: $${result.shippingFee}`)
      } else {
        console.log(`${retailer} shipping_fee: null (expected — auth-required for shipping quotes)`)
      }

      await page.close()
    })
  }
})
