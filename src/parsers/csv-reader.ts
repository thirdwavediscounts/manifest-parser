import Papa from 'papaparse'

/**
 * Read and parse CSV data
 */
export async function readCsv(csvText: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        if (results.errors.length > 0) {
          // Log errors but continue with parsed data
          const criticalErrors = results.errors.filter(
            (e) => e.type === 'FieldMismatch' || e.code === 'TooFewFields'
          )
          if (criticalErrors.length > 0 && results.data.length === 0) {
            reject(new Error(`CSV parse error: ${criticalErrors[0].message}`))
            return
          }
        }
        resolve(results.data)
      },
      error: (error: Error) => {
        reject(new Error(`CSV parse error: ${error.message}`))
      },
    })
  })
}

/**
 * Read CSV with custom delimiter detection
 */
export async function readCsvWithDelimiterDetection(
  csvText: string
): Promise<Record<string, unknown>[]> {
  // Try to detect delimiter
  const firstLine = csvText.split('\n')[0]
  const delimiters = [',', ';', '\t', '|']
  let bestDelimiter = ','
  let maxCount = 0

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      bestDelimiter = delimiter
    }
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      delimiter: bestDelimiter,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        resolve(results.data)
      },
      error: (error: Error) => {
        reject(new Error(`CSV parse error: ${error.message}`))
      },
    })
  })
}

/**
 * Validate CSV structure
 */
export function validateCsvStructure(data: Record<string, unknown>[]): {
  valid: boolean
  message: string
  headerCount: number
  rowCount: number
} {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      valid: false,
      message: 'No data found in CSV',
      headerCount: 0,
      rowCount: 0,
    }
  }

  const headers = Object.keys(data[0])
  if (headers.length === 0) {
    return {
      valid: false,
      message: 'No headers found in CSV',
      headerCount: 0,
      rowCount: data.length,
    }
  }

  return {
    valid: true,
    message: 'Valid CSV structure',
    headerCount: headers.length,
    rowCount: data.length,
  }
}
