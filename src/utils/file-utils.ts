/**
 * File type detection and utility functions
 */

/**
 * Detect file type from filename
 */
export function getFileTypeFromName(filename: string): 'csv' | 'xlsx' | 'xls' | null {
  const ext = filename.toLowerCase().split('.').pop()

  switch (ext) {
    case 'csv':
      return 'csv'
    case 'xlsx':
      return 'xlsx'
    case 'xls':
      return 'xls'
    default:
      return null
  }
}

/**
 * Detect file type from MIME type
 */
export function getFileTypeFromMime(mimeType: string): 'csv' | 'xlsx' | 'xls' | null {
  const mimeMap: Record<string, 'csv' | 'xlsx' | 'xls'> = {
    'text/csv': 'csv',
    'application/csv': 'csv',
    'text/plain': 'csv', // Often misidentified CSVs
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  }

  return mimeMap[mimeType] || null
}

/**
 * Detect file type from magic bytes
 */
export function getFileTypeFromBytes(buffer: ArrayBuffer): 'csv' | 'xlsx' | 'xls' | null {
  const bytes = new Uint8Array(buffer.slice(0, 8))

  // XLSX (ZIP) magic bytes: PK.. (50 4B 03 04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'xlsx'
  }

  // XLS (BIFF) magic bytes: D0 CF 11 E0 A1 B1 1A E1
  if (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return 'xls'
  }

  // Otherwise assume CSV (text-based, no magic bytes)
  // Check if it looks like text
  const isText = bytes.every(
    (byte) =>
      byte === 0x09 || // tab
      byte === 0x0a || // newline
      byte === 0x0d || // carriage return
      (byte >= 0x20 && byte <= 0x7e) || // printable ASCII
      byte >= 0x80 // extended characters
  )

  return isText ? 'csv' : null
}

/**
 * Generate a safe filename
 */
export function generateSafeFilename(
  baseName: string,
  extension: string,
  maxLength: number = 100
): string {
  // Remove unsafe characters
  let safe = baseName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()

  // Truncate if too long
  const extWithDot = extension.startsWith('.') ? extension : `.${extension}`
  const maxBaseName = maxLength - extWithDot.length

  if (safe.length > maxBaseName) {
    safe = safe.substring(0, maxBaseName - 3) + '...'
  }

  return safe + extWithDot
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}
