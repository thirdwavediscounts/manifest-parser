import type { ExtensionMessage, ManifestItem } from '../parsers/types'
import {
  retailerRegistry,
  formatRetailerDisplay,
  detectRetailerFromUrl,
  needsTabProcessing,
} from '../retailers'
import {
  extractSpreadsheetId,
  fetchUrlsFromSheet,
  getAuthToken,
  isAuthenticated,
  signOut,
} from '../services/google-sheets'
import {
  createZipFromUnifiedManifests,
  downloadZip,
  generateZipFilename,
  type UnifiedZipEntry,
} from '../utils/zip-export'
import {
  getProxySettings,
  saveProxySettings,
  type ProxySettings,
} from '../utils/proxy-config'
import { transformToUnified, generateUnifiedCsv } from '../unified'
import type { AuctionMetadata } from '../unified'

interface UrlItem {
  url: string
  retailer: string
  selected: boolean
}

interface PopupState {
  isSignedIn: boolean
  sheetUrl: string
  urls: UrlItem[]
  uploadedFiles: File[]
  isProcessing: boolean
  isCancelled: boolean
  lastZipBlob: Blob | null
  results: {
    files: number
    items: number
    retailValue: number
  }
  // Processing progress state
  processingProgress: {
    current: number
    total: number
    currentUrl: string
  } | null
}

const state: PopupState = {
  isSignedIn: false,
  sheetUrl: '',
  urls: [],
  uploadedFiles: [],
  isProcessing: false,
  isCancelled: false,
  lastZipBlob: null,
  results: { files: 0, items: 0, retailValue: 0 },
  processingProgress: null,
}

/**
 * Save state to chrome.storage for persistence across popup close/open
 */
async function saveState(): Promise<void> {
  // Don't save File objects or Blob - they can't be serialized
  const persistableState = {
    sheetUrl: state.sheetUrl,
    urls: state.urls,
    results: state.results,
    isProcessing: state.isProcessing,
    processingProgress: state.processingProgress,
  }
  await chrome.storage.local.set({ popupState: persistableState })
}

/**
 * Load state from chrome.storage
 */
async function loadState(): Promise<void> {
  const result = await chrome.storage.local.get(['popupState'])
  if (result.popupState) {
    const saved = result.popupState
    state.sheetUrl = saved.sheetUrl || ''
    state.urls = saved.urls || []
    state.results = saved.results || { files: 0, items: 0, retailValue: 0 }
    state.isProcessing = saved.isProcessing || false
    state.processingProgress = saved.processingProgress || null
  }
}

