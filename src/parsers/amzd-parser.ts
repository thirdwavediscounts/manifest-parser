/**
 * AMZD (Amazon Direct) Parser Functions
 *
 * Handles Amazon Direct manifests with unique challenges:
 * - Misaligned columns due to unquoted commas in titles
 * - ASIN-based identification (B0XXXXXXXXX format)
 * - Fixed 4.5x price multiplier for accurate unit retail
 */

/**
 * ASIN pattern: Starts with B0, followed by 8 alphanumeric characters (uppercase)
 */
export const ASIN_PATTERN = /^B0[A-Z0-9]{8}$/

/**
 * Fixed multiplier for converting lot item price to estimated unit retail
 * Based on manual verification against actual Amazon listings
 */
export const PRICE_MULTIPLIER = 4.5

/**
 * Parsed row result from AMZD manifest
 */
export interface AmzdParsedRow {
  asin: string
  productName: string
  qty: number
  unitRetail: number
}

/**
 * Find an ASIN in an array of cell values
 *
 * Scans all cells for a value matching the ASIN pattern (B0XXXXXXXXX).
 * Returns the first ASIN found, or empty string if none found.
 *
 * @param cells - Array of cell values to search
 * @returns The first ASIN found, or empty string
 */
export function findAsin(cells: unknown[]): string {
  for (const cell of cells) {
    if (cell === null || cell === undefined) {
      continue
    }
    const value = String(cell)
    if (ASIN_PATTERN.test(value)) {
      return value
    }
  }
  return ''
}

/**
 * Extract a value from the right (end) of an array
 *
 * Used for right-anchor extraction when columns are misaligned.
 * Position 1 = last element, 2 = second from end, etc.
 *
 * @param cells - Array of cell values
 * @param posFromEnd - Position from end (1-based, 1 = last)
 * @returns The value at the specified position, or undefined if out of bounds
 */
export function extractRightAnchored<T>(cells: T[], posFromEnd: number): T | undefined {
  if (posFromEnd <= 0 || cells.length === 0) {
    return undefined
  }
  const index = cells.length - posFromEnd
  if (index < 0) {
    return undefined
  }
  return cells[index]
}

/**
 * Calculate unit retail from lot item price using 4.5x multiplier
 *
 * AMZD manifests list lot prices that are significantly lower than actual
 * retail values. The 4.5x multiplier provides a more accurate estimate
 * based on verification against Amazon listings.
 *
 * @param lotPrice - The lot item price from the manifest
 * @returns The calculated unit retail, rounded to 2 decimal places
 */
export function calculateAmzdUnitRetail(lotPrice: number): number {
  if (isNaN(lotPrice) || lotPrice < 0) {
    return 0
  }
  if (lotPrice === 0) {
    return 0
  }
  const result = lotPrice * PRICE_MULTIPLIER
  return Number(result.toFixed(2))
}

/**
 * Detect if a row is misaligned (has more cells than headers)
 *
 * AMZD manifests can have misaligned rows when titles contain unquoted commas,
 * causing extra cells to appear. When detected, right-anchor extraction
 * should be used for reliable field extraction.
 *
 * @param cells - Array of cell values in the row
 * @param headers - Array of header names
 * @returns true if cells exceed headers (misaligned)
 */
export function isAmzdMisaligned(cells: unknown[], headers: string[]): boolean {
  return cells.length > headers.length
}

/**
 * Parse a price string, removing currency symbols and commas
 *
 * @param value - Price string (e.g., "$1,234.56" or "17.75")
 * @returns Parsed number, or 0 if invalid
 */
function parsePrice(value: unknown): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  const cleaned = String(value).replace(/[$,]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Parse a quantity value
 *
 * @param value - Quantity value (string or number)
 * @returns Parsed integer quantity, minimum 1
 */
function parseQty(value: unknown): number {
  if (value === null || value === undefined) {
    return 1
  }
  if (typeof value === 'number') {
    return isNaN(value) || value < 1 ? 1 : Math.round(value)
  }
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) || parsed < 1 ? 1 : parsed
}

/**
 * Parse a single AMZD manifest row
 *
 * Handles both well-formed rows (using header mapping) and misaligned rows
 * (using right-anchor extraction). Always scans cells for ASIN regardless
 * of alignment.
 *
 * @param row - The row data object (header-keyed values)
 * @param cells - Raw cell values array
 * @param headers - Array of header names
 * @returns Parsed row data, or null if row is empty/unusable
 */
export function parseAmzdRow(
  row: Record<string, unknown>,
  cells: unknown[],
  headers: string[]
): AmzdParsedRow | null {
  // Handle empty rows
  if (cells.length === 0) {
    return null
  }

  // Always scan cells for ASIN
  const asin = findAsin(cells)

  let productName = ''
  let qty = 1
  let lotPrice = 0

  const misaligned = isAmzdMisaligned(cells, headers)

  if (misaligned) {
    // Right-anchor extraction for misaligned rows
    // Positions: qty at -3, price at -2 from end
    const qtyValue = extractRightAnchored(cells, 3)
    const priceValue = extractRightAnchored(cells, 2)

    qty = parseQty(qtyValue)
    lotPrice = parsePrice(priceValue)

    // For productName in misaligned rows, we can't reliably determine it
    // Just leave it empty - ASIN is the primary identifier
    productName = ''
  } else {
    // Header-based extraction for well-formed rows
    // Try to get productName: Item Title -> Model -> Brand
    productName = String(row['Item Title'] ?? row['Model'] ?? row['Brand'] ?? '').trim()

    qty = parseQty(row['Qty'])
    lotPrice = parsePrice(row['Lot item price'])
  }

  // Calculate unit retail
  const unitRetail = calculateAmzdUnitRetail(lotPrice)

  // Return null if row has no usable data
  if (!asin && !productName && unitRetail === 0) {
    return null
  }

  return {
    asin,
    productName,
    qty,
    unitRetail,
  }
}
