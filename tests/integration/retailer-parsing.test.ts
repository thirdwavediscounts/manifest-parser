import { parseManifestData } from '../../src/parsers/base-parser'
import { readXlsx } from '../../src/parsers/xlsx-reader'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

describe('Retailer Parsing Integration', () => {
  // Helper to load CSV files
  const loadCsv = (filename: string) => {
    const content = fs.readFileSync(path.join(__dirname, '../../csvs', filename), 'utf-8')
    return parse(content, { columns: true, skip_empty_lines: true })
  }

  // Helper to load XLSX files (for TL retailer)
  const loadXlsx = async (filename: string) => {
    const buffer = fs.readFileSync(path.join(__dirname, '../../csvs', filename))
    return readXlsx(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  }

  // Placeholder test to verify infrastructure works
  test('infrastructure setup', () => {
    expect(typeof loadCsv).toBe('function')
    expect(typeof loadXlsx).toBe('function')
    expect(typeof parseManifestData).toBe('function')
  })
})