// DOM Elements
const elements = {
  // Auth
  signedOut: document.getElementById('signed-out') as HTMLDivElement,
  signedIn: document.getElementById('signed-in') as HTMLDivElement,
  signInBtn: document.getElementById('sign-in-btn') as HTMLButtonElement,
  signOutBtn: document.getElementById('sign-out-btn') as HTMLButtonElement,

  // Sheet input
  sheetUrl: document.getElementById('sheet-url') as HTMLInputElement,
  loadSheetBtn: document.getElementById('load-sheet-btn') as HTMLButtonElement,

  // URL list
  urlListSection: document.getElementById('url-list-section') as HTMLElement,
  urlList: document.getElementById('url-list') as HTMLUListElement,
  urlCount: document.getElementById('url-count') as HTMLSpanElement,
  selectAll: document.getElementById('select-all') as HTMLInputElement,

  // Manual upload
  manualSection: document.getElementById('manual-section') as HTMLElement,
  toggleManual: document.getElementById('toggle-manual') as HTMLButtonElement,
  dropZone: document.getElementById('drop-zone') as HTMLDivElement,
  fileInput: document.getElementById('file-input') as HTMLInputElement,
  uploadBtn: document.getElementById('upload-btn') as HTMLButtonElement,

  // Actions
  processBtn: document.getElementById('process-btn') as HTMLButtonElement,

  // Progress
  progressSection: document.getElementById('progress-section') as HTMLElement,
  progressBar: document.getElementById('progress-bar') as HTMLDivElement,
  progressLabel: document.getElementById('progress-label') as HTMLSpanElement,
  progressPercent: document.getElementById('progress-percent') as HTMLSpanElement,
  progressDetail: document.getElementById('progress-detail') as HTMLParagraphElement,
  cancelBtn: document.getElementById('cancel-btn') as HTMLButtonElement,

  // Results
  resultsSection: document.getElementById('results-section') as HTMLElement,
  resultFiles: document.getElementById('result-files') as HTMLSpanElement,
  resultItems: document.getElementById('result-items') as HTMLSpanElement,
  resultValue: document.getElementById('result-value') as HTMLSpanElement,
  downloadAgainBtn: document.getElementById('download-again-btn') as HTMLButtonElement,
  resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,

  // Proxy settings
  proxySection: document.getElementById('proxy-section') as HTMLElement,
  toggleProxy: document.getElementById('toggle-proxy') as HTMLButtonElement,
  proxyEnabled: document.getElementById('proxy-enabled') as HTMLInputElement,
  proxyHost: document.getElementById('proxy-host') as HTMLInputElement,
  proxyPort: document.getElementById('proxy-port') as HTMLInputElement,
  proxyUsername: document.getElementById('proxy-username') as HTMLInputElement,
  proxyPassword: document.getElementById('proxy-password') as HTMLInputElement,
  saveProxyBtn: document.getElementById('save-proxy-btn') as HTMLButtonElement,
  proxyStatus: document.getElementById('proxy-status') as HTMLParagraphElement,
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  setupEventListeners()
  await loadState()
  await checkAuthState()
  await loadProxySettings()

  // Restore UI from loaded state
  if (state.sheetUrl) {
    elements.sheetUrl.value = state.sheetUrl
  }
  if (state.urls.length > 0) {
    updateUrlListUI()
  }
  if (state.results.files > 0) {
    showResults()
  }
  if (state.isProcessing && state.processingProgress) {
    showProgress()
    updateProgress(
      (state.processingProgress.current / state.processingProgress.total) * 100,
      `Processing ${state.processingProgress.currentUrl}...`
    )
  }
  updateProcessButton()
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Auth
  elements.signInBtn.addEventListener('click', handleSignIn)
  elements.signOutBtn.addEventListener('click', handleSignOut)

  // Sheet input
  elements.sheetUrl.addEventListener('input', handleSheetUrlChange)
  elements.loadSheetBtn.addEventListener('click', handleLoadSheet)

  // URL list
  elements.selectAll.addEventListener('change', handleSelectAll)

  // Manual upload toggle
  elements.toggleManual.addEventListener('click', () => {
    elements.manualSection.classList.toggle('collapsed')
    const content = elements.manualSection.querySelector('.section-content')
    content?.classList.toggle('hidden')
  })

  // File upload
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click())
  elements.fileInput.addEventListener('change', handleFileSelect)

  // Drag and drop
  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    elements.dropZone.classList.add('drag-over')
  })
  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('drag-over')
  })
  elements.dropZone.addEventListener('drop', handleFileDrop)

  // Process
  elements.processBtn.addEventListener('click', handleProcess)
  elements.cancelBtn.addEventListener('click', handleCancel)

  // Results
  elements.downloadAgainBtn.addEventListener('click', handleDownloadAgain)
  elements.resetBtn.addEventListener('click', handleReset)

  // Proxy settings toggle
  elements.toggleProxy.addEventListener('click', () => {
    elements.proxySection.classList.toggle('collapsed')
    const content = elements.proxySection.querySelector('.section-content')
    content?.classList.toggle('hidden')
  })

  // Proxy save button
  elements.saveProxyBtn.addEventListener('click', handleSaveProxy)
}

/**
 * Check authentication state
 */
async function checkAuthState(): Promise<void> {
  try {
    state.isSignedIn = await isAuthenticated()
  } catch {
    state.isSignedIn = false
  }
  updateAuthUI()
}

/**
 * Update auth UI based on state
 */
function updateAuthUI(): void {
  elements.signedOut.classList.toggle('hidden', state.isSignedIn)
  elements.signedIn.classList.toggle('hidden', !state.isSignedIn)
  elements.loadSheetBtn.disabled = !state.isSignedIn || !isValidSheetUrl(state.sheetUrl)
}

/**
 * Handle sign in
 */
