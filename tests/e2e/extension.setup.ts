import { chromium, type BrowserContext, type Page } from '@playwright/test'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_PATH = resolve(__dirname, '../../dist')

/**
 * Launch a persistent Chromium context with the built extension loaded.
 * Extensions require headed mode (headless: false).
 */
export async function launchBrowserWithExtension(): Promise<BrowserContext> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'pw-ext-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
    ],
  })
  return context
}

/**
 * Get the extension ID from the service worker registered by the extension.
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  let sw = context.serviceWorkers()[0]
  if (!sw) {
    sw = await context.waitForEvent('serviceworker')
  }
  const extensionId = sw.url().split('/')[2]
  return extensionId
}

/**
 * Open the extension popup in a new page.
 * Returns the popup Page object.
 */
export async function openPopup(
  context: BrowserContext,
  extensionId: string,
): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
  return page
}
