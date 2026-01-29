# Technology Stack: DOM Scraping & Metadata Extraction

**Project:** Manifest Parser Extension - v1.1 Metadata Fix
**Researched:** 2026-01-29
**Focus:** Reliable DOM scraping in Chrome extensions (MV3), selector resilience, E2E testing

## Problem Statement

9 of 11 retailers return 0 for bid_price and/or shipping_fee. The extension uses content scripts with CSS selectors and regex fallbacks, but these fail because:
1. Selectors target classes/IDs that do not exist on the actual pages
2. Dynamic content may not be loaded when the content script runs
3. No E2E verification against live sites exists

The project has two distinct extraction paths:
- **B-Stock Marketplace** (AMZ, TGT, RC, COSTCO, ATT): Next.js `__NEXT_DATA__` JSON extraction
- **B-Stock Auction** (ACE, BY, JCP, QVC): Traditional DOM selector scraping
- **TechLiquidators** (TL): Traditional DOM selector scraping (already working)
- **Amazon Direct** (AMZD): Amazon product page scraping

## Recommended Stack

### Content Script DOM Access Patterns

| Approach | Use When | Confidence |
|----------|----------|------------|
| `__NEXT_DATA__` JSON parsing | B-Stock marketplace pages (Next.js) | HIGH |
| `self.__next_f.push()` flight data | If B-Stock upgrades to Next.js 13+ RSC | MEDIUM |
| MutationObserver + selector chain | Non-Next.js pages with dynamic content | HIGH |
| `document_idle` + retry polling | Simple fallback for any page | HIGH |

**Recommendation: Use `__NEXT_DATA__` as primary for B-Stock marketplace retailers.** This is the single most important fix. B-Stock runs on Next.js and embeds all page data as structured JSON in a `<script id="__NEXT_DATA__">` tag. This is far more reliable than CSS selectors because:
- The data is always present (React needs it for hydration)
- It contains exact numeric values, not formatted text requiring regex
- It survives all CSS/layout redesigns
- It is already the stated approach in the codebase for AMZ, but likely the JSON field paths are wrong

For B-Stock Auction pages (ACE, BY, JCP, QVC) that use a different (non-Next.js) B-Stock layout, CSS selectors with MutationObserver are the right approach.

### Waiting for Dynamic Content

| Method | When to Use | Code Pattern |
|--------|-------------|-------------|
| `run_at: "document_idle"` | Default injection timing | Manifest config |
| MutationObserver | Wait for specific elements on SPA pages | See pattern below |
| Polling with timeout | Simple retry for known-slow elements | See pattern below |
| `chrome.scripting.executeScript` | Programmatic injection after navigation | Background script |

**Recommendation: Use `document_idle` (already default) plus a MutationObserver wrapper with timeout for non-Next.js pages.**

```typescript
// Pattern: Wait for element with timeout
function waitForElement(selector: string, timeoutMs = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null); // Timeout - element never appeared
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

**Confidence:** HIGH -- MutationObserver is the standard pattern documented by Chrome and MDN for observing dynamic DOM changes.

### Selector Resilience Strategies

| Strategy | Priority | Description |
|----------|----------|-------------|
| Structured data first | 1 (highest) | `__NEXT_DATA__`, JSON-LD, microdata |
| `data-testid` / `data-*` attributes | 2 | Semantic attributes, stable across redesigns |
| ID selectors | 3 | Usually stable, but site-specific |
| Fallback selector chains | 4 | Array of selectors tried in order |
| Text/regex patterns | 5 (last resort) | Search page text for "Current Bid: $X" patterns |
| External selector config | Support | Store selectors in JSON, update without code deploy |

**Recommendation: Implement a tiered extraction strategy.**

1. **For B-Stock Marketplace:** Parse `__NEXT_DATA__` JSON. Walk the data structure looking for bid/price fields. This should fix TGT, RC, COSTCO, AMZ, ATT immediately.

2. **For B-Stock Auction pages:** Use a fallback chain of CSS selectors. The current selectors are likely wrong -- they need to be verified against live page HTML using DevTools. Store selectors in a config object so they can be updated without changing extraction logic.

3. **For all extractors:** Add diagnostic logging that reports what was found/not found, so failures are immediately diagnosable.

**Confidence:** HIGH for structured data approach. MEDIUM for selector chains (depends on actual site HTML which must be manually verified).

### Externalizing Selectors

**Recommendation: Store selectors as typed config objects, not inline strings.**

```typescript
// Pattern: Selector config per retailer
interface SelectorConfig {
  bidPrice: {
    jsonPaths?: string[];      // For __NEXT_DATA__ extraction
    selectors?: string[];      // CSS selector fallback chain
    textPatterns?: RegExp[];   // Regex fallback
  };
  shippingFee: {
    jsonPaths?: string[];
    selectors?: string[];
    textPatterns?: RegExp[];
  };
}