async function handleSignIn(): Promise<void> {
  try {
    await getAuthToken(true)
    state.isSignedIn = true
    updateAuthUI()
  } catch (error) {
    alert(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle sign out
 */
async function handleSignOut(): Promise<void> {
  await signOut()
  state.isSignedIn = false
  state.urls = []
  updateAuthUI()
  updateUrlListUI()
  updateProcessButton()
}

/**
 * Load proxy settings and update UI
 */
async function loadProxySettings(): Promise<void> {
  try {
    const settings = await getProxySettings()
    elements.proxyEnabled.checked = settings.enabled
    elements.proxyHost.value = settings.host
    elements.proxyPort.value = settings.port.toString()
    elements.proxyUsername.value = settings.username || ''
    elements.proxyPassword.value = settings.password || ''

    if (settings.enabled && settings.host) {
      const authInfo = settings.username ? ' (with auth)' : ''
      elements.proxyStatus.textContent = `Proxy active: ${settings.host}:${settings.port}${authInfo}`
      elements.proxyStatus.className = 'help-text success'
    } else {
      elements.proxyStatus.textContent = ''
    }
  } catch (error) {
    console.error('[ManifestParser] Failed to load proxy settings:', error)
  }
}

/**
 * Handle save proxy settings
 */
async function handleSaveProxy(): Promise<void> {
  const username = elements.proxyUsername.value.trim()
  const password = elements.proxyPassword.value

  const settings: ProxySettings = {
    enabled: elements.proxyEnabled.checked,
    host: elements.proxyHost.value.trim(),
    port: parseInt(elements.proxyPort.value, 10) || 8080,
    username: username || undefined,
    password: password || undefined,
    sites: ['techliquidators.com'],
  }

  try {
    await saveProxySettings(settings)

    if (settings.enabled && settings.host) {
      const authInfo = settings.username ? ' (with auth)' : ''
      elements.proxyStatus.textContent = `Proxy saved: ${settings.host}:${settings.port}${authInfo}`
      elements.proxyStatus.className = 'help-text success'
    } else {
      elements.proxyStatus.textContent = 'Proxy disabled'
      elements.proxyStatus.className = 'help-text'
    }
  } catch (error) {
    elements.proxyStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Failed to save'}`
    elements.proxyStatus.className = 'help-text error'
  }
}

/**
 * Handle sheet URL input change
 */
function handleSheetUrlChange(): void {
  state.sheetUrl = elements.sheetUrl.value.trim()
  elements.loadSheetBtn.disabled = !state.isSignedIn || !isValidSheetUrl(state.sheetUrl)
}

/**
 * Check if URL is a valid Google Sheets URL
 */
function isValidSheetUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets') && !!extractSpreadsheetId(url)
}

// loadSavedSheetUrl is now handled by loadState()

/**
 * Handle load sheet button click
 */
async function handleLoadSheet(): Promise<void> {
  const spreadsheetId = extractSpreadsheetId(state.sheetUrl)
  if (!spreadsheetId) {
    alert('Invalid Google Sheets URL')
    return
  }

  elements.loadSheetBtn.disabled = true
  elements.loadSheetBtn.textContent = 'Loading...'

  try {
    const { urls } = await fetchUrlsFromSheet(spreadsheetId)

    // Initial detection from URL (instant for auction URLs)
    // Marketplace URLs show "B-Stock" until processed in tabs
    state.urls = urls.map((url) => ({
      url,
      retailer: detectRetailerFromUrl(url),
      selected: true,
    }))

    // Save state (includes sheet URL and URLs)
    await saveState()

    // Show list with initial detection
    // Marketplace URLs will show "B-Stock" - actual retailer detected during processing
    updateUrlListUI()
    updateProcessButton()
  } catch (error) {
    alert(`Failed to load sheet: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    elements.loadSheetBtn.disabled = false
    elements.loadSheetBtn.textContent = 'Load'
  }
}

/**
 * Update URL list UI
 */
function updateUrlListUI(): void {
  if (state.urls.length === 0) {
    elements.urlListSection.classList.add('hidden')
    return
  }

  elements.urlListSection.classList.remove('hidden')
  elements.urlCount.textContent = state.urls.length.toString()

  elements.urlList.innerHTML = state.urls
    .map(
      (item, index) => `
      <li>
        <input type="checkbox" data-index="${index}" ${item.selected ? 'checked' : ''}>
        <span class="url-text" title="${item.url}">${getDisplayUrl(item.url)}</span>
        <span class="retailer-badge">${formatRetailerDisplay(item.retailer)}</span>
      </li>
    `
    )
    .join('')

  // Add checkbox listeners
  elements.urlList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      const index = parseInt(target.dataset.index || '0', 10)
      state.urls = state.urls.map((item, i) =>
        i === index ? { ...item, selected: target.checked } : item
      )
      updateSelectAllState()
      updateProcessButton()
    })
  })

  updateSelectAllState()
}

/**
 * Get display-friendly URL
 */
function getDisplayUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname.split('/').pop() || urlObj.hostname
    return path.length > 40 ? path.substring(0, 37) + '...' : path
  } catch {
    return url.substring(0, 40)
  }
}

// formatRetailerDisplay is now imported from '../retailers'

/**
 * Update select all checkbox state
 */
function updateSelectAllState(): void {
  const allSelected = state.urls.every((u) => u.selected)
  const someSelected = state.urls.some((u) => u.selected)

  elements.selectAll.checked = allSelected
  elements.selectAll.indeterminate = someSelected && !allSelected
}

/**
 * Handle select all change
 */
function handleSelectAll(): void {
  const checked = elements.selectAll.checked
  state.urls = state.urls.map((u) => ({ ...u, selected: checked }))
  updateUrlListUI()
  updateProcessButton()
}

/**
 * Handle file selection
 */
function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files) {
    state.uploadedFiles = Array.from(input.files)
    updateProcessButton()
  }
}

/**
 * Handle file drop
 */
function handleFileDrop(event: DragEvent): void {
  event.preventDefault()
  elements.dropZone.classList.remove('drag-over')

  if (event.dataTransfer?.files) {
    const validFiles = Array.from(event.dataTransfer.files).filter((f) =>
      /\.(csv|xlsx|xls)$/i.test(f.name)
    )
    state.uploadedFiles = validFiles
    updateProcessButton()
  }
}

/**
 * Update process button state
 */
function updateProcessButton(): void {
  const hasSelectedUrls = state.urls.some((u) => u.selected)
  const hasUploadedFiles = state.uploadedFiles.length > 0
  elements.processBtn.disabled = state.isProcessing || (!hasSelectedUrls && !hasUploadedFiles)
}

/**
 * Handle process button click
 * Downloads manifests, transforms to unified format, and creates ZIP
 */
async function handleProcess(): Promise<void> {
  state.isProcessing = true
  state.isCancelled = false
  updateProcessButton()
  showProgress()

  // Unified entries for processed manifests (transformed to unified CSV format)
  const unifiedEntries: UnifiedZipEntry[] = []
  // Track totals for display
  let totalItems = 0
  let totalRetailValue = 0

  const selectedUrls = state.urls.filter((u) => u.selected)
  const totalToProcess = selectedUrls.length + state.uploadedFiles.length

  let processed = 0

  try {
    // Process URLs from sheet - download, parse, and transform to unified format
    for (const urlItem of selectedUrls) {
      // Check for cancellation
      if (state.isCancelled) {
        console.log('[ManifestParser] Processing cancelled by user')
        break
      }
      // Save progress state for persistence
      state.processingProgress = {
        current: processed,
        total: totalToProcess,
        currentUrl: getDisplayUrl(urlItem.url),
      }
      await saveState()

      updateProgress(
        (processed / totalToProcess) * 100,
        `Processing ${getDisplayUrl(urlItem.url)}...`
      )

      try {
        let retailer = urlItem.retailer

        // Use tab-based processing for pages that need manifest extraction
        if (needsTabProcessing(urlItem.url)) {
          const result = await processUrlInTab(urlItem.url)
          retailer = result.retailer
          const filename = generateListingFilename(retailer, result.listingName, result.auctionEndTime)

          // Update retailer in state for display
          state.urls = state.urls.map((item) =>
            item.url === urlItem.url ? { ...item, retailer } : item
          )
          updateUrlListUI()

          // Transform to unified format
          if (result.manifestData && result.manifestType) {
            try {
              // Parse raw base64 data via background worker to get ManifestItem[]
              const items = await parseManifestFromBase64(
                result.manifestData,
                filename,
                result.manifestType
              )

              if (items.length > 0) {
                // Create auction metadata (bid_price and shipping_fee populated in Phase 5)
                const metadata: AuctionMetadata = {
                  auctionUrl: urlItem.url,
                  bidPrice: null,
                  shippingFee: null,
                }

                // Transform to unified format and generate CSV
                const unifiedRows = transformToUnified(items, metadata)
                const csvContent = generateUnifiedCsv(unifiedRows, metadata)

                unifiedEntries.push({
                  filename: filename.replace(/\.(xlsx|xls)$/, '.csv'),
                  csvContent,
                  retailer,
                  sourceUrl: urlItem.url,
                })

                // Track totals
                totalItems += items.length
                totalRetailValue += items.reduce((sum, i) => sum + i.unitRetail * i.quantity, 0)

                console.log(`[ManifestParser] Added unified entry: ${filename}, ${items.length} items`)
              } else {
                console.log(`[ManifestParser] No items parsed from ${urlItem.url}`)
              }
            } catch (parseError) {
              console.error(`[ManifestParser] Failed to parse manifest from ${urlItem.url}:`, parseError)
            }
          } else {
            console.log(`[ManifestParser] No manifest data for ${urlItem.url}`)
          }
        } else {
          // Direct file URL - download and transform
          console.log(`[ManifestParser] Direct download: ${urlItem.url}`)
          const rawData = await downloadRawFile(urlItem.url)
          if (rawData.data) {
            try {
              const filename = generateFilename(urlItem.url, retailer)
              const items = await parseManifestFromBase64(rawData.data, filename, rawData.type)

              if (items.length > 0) {
                const metadata: AuctionMetadata = {
                  auctionUrl: urlItem.url,
                  bidPrice: null,
                  shippingFee: null,
                }

                const unifiedRows = transformToUnified(items, metadata)
                const csvContent = generateUnifiedCsv(unifiedRows, metadata)

                unifiedEntries.push({
                  filename: filename.replace(/\.(xlsx|xls)$/, '.csv'),
                  csvContent,
                  retailer,
                  sourceUrl: urlItem.url,
                })

                totalItems += items.length
                totalRetailValue += items.reduce((sum, i) => sum + i.unitRetail * i.quantity, 0)
              }
            } catch (parseError) {
              console.error(`[ManifestParser] Failed to parse ${urlItem.url}:`, parseError)
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process ${urlItem.url}:`, error)
      }

      processed++
    }

    // Process uploaded files - parse and transform to unified format
    for (const file of state.uploadedFiles) {
      // Check for cancellation
      if (state.isCancelled) {
        console.log('[ManifestParser] Processing cancelled by user')
        break
      }

      updateProgress((processed / totalToProcess) * 100, `Parsing ${file.name}...`)

      try {
        const items = await parseLocalFile(file)
        if (items.length > 0) {
          // Create metadata for local upload (no auction URL for local files)
          const metadata: AuctionMetadata = {
            auctionUrl: 'local-upload',
            bidPrice: null,
            shippingFee: null,
          }

          const unifiedRows = transformToUnified(items, metadata)
          const csvContent = generateUnifiedCsv(unifiedRows, metadata)

          unifiedEntries.push({
            filename: file.name.replace(/\.(xlsx|xls)$/, '.csv'),
            csvContent,
            retailer: 'manual',
            sourceUrl: 'local-upload',
          })

          totalItems += items.length
          totalRetailValue += items.reduce((sum, i) => sum + i.unitRetail * i.quantity, 0)
        }
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error)
      }

      processed++
    }

    // Check if cancelled before creating ZIP
    if (state.isCancelled) {
      updateProgress(0, 'Cancelled')
      hideProgress()
      return
    }

    updateProgress(95, 'Creating ZIP file...')

    if (unifiedEntries.length === 0) {
      alert('No valid manifest data found')
      hideProgress()
      return
    }

    // Create ZIP from unified entries
    const zipBlob = await createZipFromUnifiedManifests(unifiedEntries)

    state.lastZipBlob = zipBlob

    // Store totals for results display
    state.results.files = unifiedEntries.length
    state.results.items = totalItems
    state.results.retailValue = totalRetailValue

    updateProgress(100, 'Complete!')

    // Download ZIP
    downloadZip(zipBlob, generateZipFilename(unifiedEntries.length))

    // Clear processing state and save results
    state.processingProgress = null
    await saveState()

    // Show results
    setTimeout(() => {
      hideProgress()
      showResults()
    }, 500)
  } catch (error) {
    alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    hideProgress()
  } finally {
    state.isProcessing = false
    state.processingProgress = null
    await saveState()
    updateProcessButton()
  }
}

