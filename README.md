# Dev Mock & Chaos Testing Palette | APITrace

> **Manifest V3 Web Extension** combining a **UI Stress & Chaos Testing Palette** with **APITrace (Frontend API Debugging Assistant)** built using **WXT**, **React**, **Tailwind CSS**, and **TypeScript**.

---

## 🌟 Overview & Key Features

### 1. Dev Mock & Chaos Testing Palette
Testing UI edge cases usually requires editing mock files, altering database records, or modifying backend endpoints. This extension eliminates that friction with an in-page slide-out drawer:

- **Stress Content Injection into Text Nodes**:
  - **Extreme String Lengths**: 100, 500, and 2,500 character paragraphs to verify text truncation, multi-line wrapping, and container flex stretching.
  - **Unbroken Long Tokens**: The 80-character German compound word (*Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft*), alphanumeric tokens, and long URLs to check `overflow-wrap: break-word` and hyphenation bugs.
  - **Foreign Alphabets & RTL**: Arabic and Hebrew right-to-left layout testing, Japanese/CJK wrapping, and Devanagari (Hindi) complex ligatures.
  - **Special Unicode & Emojis**: Multi-codepoint sequences (ZWJ family emojis, skin tones, math symbols, currency glyphs).
  - **Zalgo Diacritics**: Excessive vertical accents to detect line-height box clipping.
  - **HTML / XSS Escaping Vectors**: Ensures user-generated content isn't accidentally executed as raw HTML.
  - **Interactive Element Picker**: Click any single element on the page (crosshair picker) or target all headings, paragraphs, buttons, or form placeholders.
- **One-Click Empty-State Simulator**:
  - Empties lists (`ul`, `ol`, `dl`), tables, and grid collections to test empty-state illustrations and fallback text without deleting server data.
- **Image Fallback & Broken Avatar Simulator**:
  - Dispatches `onerror` and replaces image sources with broken/fallback targets to test skeleton loaders, initials avatars, and alt text.
- **Non-Destructive DOM Snapshot & Revert**:
  - Keeps an in-memory snapshot of original text nodes, image sources, and emptied container children.
  - Single-click **"Restore Original Page"** reverts all mutations back to pristine state.

---

### 2. Route-Level Latency Throttle & Mock Chaos Engine
- **Endpoint-Specific Delay**:
  - Adds synthetic latency (e.g. 500ms, 1500ms, 3000ms, 5000ms) to specific URL patterns (e.g. `*/api/users*` or `*checkout*`) without throttling the entire browser connection!
- **Synthetic Error Mocks**:
  - Override specific routes with mock HTTP status codes: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `429 Too Many Requests`, `500 Internal Server Error`, or `504 Gateway Timeout`.
- **Quick-Add Presets**:
  - 1-click presets for simulating slow 3G latency (+2000ms) or checkout server errors.

---

### 3. APITrace — Frontend API Debugging Assistant
Frontend developers frequently switch between their application and the DevTools Network tab to inspect API requests. APITrace provides a convenient, integrated floating dashboard:

- **Fetch & XHR Interception**:
  - Intercepts and monitors outgoing API calls directly in the page.
  - Captures method, URL, status code, duration, request headers, request payload, response headers, response payload, and size.
- **Deep Inspector Drawer**:
  - **Response Tab**: Syntax-highlighted, collapsible interactive JSON tree viewer with quick copy.
  - **Payload Tab**: Formatted request body and parsed query parameter table.
  - **Headers Tab**: Full request and response header list.
  - **cURL Tab**: 1-click **"Copy as cURL"** command.
  - **Replay Request**: Re-send any captured request directly from the UI.
- **JSON-to-TypeScript Interface Generator**:
  - Generates typed TypeScript interfaces from response payloads on the fly!
  - Handles nested objects, typed arrays, primitives, and nullables.
  - Includes root interface renaming, 1-click clipboard copy, and `.d.ts` file download.
- **Search & Multi-Facet Filtering**:
  - Real-time search across URLs, methods, status codes, and response bodies.
  - Filter pills: Method (`GET`, `POST`, `PUT`, `DELETE`), Status (`2xx`, `4xx`, `5xx`, `Errors`), and **Slow Requests** (`>500ms`).
- **Export Capabilities**:
  - Export full captured request history as a formatted JSON trace file.
- **Privacy & Sensitive Data Sanitizer**:
  - Complies with Manifest V3 security considerations: masks `Authorization` Bearer tokens, cookies, session IDs, and sensitive JSON payload fields (`password`, `token`, `secret`, `credit_card`) by default.
  - Developer can toggle between **Masked** and **Raw** view as needed.

