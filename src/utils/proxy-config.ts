/**
 * Proxy Configuration Utility
 *
 * Manages HTTP proxy settings for specific sites (e.g., TechLiquidators)
 */

export interface ProxySettings {
  enabled: boolean
  host: string
  port: number
  username?: string
  password?: string
  // Sites that require proxy
  sites: string[]
}

const DEFAULT_PROXY_SETTINGS: ProxySettings = {
  enabled: false,
  host: '',
  port: 8080,
  sites: ['techliquidators.com'],
}

const STORAGE_KEY = 'proxySettings'

/**
 * Get current proxy settings from storage
 */
export async function getProxySettings(): Promise<ProxySettings> {
  const result = await chrome.storage.local.get([STORAGE_KEY])
  return result[STORAGE_KEY] || DEFAULT_PROXY_SETTINGS
}

/**
 * Save proxy settings to storage
 */
export async function saveProxySettings(settings: ProxySettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })

  // Apply or clear proxy based on enabled state
  if (settings.enabled && settings.host) {
    await applyProxy(settings)
  } else {
    await clearProxy()
  }
}

/**
 * Apply proxy configuration to Chrome
 */
export async function applyProxy(settings: ProxySettings): Promise<void> {
  if (!settings.enabled || !settings.host) {
    await clearProxy()
    return
  }

  const config: chrome.proxy.ProxyConfig = {
    mode: 'pac_script',
    pacScript: {
      data: generatePacScript(settings),
    },
  }

  try {
    await chrome.proxy.settings.set({ value: config, scope: 'regular' })
    console.log('[Proxy] Applied proxy settings for:', settings.sites)
  } catch (error) {
    console.error('[Proxy] Failed to apply proxy:', error)
    throw error
  }
}

/**
 * Generate PAC script for selective proxying
 */
function generatePacScript(settings: ProxySettings): string {
  const proxyServer = `PROXY ${settings.host}:${settings.port}`
  const sitePatterns = settings.sites.map((site) => `shExpMatch(host, "*.${site}")`).join(' || ')

  return `
    function FindProxyForURL(url, host) {
      if (${sitePatterns || 'false'}) {
        return "${proxyServer}";
      }
      return "DIRECT";
    }
  `
}

/**
 * Clear proxy configuration
 */
export async function clearProxy(): Promise<void> {
  try {
    await chrome.proxy.settings.clear({ scope: 'regular' })
    console.log('[Proxy] Cleared proxy settings')
  } catch (error) {
    console.error('[Proxy] Failed to clear proxy:', error)
  }
}

/**
 * Check if a URL requires proxy
 */
export function requiresProxy(url: string, settings: ProxySettings): boolean {
  if (!settings.enabled) return false

  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return settings.sites.some(
      (site) => hostname === site || hostname.endsWith('.' + site)
    )
  } catch {
    return false
  }
}

/**
 * Initialize proxy on extension load
 */
export async function initializeProxy(): Promise<void> {
  const settings = await getProxySettings()
  if (settings.enabled && settings.host) {
    await applyProxy(settings)
  }

  // Set up auth handler for proxy authentication
  setupProxyAuthHandler()
}

/**
 * Set up handler for proxy authentication requests
 */
function setupProxyAuthHandler(): void {
  // Remove existing listener if any
  if (chrome.webRequest.onAuthRequired.hasListener(handleProxyAuth)) {
    chrome.webRequest.onAuthRequired.removeListener(handleProxyAuth)
  }

  // Add auth handler
  chrome.webRequest.onAuthRequired.addListener(
    handleProxyAuth,
    { urls: ['<all_urls>'] },
    ['asyncBlocking']
  )
}

/**
 * Handle proxy authentication requests
 */
async function handleProxyAuth(
  details: chrome.webRequest.WebAuthenticationChallengeDetails
): Promise<chrome.webRequest.BlockingResponse> {
  // Only handle proxy auth, not server auth
  if (!details.isProxy) {
    return {}
  }

  try {
    const settings = await getProxySettings()

    if (settings.username && settings.password) {
      console.log('[Proxy] Providing auth credentials for proxy')
      return {
        authCredentials: {
          username: settings.username,
          password: settings.password,
        },
      }
    }
  } catch (error) {
    console.error('[Proxy] Error getting auth credentials:', error)
  }

  return {}
}
