import JSZip from 'jszip'
import type { ManifestItem } from '../parsers/types'
import { generateCsvContent } from './csv-export'

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
 * Create a ZIP file containing raw (unparsed) manifest files
 * This preserves original file format without conversion
 */
export async function createZipFromRawFiles(entries: RawZipEntry[]): Promise<Blob> {
  const zip = new JSZip()
  const usedFilenames = new Set<string>()

  for (const entry of entries) {
    // Decode base64 to binary
    const binaryData = atob(entry.data)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i)
    }

    // Generate unique filename with correct extension
    let filename = sanitizeRawFilename(entry.filename, entry.retailer, entry.fileType)

    // Ensure unique filename
    if (usedFilenames.has(filename)) {
      const ext = entry.fileType
      const base = filename.replace(new RegExp(`\\.${ext}$`, 'i'), '')
      let counter = 2
      while (usedFilenames.has(`${base}_${counter}.${ext}`)) {
        counter++
      }
      filename = `${base}_${counter}.${ext}`
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
 * Sanitize filename for raw files, preserving original extension
 */
function sanitizeRawFilename(
  filename: string,
  retailer: string,
  fileType: 'csv' | 'xlsx' | 'xls'
): string {
  // Remove/replace invalid characters
  let safe = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()

  // Ensure it ends with correct extension
  const ext = `.${fileType}`
  if (!safe.toLowerCase().endsWith(ext)) {
    safe = safe.replace(/\.[^.]+$/, '') + ext
  }

  // Prefix with retailer if not already included
  const safeRetailer = retailer.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!safe.toLowerCase().includes(safeRetailer)) {
    safe = `${safeRetailer}_${safe}`
  }

  // Truncate if too long
  if (safe.length > 100) {
    safe = safe.substring(0, 90) + ext
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