---

## 🏗️ Architecture & Manifest V3 Design

```
├── entrypoints/
│   ├── background.ts             # MV3 Service Worker (badge count, extension lifecycle)
│   ├── content/                  # Content script (ISOLATED world)
│   │   ├── index.tsx             # Mounts React UI inside Shadow DOM
│   │   └── style.css             # Scoped Tailwind CSS styles
│   ├── injected.ts               # Injected into MAIN world (Fetch & XHR monkey-patching)
│   └── popup/                    # Extension action popup
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── components/
│   ├── ChaosPaletteTab.tsx       # Text stress, element picker, empty-state, broken images
│   ├── LatencyThrottleTab.tsx    # Route latency rules and synthetic status mocks
│   ├── ApiTraceTab.tsx           # Real-time request table, filters, search, slow request detector
│   ├── RequestDetailDrawer.tsx   # Request/response inspector, cURL, header sanitizer
│   ├── JsonViewer.tsx            # Collapsible syntax-highlighted JSON viewer
│   ├── TypeScriptViewer.tsx      # JSON-to-TypeScript type generator
│   └── SlideOutPanel.tsx         # Slide-out drawer container and floating trigger pill
├── utils/
│   ├── chaos-presets.ts          # Curated stress test payloads
│   ├── dom-chaos.ts              # DOM mutation engine, snapshots, and tree walkers
│   ├── json-to-ts.ts             # Recursive JSON to TypeScript generator
│   ├── curl.ts                   # cURL converter and JSON exporter
│   ├── sanitizer.ts              # Sensitive header & credential masker
│   └── types.ts                  # Type definitions
└── demo/
    └── index.html                # Interactive test workbench
```

### Why Shadow DOM?
The in-page slide-out panel and floating trigger dock are mounted inside a **Shadow DOM root** (`#dev-chaos-apitrace-root`).
- **Isolation**: Prevents host webpage styles from affecting the extension UI.
- **Safety**: Prevents extension Tailwind CSS styles from leaking into and altering the host webpage.

### Injected Script (MAIN World) Bridge
Manifest V3 content scripts run in an `ISOLATED` world and cannot directly read the return value of page-level `window.fetch` or `XMLHttpRequest`.
1. The content script injects `injected.js` into the document (`MAIN` execution world).
2. `injected.js` wraps `window.fetch` and `XMLHttpRequest.prototype`.
3. Outgoing requests are checked against active route latency rules for synthetic delay or mock responses.
4. Completed requests dispatch a CustomEvent (`__DEV_CHAOS_API_TRACE__`) to the content script.
5. Sensitive credentials are sanitized before storage and presentation.

---

## 🚀 Getting Started

### 1. Build the Extension
```bash
# Install dependencies
pnpm install

# Build extension for Chrome Manifest V3
pnpm run build
```
The output directory will be created at `.output/chrome-mv3`.

### 2. Load into Google Chrome / Edge / Brave
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **"Load unpacked"**.
4. Select the `.output/chrome-mv3` folder inside this repository:
   ```
   d:\practice\mock-lab-browser-extension\.output\chrome-mv3
   ```
5. The **Dev Mock & Chaos Testing Palette | APITrace** extension will appear in your extensions list!

### 3. Test with the Included Workbench
1. Open the included workbench file in Chrome:
   ```
   file:///d:/practice/mock-lab-browser-extension/demo/index.html
   ```
   *(Or serve it via any local web server).*
2. Look at the bottom-right corner of the page: you will see the floating **"DevMock & Trace"** pill.
3. Click the pill to open the slide-out panel:
   - **Chaos Testing tab**: Click presets like *German Compound*, *Arabic RTL*, or *Zalgo* to test truncation.
   - **Empty List Simulator**: Click to empty the item list and check fallback states.
   - **Broken Image Tester**: Click to verify fallback avatar handling.
   - **Route Latency tab**: Add a latency rule or click a quick preset (e.g. `*/api/*` +2000ms delay).
   - **APITrace tab**: Click the buttons on the demo page (*Fetch /api/users*, *Post /api/orders*). Inspect headers, generate TypeScript interfaces, and export as cURL!
4. Click **"Restore Page"** to instantly revert all DOM mutations.

---

## 🛠️ Available Scripts

- `pnpm run build`: Builds the production bundle in `.output/chrome-mv3`
- `pnpm run dev`: Starts WXT development mode with hot-module reloading
- `pnpm run compile`: Runs TypeScript type checking (`tsc --noEmit`)
- `pnpm run zip`: Packages the extension into a `.zip` file for Chrome Web Store distribution

