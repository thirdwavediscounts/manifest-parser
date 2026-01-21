import * as XLSX from 'xlsx'

/**
 * Read and parse XLSX/XLS data
 */
export async function readXlsx(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('No sheets found in workbook')
    }

    const worksheet = workbook.Sheets[firstSheetName]
    if (!worksheet) {
      throw new Error('Could not read worksheet')
    }

    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false, // Convert all values to strings for consistent handling
      defval: '', // Default value for empty cells
    })

    return data
  } catch (error) {
    throw new Error(`XLSX parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Read specific sheet from XLSX
 */
export async function readXlsxSheet(
  buffer: ArrayBuffer,
  sheetName?: string
): Promise<Record<string, unknown>[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })

    const targetSheet = sheetName || workbook.SheetNames[0]
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      throw new Error(`Sheet "${targetSheet}" not found`)
    }

    const worksheet = workbook.Sheets[targetSheet]
    if (!worksheet) {
      throw new Error('Could not read worksheet')
    }

    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: '',
    })

    return data
  } catch (error) {
    throw new Error(`XLSX parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get list of sheet names from XLSX
 */
export function getXlsxSheetNames(buffer: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', bookSheets: true })
    return workbook.SheetNames
  } catch {
    return []
  }
}

/**
 * Validate XLSX structure
 */
export function validateXlsxStructure(buffer: ArrayBuffer): {
  valid: boolean
  message: string
  sheetCount: number
  sheets: string[]
} {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', bookSheets: true })

    if (workbook.SheetNames.length === 0) {
      return {
        valid: false,
        message: 'No sheets found in workbook',
        sheetCount: 0,
        sheets: [],
      }
    }

    return {
      valid: true,
      message: 'Valid XLSX structure',
      sheetCount: workbook.SheetNames.length,
      sheets: workbook.SheetNames,
    }
  } catch (error) {
    return {
      valid: false,
      message: `Invalid XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sheetCount: 0,
      sheets: [],
    }
  }
}