const BSTOCK_MARKETPLACE_SELECTORS: SelectorConfig = {
  bidPrice: {
    jsonPaths: ['currentBid', 'winningBid', 'highBid', 'lot.currentBid'],
    selectors: ['[data-testid*="bid"]', '[class*="bid-amount"]'],
    textPatterns: [/Current\s*Bid[:\s]*\$?([\d,]+(?:\.\d{2})?)/i],
  },
  // ...
};
```

This pattern decouples selector knowledge from extraction logic, making updates cheaper when sites change.

**Confidence:** HIGH -- this is a well-established scraping best practice confirmed by multiple sources.

### E2E Testing Chrome Extensions Against Live Sites

| Tool | Purpose | Limitation |
|------|---------|------------|
| **Playwright** | E2E test runner, Chrome automation | Must run headed for extensions |
| **Playwright + persistent context** | Load unpacked extension, test full flow | Extension ID is dynamic |
| **Manual DevTools verification** | Quick selector validation | Not automated, not repeatable |
| **Snapshot testing** | Save page HTML, test selectors offline | Stale if site changes |

**Recommendation: Use Playwright with a persistent browser context for E2E testing.**

Setup approach:
1. Build the extension (`npm run build`)
2. Launch Chromium with `--load-extension=path/to/dist` via Playwright persistent context
3. Navigate to live auction URLs
4. Verify metadata extraction returns non-zero values
5. Use service worker to retrieve dynamic extension ID

```typescript
// Playwright fixture pattern for Chrome extension testing
import { test as base, chromium } from '@playwright/test';

const test = base.extend({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Required for extensions
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
});
```

**Key constraints:**
- Must run headed (headless Chromium does not support extensions)
- Chromium only (Firefox/WebKit cannot load Chrome extensions)
- Extension ID changes per load; retrieve dynamically from service workers
- Live URL tests are inherently flaky (site changes, auctions expire)

**Confidence:** HIGH -- Playwright persistent context with `--load-extension` is the documented, standard approach. Multiple sources confirm this pattern including Chrome developer docs and Playwright community.

### Hybrid Testing Strategy

Since live URL tests are inherently brittle, use a two-layer approach:

| Layer | What | How | Runs When |
|-------|------|-----|-----------|
| **Unit tests** | Selector logic against saved HTML snapshots | Vitest (existing) | Every commit |
| **E2E smoke tests** | Full extension against live URLs | Playwright (headed) | Manual / CI cron |

1. **Snapshot tests (reliable, fast):** Save the HTML of known auction pages. Run selector extraction against these snapshots in Vitest. This verifies your extraction logic works against known HTML.

2. **Live E2E tests (slow, may flake):** Use Playwright to load the real extension on real auction pages. Assert that bid_price and shipping_fee are non-zero. Run manually or on a weekly cron. When these fail, update the snapshots and selectors.

**Confidence:** HIGH for the hybrid approach. This is standard practice for scraping projects.

## Supporting Libraries

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Playwright | latest | E2E extension testing | NEW - add as devDependency |
| @playwright/test | latest | Test runner for E2E | NEW - add as devDependency |
| Vitest | 1.2.2 | Unit/snapshot testing | EXISTING |

No new runtime dependencies needed. The extraction improvements are pure TypeScript logic changes to existing content scripts.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| E2E testing | Playwright | Puppeteer | Playwright has better extension support, typed API, built-in assertions |
| E2E testing | Playwright | Cypress | Cypress cannot load Chrome extensions |
| Selector strategy | Tiered (JSON > selector > regex) | Single selector per field | Too brittle; sites change |
| Dynamic content | MutationObserver | setTimeout polling | MutationObserver is event-driven, more efficient and reliable |
| Selector storage | TypeScript config objects | External JSON file | Type safety matters; selectors change with code changes anyway |

## Installation

```bash
# New dev dependencies for E2E testing
npm install -D @playwright/test
npx playwright install chromium
```

No new production dependencies required.

## Key Insights for Roadmap

1. **The primary fix is likely wrong JSON field paths in `__NEXT_DATA__` extraction, not missing DOM elements.** Most broken retailers (TGT, RC, COSTCO, AMZ) use B-Stock Marketplace which is Next.js. The extraction code already tries `__NEXT_DATA__` but the field paths probably do not match the actual JSON structure. This is a data investigation task, not a code architecture task.

2. **B-Stock Auction retailers (ACE, BY, JCP, QVC) need live HTML inspection.** These use a different, non-Next.js B-Stock layout. Someone needs to open DevTools on live auction pages and find the actual selectors. No amount of guessing will fix this.

3. **AMZD is Amazon.com, a completely different site.** Amazon pages are heavily dynamic, use obfuscated class names, and vary by A/B test. The current approach of targeting `#delivery-message` and similar IDs is reasonable but needs live verification.

4. **Phase ordering should be:** (a) Verify actual HTML/JSON structure on live pages, (b) Fix extraction code to match reality, (c) Add E2E tests to catch future breakage.

5. **Playwright E2E is a worthwhile investment** but should not block the selector fixes. Fix selectors first by manual DevTools inspection, then add automated tests to prevent regression.

## Sources

- [Chrome Content Scripts Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) -- HIGH confidence, official docs
- [Chrome Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) -- HIGH confidence, official docs
- [MDN Content Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts) -- HIGH confidence, official docs
- [Playwright Chrome Extension E2E Testing (DEV Community)](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl) -- MEDIUM confidence, community pattern
- [BrowserStack Playwright Extension Testing Guide](https://www.browserstack.com/guide/playwright-chrome-extension) -- MEDIUM confidence, vendor docs
- [Scraping Next.js Sites in 2025 (Trickster Dev)](https://www.trickster.dev/post/scraping-nextjs-web-sites-in-2025/) -- MEDIUM confidence, community expertise
- [Next.js v13 Scraping (Hacker News)](https://news.ycombinator.com/item?id=37883999) -- LOW confidence, community discussion
- [CSS Selector Resilience Guide (Rebrowser)](https://rebrowser.net/blog/css-selector-cheat-sheet-for-web-scraping-a-complete-guide) -- MEDIUM confidence, industry guide
- [Building Scrapers That Survive Redesigns (HasData)](https://medium.com/@hasdata/how-to-build-an-e-commerce-scraper-that-survives-a-website-redesign-86216e96cbd9) -- LOW confidence, single blog post
