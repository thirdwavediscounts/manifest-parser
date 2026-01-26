# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.3.3 - Entire codebase, Chrome extension development
- HTML/DOM - Popup UI and content script interaction

## Runtime

**Environment:**
- Chrome Browser (Manifest V3) - Extension runtime
- Node.js - Development and build tooling

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Chrome Extensions API v3 - Extension runtime and inter-process communication
- Vite 5.0.12 - Build tool and development server
- CRXJS Vite Plugin 2.0.0-beta.23 - Chrome extension build integration

**Testing:**
- Vitest 1.2.2 - Test runner and framework
- Vitest globals configuration - Global test utilities (describe, it, expect)

**Build/Dev:**
- TypeScript 5.3.3 - Type checking and transpilation
- esbuild (via Vite) - JavaScript/TypeScript bundling

## Key Dependencies

**Critical:**
- jszip 3.10.1 - ZIP file generation and manipulation for manifest exports
- papaparse 5.4.1 - CSV parsing and handling with delimiter detection
- xlsx 0.18.5 - Excel file (XLSX/XLS) parsing and reading

**Type Definitions:**
- @types/chrome 0.0.260 - Chrome API TypeScript definitions
- @types/papaparse 5.3.14 - Papa Parse TypeScript definitions

**Testing:**
- vitest 1.2.2 - Unit and integration test runner
- @vitest/spy - Spy/mock utilities for Vitest

**Development:**
- @crxjs/vite-plugin 2.0.0-beta.23 - Vite plugin for Chrome extension development

## Configuration

**Environment:**
- TypeScript strict mode enabled (`strict: true`)
- Module resolution: bundler (ESNext modules)
- Target: ES2020
- Path aliases: `@/*` maps to `src/*`

**Build:**
- `vite.config.ts` - Vite build configuration with CRXJS plugin
- `vitest.config.ts` - Test configuration with v8 coverage provider
- `tsconfig.json` - TypeScript compiler options
- `manifest.json` - Chrome extension manifest (V3)

**Build Commands:**
- `npm run dev` - Start Vite dev server
- `npm run build` - Build with TypeScript check then Vite bundling
- `npm run preview` - Preview built extension
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## Platform Requirements

**Development:**
- Node.js (version unspecified, compatible with npm)
- Chrome/Chromium browser with Manifest V3 support
- Windows/macOS/Linux (cross-platform compatible)

**Production:**
- Chrome browser version with Manifest V3 support (Chrome 88+)
- Extension installed via Chrome Web Store or local loading for development

## Security & Permissions

**Chrome Permissions Requested:**
- `activeTab` - Access to active tab information
- `downloads` - Download manifest files
- `storage` - Local storage for state/settings persistence
- `identity` - OAuth2 authentication with Google
- `tabs` - Tab management (create, query, remove)
- `scripting` - Content script execution
- `proxy` - HTTP proxy configuration
- `webRequest` - Web request interception (deprecated in MV3, legacy)
- `webRequestAuthProvider` - Proxy authentication handling

**Host Permissions:**
- `*://*.bstock.com/*` - B-Stock marketplace
- `*://*.bstockauctions.com/*` - B-Stock auctions
- `*://*.techliquidators.com/*` - TechLiquidators
- `*://*.amazon.com/*` - Amazon.com
- `*://*.s3.amazonaws.com/*` - AWS S3 access
- `https://sheets.googleapis.com/*` - Google Sheets API
- `https://www.googleapis.com/*` - Google API services

## Extension Architecture

**Components:**
- `popup.html/popup.ts` - Popup UI and main user interface
- `src/background/service-worker.ts` - Background service worker (V3)
- `src/content/sites/*.ts` - Content scripts for specific retailer sites
- `src/parsers/*.ts` - File parsing and data extraction
- `src/retailers/*.ts` - Retailer-specific logic and registry
- `src/services/*.ts` - External service integrations

---

*Stack analysis: 2026-01-27*