/**
 * Handle cancel button click
 */
function handleCancel(): void {
  state.isCancelled = true
  state.isProcessing = false
  state.processingProgress = null
  updateProgress(0, 'Cancelling...')
  console.log('[ManifestParser] Cancel requested')

  // Hide progress after a brief delay
  setTimeout(() => {
    hideProgress()
    updateProcessButton()
  }, 500)
}

/**
 * Download a file as raw base64 data without parsing
 */
async function downloadRawFile(url: string): Promise<{ data: string | null; type: 'csv' | 'xlsx' | 'xls' }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const base64 = await blobToBase64(blob)
    const type = getFileType(url)
    return { data: base64, type }
  } catch (error) {
    console.error(`[ManifestParser] Failed to download ${url}:`, error)
    return { data: null, type: 'csv' }
  }
}

/**
 * Convert blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Parse a local file
 */
async function parseLocalFile(file: File): Promise<ManifestItem[]> {
  const base64 = await fileToBase64(file)

  const response = await chrome.runtime.sendMessage<ExtensionMessage, ExtensionMessage<ManifestItem[]>>({
    type: 'PARSE_FILE',
    payload: {
      data: base64,
      filename: file.name,
      type: getFileType(file.name),
    },
  })

  if (response?.error) {
    throw new Error(response.error)
  }

  return response?.payload || []
}

