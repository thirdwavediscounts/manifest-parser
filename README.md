# Manifest Parser Chrome Extension

A Chrome browser extension that downloads manifest files (CSV/XLSX) from a Google Sheet containing links to liquidation retail manifests (Bstock, TechLiquidators) and parses them into a unified CSV format, bundled as a ZIP file.

## Features

- **Google Sheets Integration** - Load manifest URLs directly from your Google Sheet
- **Batch Processing** - Process multiple manifests at once
- **ZIP Output** - Download all parsed manifests as a ZIP file
- **Auto-detect Retailer** - Automatically identifies Bstock, TechLiquidators from URLs
- **Manual Upload** - Also supports direct file upload
- **Unified Format** - Consistent CSV output with standard columns

## Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **Chrome Extension** as application type
6. Copy the **Client ID**

### 2. Configure Extension

Edit `manifest.json` and replace:
- `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
- `YOUR_EXTENSION_KEY` - Remove this line (only needed for published extensions)

### 3. Install Extension

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. **Sign in with Google** - Click the extension icon and sign in
2. **Paste Google Sheet URL** - Enter the URL of your sheet containing manifest links
3. **Load URLs** - Click "Load" to fetch the manifest URLs from column A
4. **Select Manifests** - Choose which manifests to process (all selected by default)
5. **Process & Download** - Click the button to download and parse all manifests
6. **Get ZIP** - A ZIP file downloads containing:
   - Individual CSV files organized by retailer
   - Combined `all_manifests_combined.csv`
   - Summary file with statistics

## Google Sheet Format

Your Google Sheet should have manifest download URLs in **column A**:

| A |
|---|
| https://example.com/manifest1.csv |
| https://example.com/manifest2.xlsx |
| https://bstock.com/download/lot123 |

- URLs are auto-detected (no header row needed)
- Retailer is detected automatically from URL
- Invalid URLs are filtered out

## Output Format

Each parsed CSV contains:

| Column | Description |
|--------|-------------|
| upc | UPC/Item number |
| product_name | Product description |
| unit_retail | Original retail price |
| quantity | Item quantity |
| source_site | Detected retailer |
| original_filename | Source file name |
| parsed_date | Parse timestamp |

## ZIP Structure

```
manifests_2024-01-15_5files.zip
├── bstock/
│   ├── lot123_manifest.csv
│   └── lot456_manifest.csv
├── techliquidators/
│   └── inventory_export.csv
├── all_manifests_combined.csv
└── _summary.txt
```

## Supported Sites

- **B-Stock** (`bstock.com`, `bstockauctions.com`)
- **TechLiquidators** (`techliquidators.com`)
- Other sites (parsed with generic column mapping)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
manifest-parser/
├── src/
│   ├── popup/              # Extension popup UI
│   ├── background/         # Service worker
│   ├── content/            # Site detection scripts
│   ├── services/           # Google Sheets API
│   ├── parsers/            # CSV/XLSX parsing
│   └── utils/              # ZIP, export utilities
├── tests/                  # Unit tests
├── manifest.json           # Chrome extension manifest
└── vite.config.ts          # Build config
```

## Troubleshooting

### "Sign in failed"
- Verify your OAuth Client ID is correct in `manifest.json`
- Ensure Google Sheets API is enabled in your Cloud project

### "Failed to load sheet"
- Check that the sheet is accessible (you need read access)
- Verify the URL format is correct

### No manifests found
- Ensure URLs are in column A
- Check that URLs are valid HTTP/HTTPS links

## License

MIT
