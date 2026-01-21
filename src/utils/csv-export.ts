import type { ManifestItem, ExportOptions } from '../parsers/types'

/**
 * Default export options
 */
const defaultOptions: Required<ExportOptions> = {
  filename: 'manifest_parsed.csv',
  includeHeaders: true,
  delimiter: ',',
}

/**
 * Export ManifestItems to CSV and trigger download
 */
export function exportToCsv(items: ManifestItem[], options: ExportOptions = {}): void {
  const opts = { ...defaultOptions, ...options }
  const csvContent = generateCsvContent(items, opts)

  downloadCsv(csvContent, opts.filename)
}

/**
 * Generate CSV content from ManifestItems
 */
export function generateCsvContent(
  items: ManifestItem[],
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options }
  const lines: string[] = []

  // Add headers
  if (opts.includeHeaders) {
    const headers = [
      'upc',
      'product_name',
      'unit_retail',
      'quantity',
      'source_site',
      'original_filename',
      'parsed_date',
    ]
    lines.push(headers.join(opts.delimiter))
  }

  // Add data rows
  for (const item of items) {
    const row = [
      escapeField(item.upc, opts.delimiter),
      escapeField(item.productName, opts.delimiter),
      item.unitRetail.toFixed(2),
      item.quantity.toString(),
      escapeField(item.sourceSite, opts.delimiter),
      escapeField(item.originalFilename, opts.delimiter),
      escapeField(item.parsedDate, opts.delimiter),
    ]
    lines.push(row.join(opts.delimiter))
  }

  return lines.join('\n')
}

/**
 * Escape a field for CSV
 */
function escapeField(value: string, delimiter: string): string {
  // Check if escaping is needed
  const needsEscape =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')

  if (!needsEscape) {
    return value
  }

  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

/**
 * Trigger CSV file download
 */
function downloadCsv(content: string, filename: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const bom = '\ufeff'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Generate summary statistics for export
 */
export function generateExportSummary(items: ManifestItem[]): {
  totalItems: number
  totalQuantity: number
  totalRetailValue: number
  uniqueSites: string[]
  uniqueFiles: string[]
} {
  const sites = new Set<string>()
  const files = new Set<string>()
  let totalQuantity = 0
  let totalRetailValue = 0

  for (const item of items) {
    sites.add(item.sourceSite)
    files.add(item.originalFilename)
    totalQuantity += item.quantity
    totalRetailValue += item.unitRetail * item.quantity
  }

  return {
    totalItems: items.length,
    totalQuantity,
    totalRetailValue,
    uniqueSites: Array.from(sites),
    uniqueFiles: Array.from(files),
  }
}
