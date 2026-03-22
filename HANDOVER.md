# HANDOVER.md — EPANET for SWMM5 Experts ("The Rosetta Stone")

> **Version:** 1.0 · March 2026
> **Author:** Robert E. Dickinson · [SWMM5.org](https://www.swmm5.org) · [LinkedIn](https://www.linkedin.com/in/robertdickinson/)

---

## 1. App Overview & Purpose

A self-contained, single-page interactive web application that maps every SWMM5 concept to its EPANET equivalent. Designed for stormwater engineers with deep SWMM5 experience who need to understand pressurized water distribution modeling (EPANET).

The app is pure HTML/CSS/JS — no React, no build-time framework. It is served as a static `index.html` by Vite in development and deployed as a static site.

**Key stats (as of March 2026):**
- ~7,800+ lines in a single `index.html`
- 18 interactive tabs
- 3 animated `<canvas>` elements + 1 Chart.js chart (fire flow)
- 30+ interactive range sliders
- 5 calculators (pipe head loss, force main n↔C, treatment editor, fire flow, pump energy)
- US/SI unit toggle
- 5 color themes
- URL hash state persistence
- Print stylesheet
- Downloadable reference document generator
- Console-based equation validation tests

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Markup/Logic | Pure HTML/CSS/JavaScript (no framework) |
| Dev server | Vite 6 |
| Charting | Chart.js (CDN) |
| Fonts | Google Fonts (Outfit, JetBrains Mono) — progressive enhancement with system fallbacks |
| Monorepo | pnpm workspaces |
| Package name | `@workspace/epanet-swmm` |
| Node.js | 24 |
| TypeScript | 5.9 (for Vite config only; the app itself is plain JS) |

**External dependencies (CDN):**
- `chart.js` — loaded via `<script src="https://cdn.jsdelivr.net/npm/chart.js">`

---

## 3. File Structure

```
artifacts/epanet-swmm/
├── index.html                    # The entire application (~6,409 lines)
├── vite.config.ts                # Vite configuration (reads PORT and BASE_PATH env vars)
├── package.json                  # Package config (@workspace/epanet-swmm)
├── tsconfig.json                 # TypeScript config (for Vite config only)
└── .replit-artifact/
    └── artifact.toml             # Replit artifact config (ports, build, deploy, preview path)
```

The `index.html` file contains everything: all CSS, all HTML, and all JavaScript. This is intentional — it makes the app fully self-contained and trivially portable.

---

## 4. Tabs — Complete Inventory

The app has 18 tabs, controlled by `data-tab` attributes on nav buttons and matching `id="sec-{name}"` section divs. (The original v1.0 release had 11 tabs; Force Mains was part of v1.0 as tab 12, then First Principles and Reference were added post-release (14 tabs), then Treatment Editor (15 tabs), and finally Valves, Fire Flow, and Pump Energy (18 tabs).)

| # | Tab Label | `data-tab` | Section ID | Description |
|---|---|---|---|---|
| 1 | The Big Flip | `overview` | `sec-overview` | Core concept: gravity (SWMM) → pressure (EPANET). Interactive pipe cross-section canvas, water depth slider, mode toggle. |
| 2 | Objects Map | `objects` | `sec-objects` | Side-by-side mapping of SWMM5 objects to EPANET equivalents (junctions→nodes, conduits→pipes, etc.) |
| 3 | Demands | `demands` | `sec-demands` | SWMM5 lateral inflows vs. EPANET demand patterns. Demand categories, pattern multipliers. |
| 4 | Hydraulics | `hydraulics` | `sec-hydraulics` | Manning's vs. Hazen-Williams vs. Darcy-Weisbach. Full Saint-Venant equations with term-by-term breakdown. |
| 5 | The Solver | `solver` | `sec-solver` | Dynamic wave (SWMM5) vs. Gradient Algorithm (EPANET). CFL condition with worked examples. Preissmann slot. |
| 6 | Water Quality | `quality` | `sec-quality` | SWMM5 buildup/washoff vs. EPANET reaction kinetics. Decoupled WQ transport comparison. |
| 7 | Rules & Controls | `controls` | `sec-controls` | SWMM5 control rules vs. EPANET simple/rule-based controls. PID controllers. |
| 8 | File Format | `fileformat` | `sec-fileformat` | .INP file comparison. SWMM5 sections vs. EPANET sections, with annotated examples. |
| 9 | Calculator | `calculator` | `sec-calculator` | Interactive pipe head loss calculator with Manning's/H-W/D-W. Dual unit systems. Live results. |
| 10 | Gotchas | `gotchas` | `sec-gotchas` | Common mistakes when crossing between SWMM5 and EPANET. Convergence troubleshooting. |
| 11 | Which Tool? | `whichtool` | `sec-whichtool` | Decision flowchart: when to use SWMM5 vs. EPANET. SVG flowchart with decision nodes. |
| 12 | Force Mains | `forcemains` | `sec-forcemains` | Force Main Converter v2.0. Dual-mode n↔C conversion (SWMM5 source code vs. reference manual). Darcy-Weisbach. Batch chart. Setup checklist. |
| 13 | First Principles | `firstprinciples` | `sec-firstprinciples` | First-principles deconstruction: 25 inherited EPANET assumptions, 10 bedrock truths, rebuilt SWMM5 mental model, sacred vs. arbitrary conventions. |
| 14 | Treatment | `treatment` | `sec-treatment` | Treatment expression editor with real-time validation, 10 pollutant presets, 8 templates, live simulation with Chart.js visualization, SWMM5 export. TX IIFE namespace. |
| 15 | Valves | `valves` | `sec-valves` | EPANET valve types deep dive (PRV, PSV, PBV, FCV, TCV, GPV). Interactive valve simulator with type-specific equations, sliders, and SWMM5 comparison notes. |
| 16 | Fire Flow | `fireflow` | `sec-fireflow` | Fire flow analysis calculator. Available fire flow from hydrant test data using Q_avail = Q_test × ((P_static - P_min) / (P_static - P_residual))^0.54. ISO rating. Chart.js visualization. |
| 17 | Pump Energy | `pumpenergy` | `sec-pumpenergy` | Pump energy & cost calculator. WHP, BHP, kW, daily/annual cost. Affinity laws. SWMM5 pump type comparison. EPANET [ENERGY] section explained. |
| 18 | Reference | `docs` | `sec-docs` | All 16 reference sections displayed inline with a 2-column TOC. Also contains link to downloadable printable document. |

---

## 5. Interactive Elements

### 5.1 Animated Canvases (3)

| Canvas | Location | Function | Key JS |
|---|---|---|---|
| Pipe Cross-Section | Tab 1 (Big Flip) | Shows SWMM partial-fill vs. EPANET full-pipe side by side. Animated water level, air space, dimension labels. | `drawPipeCanvas()` (line ~4549) |
| HGL Blend | Tab 1 (Big Flip) | Hydraulic Grade Line comparison between gravity and pressure systems. | `drawHGL()` (line ~4763) |
| Friction Slope Chart | Tab 12 (Force Mains) | Manning vs. Hazen-Williams friction slope divergence chart. Real-time update from sliders. | `fmDrawChart()` (line ~5163) |

### 5.2 Interactive Sliders (17+)

Sliders use native `<input type="range">` with `oninput` handlers. All respect the US/SI unit system. Key sliders include:
- Water depth (d/D ratio) in Big Flip tab
- Manning's n in Big Flip tab
- Pipe diameter, length, flow, roughness in Calculator tab
- Hazen-Williams C, Manning's n, pipe diameter, slope in Force Mains tab

### 5.3 Calculators

**Pipe Head Loss Calculator** (Tab 9, `sec-calculator`):
- Inputs: diameter, length, flow, Manning's n, H-W C
- Outputs: velocity, Reynolds number, head loss (Manning, H-W, D-W), friction slope
- JS: `updateCalc()` (line ~4262)

**Force Main Converter** (Tab 12, `sec-forcemains`):
- Dual formula modes: SWMM5 simplified (`cToN_swmm`) vs. full derivation (`cToN_alt`)
- Bidirectional: C→n and n→C
- Includes Darcy-Weisbach → Manning's n converter
- Batch friction slope comparison chart
- JS: `fmRender()` (line ~5072), `cToN_swmm()` (line ~4990), `cToN_alt()` (line ~4999)

---

## 6. CSS Architecture

### 6.1 CSS Variables (Custom Properties)

All colors are defined as CSS custom properties on `:root` / `[data-theme]` selectors. Key variables:

| Variable | Purpose |
|---|---|
| `--bg-deep` | Page background |
| `--bg-card` | Card/panel background |
| `--bg-card-hover` | Card hover state |
| `--border` | Border color |
| `--swmm-blue` / `--swmm-glow` | SWMM5 brand colors (blue family) |
| `--epanet-amber` / `--epanet-glow` | EPANET brand colors (amber family) |
| `--accent-cyan` | Code highlights, equations |
| `--accent-green` | Success, "aha" insights |
| `--accent-red` | Warnings |
| `--text-primary` / `--text-muted` / `--text-dim` | Text hierarchy |
| `--font-body` | Body font (Outfit) |
| `--font-mono` | Monospace font (JetBrains Mono) |
| `--bg-glow-1` / `--bg-glow-2` | Background radial gradient colors |

### 6.2 Theme System (5 Themes)

Themes are defined as `[data-theme="X"]` selectors that override the CSS variables:

| Theme | `data-theme` | Colors |
|---|---|---|
| Dark (default) | `dark` | Navy/dark blue, cyan + amber accents |
| UF Gators | `uf` | Deep navy, UF blue (#0021A5) + Gator orange (#FA4616) |
| Ohio State | `osu` | Dark scarlet (#1a0a0a), Buckeye red (#BB0000) + gray |
| Auburn | `auburn` | Navy (#0d1020), Auburn navy (#03244d) + orange (#DD550C) |
| EPA | `epa` | Dark blue-gray, EPA blue (#0071BC) + EPA green (#2E8B57) |

**JS:** `setTheme(theme)` at line ~4088. Validates against `VALID_THEMES` whitelist. Updates `data-theme` attribute on `<html>`, syncs the `<select>` dropdown, and calls `saveStateToHash()`.

**HTML:** `<select id="themeSelect" onchange="setTheme(this.value)">` in the hero area.

### 6.3 Component CSS Classes

| Class | Purpose |
|---|---|
| `.hero` | Top banner with title, legend, unit toggle, theme select, docs button |
| `.nav-tabs` / `.nav-tab` | Horizontal scrollable tab bar |
| `.section` / `.section.active` | Tab content panels (display:none/block with fadeIn animation) |
| `.compare-grid` / `.compare-col` | Two-column SWMM vs. EPANET comparison cards |
| `.insight` / `.insight.aha` / `.insight.warn` / `.insight.key` | Callout blocks with colored top borders |
| `.map-table` | Styled comparison tables |
| `.equation-block` / `.eq` | Math equation display blocks |
| `.diagram-canvas` | Canvas wrapper |
| `.accordion` / `.accordion-item` | Collapsible sections |
| `.ref-section` / `.ref-eq` / `.ref-code` / `.ref-note` / `.ref-table` / `.ref-toc` | Reference tab styling |

### 6.4 Print Stylesheet

The `@media print` block (starting around line 749) hides all interactive elements (sliders, canvases, nav tabs, unit toggle, theme select), forces all sections visible, strips backgrounds, and applies print-friendly typography. Key behaviors:
- All sections shown simultaneously (`display: block !important`)
- Page breaks avoided inside sections
- Backgrounds removed, text forced to black
- Interactive elements hidden: `#unitToggle`, `#themeSelect`, `#docsBtn`, `canvas`, `input[type="range"]`, etc.

---

## 7. JavaScript Function Inventory

### Core System Functions

| Function | Line | Purpose |
|---|---|---|
| `setTheme(theme)` | ~4088 | Set color theme, validate, sync UI, persist |
| `setUnits(sys)` | ~4101 | Toggle US/SI units globally |
| `applyUnitsToCalc()` | ~4123 | Apply unit labels/conversions to calculator |
| `applyUnitsToFlip()` | ~4152 | Apply unit labels/conversions to Big Flip tab |
| `applyUnitsToFM()` | ~5306 | Apply unit labels/conversions to Force Main tab |
| `activateTab(tab)` | ~4186 | Show selected tab, hide others, update URL hash |
| `saveStateToHash()` | ~5881 | Serialize all app state to URL hash |
| `restoreStateFromHash()` | ~5904 | Restore state from URL hash on page load |
| `debounceSaveHash()` | ~5959 | Debounced hash save (500ms) for slider changes |

### Big Flip Tab

| Function | Line | Purpose |
|---|---|---|
| `setMode(mode)` | ~4346 | Toggle SWMM/EPANET display mode |
| `updateFlip()` | ~4403 | Update pipe cross-section calculations and canvas |
| `drawPipeCanvas()` | ~4549 | Render the pipe cross-section canvas |
| `drawHGL()` | ~4763 | Render the HGL comparison canvas |
| `animateFlip()` | ~4947 | Run animation loop for canvases |

### Calculator Tab

| Function | Line | Purpose |
|---|---|---|
| `updateCalc()` | ~4262 | Compute and display all pipe head loss results |

### Force Main Tab

| Function | Line | Purpose |
|---|---|---|
| `setFmFormula(mode)` | ~4971 | Switch between SWMM5 and full derivation modes |
| `getFmSlope()` | ~4985 | Read slope value from input |
| `cToN_swmm(C, D_ft)` | ~4990 | SWMM5 simplified C→n conversion |
| `cToN_alt(C, D_ft, S0)` | ~4999 | Full derivation C→n conversion (keeps Sf term) |
| `cToN(C, D_ft)` | ~5004 | Dispatch to active formula mode |
| `nToC(n, D_ft)` | ~5008 | Reverse conversion: n→C |
| `sfManning(n, R, V)` | ~5021 | Compute friction slope via Manning's |
| `sfHW(C, R, V)` | ~5029 | Compute friction slope via Hazen-Williams |
| `fmPreset(C, n, name)` | ~5042 | Apply a preset material (new PVC, concrete, etc.) |
| `fmUpdateFromN()` | ~5050 | Update when Manning's n slider changes |
| `fmUpdateFromC()` | ~5061 | Update when H-W C slider changes |
| `fmRender(source)` | ~5072 | Master render function for force main tab |
| `fmDrawChart(n, C, R)` | ~5163 | Draw friction slope comparison chart |
| `updateDW()` | ~5340 | Darcy-Weisbach → Manning's n converter |
| `fm_init()` | ~6050 | Initialize force main slope comparison chart |
| `fm_updateSlopeChart(D, C)` | ~6317 | Update the slope comparison Chart.js instance |
| `fm_runUnitTests()` | ~6335 | Run force main equation unit tests |

### Reference & Docs

| Function | Line | Purpose |
|---|---|---|
| `scrollToRef(evt, el)` | ~4206 | Smooth scroll within Reference tab (prevents hash mutation) |
| `generateDocs()` | ~5389 | Generate downloadable HTML reference document |
| `showDocsTip(show)` | ~5333 | Toggle docs button tooltip |

### Validation Tests

| Function | Line | Purpose |
|---|---|---|
| `assert(condition, msg)` | ~5976 | Test assertion helper |
| `runTests()` | ~5976 | IIFE that runs 10 equation verification tests on page load |

---

## 8. URL Hash Persistence & State Management

The app persists all interactive state in the URL hash, enabling shareable links.

**Format:** `#tab=calculator&units=si&theme=uf&fmC=130&fmN=0.0130&fmD=12&fmS=0.005&fmMode=swmm&cD=12&cL=1000&cQ=2&cN=0.013&cC=130`

**Parameters:**

| Param | Description |
|---|---|
| `tab` | Active tab name |
| `units` | Unit system (`us` or `si`) |
| `theme` | Color theme (omitted when `dark`) |
| `fmC` | Force main H-W C value |
| `fmN` | Force main Manning's n value |
| `fmD` | Force main pipe diameter |
| `fmS` | Force main slope |
| `fmMode` | Force main formula mode (`swmm` or `alt`) |
| `cD` | Calculator pipe diameter |
| `cL` | Calculator pipe length |
| `cQ` | Calculator flow |
| `cN` | Calculator Manning's n |
| `cC` | Calculator H-W C |

**Simple hash support:** A bare hash like `#calculator` is also supported — it just activates that tab.

**Save triggers:** Tab change, slider input (debounced 500ms), theme change, unit toggle.

---

## 9. Unit System (US/SI) Toggle

Two buttons in the hero area: `#btnUS` and `#btnSI`.

**Global variable:** `unitSystem` (`'us'` or `'si'`).

**Mechanism:** `setUnits(sys)` updates the global, highlights the active button, then calls three apply functions:
1. `applyUnitsToFlip()` — Updates Big Flip labels and slider ranges
2. `applyUnitsToCalc()` — Updates Calculator labels, converts values
3. `applyUnitsToFM()` — Updates Force Main labels, converts values

**Conversion constants used internally:**
- 1 foot = 0.3048 meters
- 1 CFS = 0.02832 m³/s
- Manning's φ: 1.486 (US) or 1.0 (SI)
- H-W Cf: 1.318 (US) or 0.8492 (SI)

---

## 10. Force Main Converter — Deep Dive

### Dual Formula Modes

1. **SWMM5 Mode** (`fmFormulaMode = 'swmm'`): Uses the simplified conversion from `forcemain.c`:
   ```
   n = (PHI / Cf) × R^(2/3 - 0.63) / C
   ```
   Drops the friction slope term `Sf^(-0.04)`, treating it as ≈ 1.0.

2. **Full Derivation Mode** (`fmFormulaMode = 'alt'`): Keeps the slope term:
   ```
   n = (PHI / Cf) × R^(0.0367) × Sf^(-0.04) / C
   ```

### Batch Friction Slope Chart

`fmDrawChart()` renders a Chart.js scatter plot comparing Manning friction slope vs. Hazen-Williams friction slope across a velocity range. This visualizes the divergence caused by the different exponents (0.5 vs. 0.54 for slope, 2/3 vs. 0.63 for R).

### Force Main Slope Comparison (Chart.js)

`fm_initSlopeChart()` and `fm_updateSlopeChart()` create a second Chart.js instance showing how the equivalent Manning's n varies with pipe slope for a given C and diameter. This is the chart in the expanded "Slope Sensitivity" section.

### Darcy-Weisbach Converter

`updateDW()` converts Darcy-Weisbach roughness (epsilon) to equivalent Manning's n via the Colebrook-White equation for fully-turbulent flow.

---

## 11. Docs Generator (Downloadable Reference)

`generateDocs()` (line ~5389) builds a complete standalone HTML document containing all 16 reference sections:

1. Fundamental Equations
2. EPANET Solver
3. CFL Condition
4. Force Main: n ↔ C
5. Water Quality
6. Emitter Equation
7. Preissmann Slot
8. Roughness Table
9. Unit Conversions
10. Quick Reference
11. Force Main Setup
12. Decision Guide
13. Convergence
14. Working Example
15. Transient Checklist
16. About EPANET (Dr. Rossman history)

The generated document is a self-contained HTML file with inline CSS, optimized for printing. It is created as a Blob URL and triggered as a download.

The **Reference tab** (`sec-docs`) displays all 16 sections inline with a 2-column table of contents that uses `scrollToRef()` for smooth scrolling without hash mutation.

---

## 12. The Rossman Dedication

The footer (line ~4074) contains a dedication to Dr. Lewis A. Rossman, creator of EPANET at the US EPA (1991–2014). Section 16 of the downloadable docs ("About EPANET — Origins & Open Source Transition") covers:
- Dr. Rossman's role creating EPANET
- The Open Water Analytics (OWA) community transition after his 2014 retirement
- EPANET's history and legacy

---

## 13. Build / Deployment Configuration

### Artifact Config (`artifacts/epanet-swmm/.replit-artifact/artifact.toml`)

This TOML file defines how Replit discovers, runs, and deploys the artifact:

```toml
kind = "web"                    # Artifact type — web application
previewPath = "/"               # URL path in the dev preview pane
title = "EPANET for SWMM5 Experts"
version = "1.0.0"
id = "artifacts/epanet-swmm"   # Unique artifact identifier
router = "path"                 # Path-based routing (vs. subdomain)

[[integratedSkills]]
name = "react-vite"             # Scaffold skill used (despite being pure HTML)
version = "1.0.0"

[[services]]
localPort = 23741               # Port assigned to this artifact
name = "web"
paths = ["/"]                   # Served at root path

[services.development]
run = "pnpm --filter @workspace/epanet-swmm run dev"

[services.env]
PORT = "23741"                  # Passed to Vite config
BASE_PATH = "/"                 # Passed to Vite config as base

[services.production]
build = ["pnpm", "--filter", "@workspace/epanet-swmm", "run", "build"]
publicDir = "artifacts/epanet-swmm/dist/public"   # Static files served in production
serve = "static"                # No server process — static file serving

[[services.production.rewrites]]
from = "/*"                     # SPA fallback rewrite
to = "/index.html"
```

**Key points:**
- In production, the app is served as static files from `dist/public/` — no Node.js server needed.
- The `serve = "static"` directive means Replit's built-in static server handles the files.
- The SPA rewrite (`/* → /index.html`) ensures all paths serve the single HTML file.

### Vite Config (`vite.config.ts`)

- Reads `PORT` and `BASE_PATH` from environment variables (required, set by artifact.toml)
- Uses `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` in development
- Build output: `dist/public/`
- Server: binds to `0.0.0.0`, allows all hosts

### Scripts

```bash
# Development
pnpm --filter @workspace/epanet-swmm run dev

# Production build
pnpm --filter @workspace/epanet-swmm run build

# Preview production build
pnpm --filter @workspace/epanet-swmm run serve
```

### Workflows (Replit)

The app runs as a Replit workflow named `artifacts/epanet-swmm: web` with command:
```
pnpm --filter @workspace/epanet-swmm run dev
```

This workflow is auto-generated from the `artifact.toml` `[services.development].run` field.

Preview path: `/`

---

## 14. Development Workflow

### Running Locally

1. The app is served by Vite's dev server with HMR
2. All changes to `index.html` hot-reload automatically
3. No build step needed during development

### Adding a New Tab

1. Add a `<button class="nav-tab" data-tab="newtab">Label</button>` to the `.nav-tabs` div
2. Add a `<div class="section" id="sec-newtab">` section with content
3. The tab system auto-discovers tabs via `data-tab` attribute — no JS changes needed
4. If the tab has interactive state, add save/restore logic to `saveStateToHash()` / `restoreStateFromHash()`

### Adding New Theme

1. Add a `[data-theme="mytheme"] { ... }` CSS block overriding the CSS variables
2. Add `<option value="mytheme">My Theme</option>` to the `#themeSelect` dropdown
3. Add `'mytheme'` to the `VALID_THEMES` array (line ~4087)

### Modifying Equations

All equation constants use US Customary internally. The display layer handles conversion via `applyUnitsTo*()` functions. If you change equation logic, update the console validation tests in `runTests()` (line ~5976).

---

## 15. Console Validation Tests

On page load, the app runs 10 equation verification tests via an IIFE `runTests()`. Results are logged to the browser console with pass/fail coloring.

**Tests cover:**
- `cToN_swmm()` — C→n conversion (SWMM5 mode)
- `cToN_alt()` — C→n conversion (full derivation)
- `nToC()` — n→C reverse conversion
- `sfManning()` — Manning friction slope
- `sfHW()` — Hazen-Williams friction slope
- Roundtrip consistency (C→n→C)

**Known issue:** Test `cToN_swmm(130, 2.0) = 0.00846 should be ~0.0109` — this is a known discrepancy in the SWMM5 simplified formula for large diameters. The test expectation may need review. This does NOT affect simulation accuracy as SWMM5 uses H-W directly during force main routing.

---

## 16. Known Issues & Future Considerations

### Known Issues

1. **Test failure on large-diameter SWMM5 conversion:** The console test at line ~5976 reports `FAIL: cToN_swmm(130, 2.0) = 0.00846 should be ~0.0109`. This fires every page load. The expected value in the assertion may need recalibration — the computed value matches the actual SWMM5 `forcemain_getEquivN()` formula. This does NOT affect simulation accuracy as SWMM5 uses H-W directly during force main routing.

2. **Unused React/Radix devDependencies:** The `package.json` lists ~30 Radix UI and React packages as devDependencies (lines 13–75). These are leftover from the monorepo scaffold template and are not imported anywhere in `index.html`. They can be safely removed to reduce `node_modules` size.

### Future Considerations

- **Mobile responsiveness:** The app works on tablets but some tables overflow on narrow phones. The tab bar scrolls horizontally.
- **Offline/PWA:** The app could be made into a PWA with a service worker, since it's self-contained. Chart.js and Google Fonts are the only external dependencies.
- **Accessibility:** ARIA attributes are present on tabs, sliders, and accordions. Screen reader testing has not been done.
- **Performance:** The single-file architecture means the entire ~6,400 lines load at once. For the target audience (engineers at desktops), this is fine. If the file grows significantly, consider code splitting.

---

## 17. Task History

| Task | Description | Status |
|---|---|---|
| #1 | Initial app build — 11 tabs, canvases, calculators, force main converter | Complete |
| #2 | Footer dedication to Dr. Lewis A. Rossman | Complete |
| #3 | Force Main tab enhancements — slope chart, setup checklist, system context, flow regime | Complete |
| #4 | Section 16 in downloadable docs — Dr. Rossman history, OWA transition | Complete |
| #5 | Inline Reference tab with all 16 sections, 2-column TOC, scrollToRef() | Complete |
| #6 | This HANDOVER.md document | Complete |
| — | Theme system — 5 themes (Dark, UF, OSU, Auburn, EPA) via CSS custom properties | Complete |
| — | First Principles tab — EPANET→SWMM5 deconstruction from attached markdown | Complete |
| — | Docs button changed from download to tab navigation | Complete |

---

*End of handover document.*