/**
 * Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Parse raw base64 manifest data via background worker
 * Sends PARSE_FILE message and receives ManifestItem[]
 */
async function parseManifestFromBase64(
  data: string,
  filename: string,
  fileType: 'csv' | 'xlsx' | 'xls'
): Promise<ManifestItem[]> {
  const response = await chrome.runtime.sendMessage<ExtensionMessage, ExtensionMessage<ManifestItem[]>>({
    type: 'PARSE_FILE',
    payload: { data, filename, type: fileType },
  })
  if (response?.error) {
    throw new Error(response.error)
  }
  return response?.payload || []
}

/**
 * Generate filename from URL and retailer
 */
function generateFilename(url: string, retailer: string): string {
  try {
    const urlObj = new URL(url)
    const pathPart = urlObj.pathname.split('/').pop()
    if (pathPart && /\.(csv|xlsx|xls)$/i.test(pathPart)) {
      return pathPart
    }
  } catch {
    // Ignore URL parsing errors
  }

  const date = new Date().toISOString().split('T')[0]
  return `${retailer}_manifest_${date}.csv`
}

/**
 * Get file type from URL or filename
 */
function getFileType(urlOrFilename: string): 'csv' | 'xlsx' | 'xls' {
  const lower = urlOrFilename.toLowerCase()
  if (lower.includes('.xlsx')) return 'xlsx'
  if (lower.includes('.xls')) return 'xls'
  return 'csv'
}

