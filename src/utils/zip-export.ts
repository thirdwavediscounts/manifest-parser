import JSZip from 'jszip'
import type { ManifestItem } from '../parsers/types'
import { generateCsvContent } from './csv-export'
import { appendMetadataToManifest } from './raw-metadata'

/**
 * Unified format entry for ZIP (already-transformed CSV content)
 */
export interface UnifiedZipEntry {
  filename: string
  csvContent: string // Already-generated unified CSV string
  retailer: string
  sourceUrl: string
}

export interface ZipEntry {
  filename: string
  items: ManifestItem[]
  retailer: string
  sourceUrl: string
}

/**
 * Raw file entry for ZIP (no parsing, just raw data)
 */
export interface RawZipEntry {
  filename: string
  data: string // base64 encoded
  retailer: string
  sourceUrl: string
  fileType: 'csv' | 'xlsx' | 'xls'
  // Metadata fields for raw file enhancement
  auctionUrl: string
  bidPrice: number
  shippingFee: number
}

/**
 * Create a ZIP file containing multiple CSV files (flat structure, no folders)
 */
export async function createZipFromManifests(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip()

  // Track filenames to avoid duplicates
  const usedFilenames = new Set<string>()

  // Add each manifest as a flat CSV file (no folders)
  for (const entry of entries) {
    const csvContent = generateCsvContent(entry.items)
    let filename = sanitizeFilename(entry.filename, entry.retailer)

    // Ensure unique filename
    if (usedFilenames.has(filename)) {
      const base = filename.replace(/\.csv$/i, '')
      let counter = 2
      while (usedFilenames.has(`${base}_${counter}.csv`)) {
        counter++
      }
      filename = `${base}_${counter}.csv`
    }

    usedFilenames.add(filename)
    zip.file(filename, csvContent)
  }

  // Generate the ZIP blob
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/**
 * Create a ZIP file containing raw manifest files with appended metadata columns
 * All files are converted to CSV format with auction_url, bid_price, shipping_fee columns
 */
export async function createZipFromRawFiles(entries: RawZipEntry[]): Promise<Blob> {
  const zip = new JSZip()
  const usedFilenames = new Set<string>()

  for (const entry of entries) {
    // Append metadata columns and convert to CSV
    const csvContent = appendMetadataToManifest(entry.data, entry.fileType, {
      auctionUrl: entry.auctionUrl,
      bidPrice: entry.bidPrice,
      shippingFee: entry.shippingFee,
    })

    // Convert CSV string to Uint8Array
    const encoder = new TextEncoder()
    const bytes = encoder.encode(csvContent)

    // Generate unique filename (always .csv)
    let filename = sanitizeRawFilename(entry.filename, entry.retailer)

    // Ensure unique filename
    if (usedFilenames.has(filename)) {
      const base = filename.replace(/\.csv$/i, '')
      let counter = 2
      while (usedFilenames.has(`${base}_${counter}.csv`)) {
        counter++
      }
      filename = `${base}_${counter}.csv`
    }

    usedFilenames.add(filename)
    zip.file(filename, bytes)
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/**
 * Create a ZIP file containing unified CSV files
 * Takes already-transformed CSV content strings
 */
export async function createZipFromUnifiedManifests(entries: UnifiedZipEntry[]): Promise<Blob> {
  const zip = new JSZip()
  const usedFilenames = new Set<string>()

  for (const entry of entries) {
    // Ensure filename ends with .csv
    let filename = entry.filename
    if (!filename.toLowerCase().endsWith('.csv')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.csv'
    }

    // Ensure unique filename
    if (usedFilenames.has(filename)) {
      const base = filename.replace(/\.csv$/i, '')
      let counter = 2
      while (usedFilenames.has(`${base}_${counter}.csv`)) {
        counter++
      }
      filename = `${base}_${counter}.csv`
    }

    usedFilenames.add(filename)
    zip.file(filename, entry.csvContent)
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/**
 * Sanitize filename for raw files, always using .csv extension
 * (All raw files are converted to CSV with metadata columns)
 */
function sanitizeRawFilename(filename: string, retailer: string): string {
  // Remove/replace invalid characters
  let safe = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()

  // Always use .csv extension (files are converted to CSV)
  if (!safe.toLowerCase().endsWith('.csv')) {
    safe = safe.replace(/\.[^.]+$/, '') + '.csv'
  }

  // Prefix with retailer if not already included
  const safeRetailer = retailer.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!safe.toLowerCase().includes(safeRetailer)) {
    safe = `${safeRetailer}_${safe}`
  }

  // Truncate if too long
  if (safe.length > 100) {
    safe = safe.substring(0, 90) + '.csv'
  }

  return safe
}

/**
 * Sanitize filename for ZIP, prefixing with retailer
 */
function sanitizeFilename(filename: string, retailer: string): string {
  // Remove/replace invalid characters
  let safe = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()

  // Ensure it ends with .csv
  if (!safe.toLowerCase().endsWith('.csv')) {
    safe = safe.replace(/\.[^.]+$/, '') + '.csv'
  }

  // Prefix with retailer if not already included
  const safeRetailer = retailer.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!safe.toLowerCase().includes(safeRetailer)) {
    safe = `${safeRetailer}_${safe}`
  }

  // Truncate if too long
  if (safe.length > 100) {
    safe = safe.substring(0, 90) + '.csv'
  }

  return safe
}

/**
 * Download a ZIP blob as a file
 */
export function downloadZip(blob: Blob, filename = 'manifests.zip'): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Generate filename for the ZIP based on date and count
 */
export function generateZipFilename(count: number): string {
  const date = new Date().toISOString().split('T')[0]
  return `manifests_${date}_${count}files.zip`
}