/**
 * Show progress section
 */
function showProgress(): void {
  elements.progressSection.classList.remove('hidden')
  elements.resultsSection.classList.add('hidden')
}

/**
 * Update progress display
 */
function updateProgress(percent: number, detail: string): void {
  elements.progressBar.style.width = `${percent}%`
  elements.progressPercent.textContent = `${Math.round(percent)}%`
  elements.progressDetail.textContent = detail
}

/**
 * Hide progress section
 */
function hideProgress(): void {
  elements.progressSection.classList.add('hidden')
}

/**
 * Show results section
 */
function showResults(): void {
  elements.resultsSection.classList.remove('hidden')
  elements.resultFiles.textContent = state.results.files.toString()
  elements.resultItems.textContent = state.results.items.toLocaleString()
  elements.resultValue.textContent = `$${state.results.retailValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

/**
 * Handle download again button
 */
function handleDownloadAgain(): void {
  if (state.lastZipBlob) {
    downloadZip(state.lastZipBlob, generateZipFilename(state.results.files))
  }
}

/**
 * Handle reset button
 */
async function handleReset(): Promise<void> {
  state.urls = []
  state.uploadedFiles = []
  state.lastZipBlob = null
  state.results = { files: 0, items: 0, retailValue: 0 }
  state.isProcessing = false
  state.processingProgress = null

  elements.urlListSection.classList.add('hidden')
  elements.resultsSection.classList.add('hidden')
  elements.fileInput.value = ''

  await saveState()
  updateProcessButton()
}

// Time to wait after page load for JavaScript to execute and DOM to stabilize
const POST_LOAD_DELAY_MS = 1500
const TAB_LOAD_TIMEOUT_MS = 30000

/**
 * Wait for a tab to finish loading with timeout
 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false

    const cleanup = () => {
      resolved = true
      chrome.tabs.onUpdated.removeListener(listener)
    }

    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete' && !resolved) {
        cleanup()
        clearTimeout(timeoutId)
        setTimeout(resolve, POST_LOAD_DELAY_MS)
      }
    }

    // Set timeout to avoid hanging indefinitely
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        cleanup()
        reject(new Error(`Tab load timeout after ${TAB_LOAD_TIMEOUT_MS}ms`))
      }
    }, TAB_LOAD_TIMEOUT_MS)

    // Check if already complete before adding listener
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        cleanup()
        clearTimeout(timeoutId)
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (tab.status === 'complete' && !resolved) {
        cleanup()
        clearTimeout(timeoutId)
        setTimeout(resolve, POST_LOAD_DELAY_MS)
      } else {
        chrome.tabs.onUpdated.addListener(listener)
      }
    })
  })
}

/**
 * Result from processing a URL in a tab
 * Returns raw manifest data (base64) for ZIP without parsing
 */
interface TabProcessResult {
  retailer: string
  listingName: string
  auctionEndTime: string | null
  manifestData: string | null
  manifestType: 'csv' | 'xlsx' | 'xls' | null
}

/**
 * Process a single URL by opening it in a tab
 * Returns raw manifest data (no parsing) to verify downloads work
 */
async function processUrlInTab(url: string): Promise<TabProcessResult> {
  // Find the retailer module for this URL
  const retailerModule = retailerRegistry.findByUrl(url)

  if (!retailerModule) {
    console.warn(`[ManifestParser] No retailer module found for URL: ${url}`)
    return {
      retailer: 'Unknown',
      listingName: 'Unknown Listing',
      auctionEndTime: null,
      manifestData: null,
      manifestType: null,
    }
  }

  console.log(`[ManifestParser] Using retailer module: ${retailerModule.id}`)

  // Create new tab (inactive to not disrupt user)
  const tab = await chrome.tabs.create({ url, active: false })

  if (!tab.id) {
    throw new Error('Failed to create tab')
  }

  const tabId = tab.id // Capture for cleanup in finally block

  try {
    // Wait for page to load
    await waitForTabLoad(tabId)

    // Step 1: Extract metadata from content script (isolated world - can access __NEXT_DATA__)
    let retailer = retailerModule.displayName
    let listingName = 'Listing'
    let auctionEndTime: string | null = null

    try {
      console.log(`[ManifestParser] Extracting metadata from tab ${tabId}`)
      console.log(`[ManifestParser] Metadata function:`, retailerModule.extractMetadata.toString().substring(0, 200))
      const metadataResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: retailerModule.extractMetadata,
      })
      console.log(`[ManifestParser] Metadata result:`, metadataResult)
      if (metadataResult[0]?.result) {
        const metadata = metadataResult[0].result
        retailer = metadata.retailer
        listingName = metadata.listingName
        auctionEndTime = metadata.auctionEndTime
      } else {
        console.warn(`[ManifestParser] No metadata result. Full result:`, JSON.stringify(metadataResult))
      }
      console.log(`[ManifestParser] Metadata - Retailer: ${retailer}, Listing: ${listingName}`)
    } catch (error) {
      console.error(`[ManifestParser] Failed to extract metadata:`, error)
      console.error(`[ManifestParser] Error details:`, error instanceof Error ? error.stack : error)
    }

    // Step 2: Use MAIN world script to download manifest
    let manifestData: string | null = null
    let manifestType: 'csv' | 'xlsx' | 'xls' | null = null

    try {
      console.log(`[ManifestParser] Executing download in MAIN world (strategy: ${retailerModule.downloadStrategy})`)
      console.log(`[ManifestParser] Function to execute:`, retailerModule.downloadManifest.toString().substring(0, 200))
      const downloadResult = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: retailerModule.downloadManifest,
      })
      console.log(`[ManifestParser] Download result:`, downloadResult)
      if (downloadResult[0]?.result) {
        const result = downloadResult[0].result
        manifestData = result.data
        manifestType = result.type as 'csv' | 'xlsx' | 'xls' | null

        // If downloadUrl is returned instead of data, fetch it from extension context
        if (!manifestData && result.downloadUrl) {
          console.log(`[ManifestParser] Fetching file from URL: ${result.downloadUrl}`)
          try {
            const response = await fetch(result.downloadUrl)
            if (response.ok) {
              const blob = await response.blob()
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                  const dataUrl = reader.result as string
                  resolve(dataUrl.split(',')[1] || '')
                }
                reader.readAsDataURL(blob)
              })
              manifestData = base64
              console.log(`[ManifestParser] Fetched file: ${manifestType}, ${manifestData?.length || 0} chars`)
            } else {
              console.error(`[ManifestParser] Fetch failed: ${response.status}`)
            }
          } catch (fetchError) {
            console.error(`[ManifestParser] Fetch error:`, fetchError)
          }
        } else {
          console.log(`[ManifestParser] Captured manifest: ${manifestType}, ${manifestData?.length || 0} chars`)
        }
      } else {
        console.warn(`[ManifestParser] No result from download script. Full result:`, JSON.stringify(downloadResult))
      }
    } catch (error) {
      console.error(`[ManifestParser] Failed to capture manifest:`, error)
      console.error(`[ManifestParser] Error details:`, error instanceof Error ? error.stack : error)
    }

    // Return raw data without parsing - we're testing downloads first
    if (!manifestData) {
      console.log(`[ManifestParser] No manifest data captured for ${url}`)
    }

    return { retailer, listingName, auctionEndTime, manifestData, manifestType }
  } finally {
    // Always close the tab, even if errors occurred
    try {
      await chrome.tabs.remove(tabId)
    } catch (closeError) {
      console.warn(`[ManifestParser] Could not close tab ${tabId}:`, closeError)
    }
  }
}

// extractPageMetadata is now in retailer modules (src/retailers/sites/*.ts)

// interceptAndDownload is now in retailer modules (src/retailers/sites/*.ts)

/**
 * Generate filename in format: RETAILER_ListingName.csv
 * No date suffix - PST military time is included in listingName when available
 */
function generateListingFilename(
  retailer: string,
  listingName: string,
  _auctionEndTime: string | null
): string {
  const MAX_FILENAME_LENGTH = 50

  // Sanitize for filename (remove invalid chars, replace spaces)
  const sanitize = (str: string): string =>
    str
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
      .replace(/\s+/g, '-') // Replace spaces with dashes

  const sanitizedRetailer = sanitize(retailer)
  let sanitizedListing = sanitize(listingName)

  // Max listing length: 50 - retailer_ - .csv (min 10 chars for listing)
  const maxListingLen = Math.max(10, MAX_FILENAME_LENGTH - sanitizedRetailer.length - 1 - 4)

  // Preserve condition and time at the end (last 2 dash-separated parts if they look like condition/time)
  // Format: "ProductName-COND-HHMM" where COND is 1-3 chars, HHMM is 4 digits
  const parts = sanitizedListing.split('-')
  let suffix = ''

  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1]
    const secondLast = parts[parts.length - 2]

    // Check if last part is time (4 digits)
    const isTime = /^\d{4}$/.test(lastPart)
    // Check if second-to-last is condition (1-3 uppercase letters)
    const isCondition = /^[A-Z]{1,3}$/.test(secondLast)

    if (isTime && isCondition) {
      // Both condition and time present
      suffix = `-${secondLast}-${lastPart}`
      parts.pop()
      parts.pop()
    } else if (isTime) {
      // Only time present
      suffix = `-${lastPart}`
      parts.pop()
    } else if (/^[A-Z]{1,3}$/.test(lastPart)) {
      // Only condition present (no time)
      suffix = `-${lastPart}`
      parts.pop()
    }
  }

  // Truncate the product name part, preserving the suffix
  const maxProductLen = maxListingLen - suffix.length
  let productPart = parts.join('-')
  if (productPart.length > maxProductLen) {
    productPart = productPart.substring(0, maxProductLen)
    // Clean up trailing dash if truncation left one
    productPart = productPart.replace(/-$/, '')
  }

  sanitizedListing = productPart + suffix

  return `${sanitizedRetailer}_${sanitizedListing}.csv`
}

// needsTabProcessing is now imported from '../retailers'

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init)
