# HANDOVER.md — EPANET for SWMM5 Experts ("The Rosetta Stone")

> **Version:** 1.1 · April 2026
> **Author:** Robert E. Dickinson · [SWMM5.org](https://www.swmm5.org) · [LinkedIn](https://www.linkedin.com/in/robertdickinson/)

---

## 1. App Overview & Purpose

A self-contained, single-page interactive web application that maps every SWMM5 concept to its EPANET equivalent. Designed for stormwater engineers with deep SWMM5 experience who need to understand pressurized water distribution modeling (EPANET).

The app is pure HTML/CSS/JS — no React, no build-time framework. It is served as a static `index.html` by Vite in development and deployed as a static site.

**Key stats (as of April 2026):**
- ~13,400 lines in a single `index.html`
- 32 interactive tabs (including EPANET Guide with 22 accordion sections)
- 3 animated `<canvas>` elements + 5 Chart.js charts (fire flow, PDA demand, pattern bar chart, pipe aging dual-axis, pump energy)
- 40+ interactive range sliders
- 8 calculators/simulators (pipe head loss, force main n↔C, treatment editor, fire flow, pump energy, PDA demand, Joukowsky water hammer, skeletonization)
- US/SI unit toggle
- 11 color themes
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
├── index.html                    # The entire application (~13,400 lines)
├── vite.config.ts                # Vite configuration (reads PORT and BASE_PATH env vars)
├── package.json                  # Package config (@workspace/epanet-swmm)
├── tsconfig.json                 # TypeScript config (for Vite config only)
└── .replit-artifact/
    └── artifact.toml             # Replit artifact config (ports, build, deploy, preview path)
```

The `index.html` file contains everything: all CSS, all HTML, and all JavaScript. This is intentional — it makes the app fully self-contained and trivially portable.

---

## 4. Tabs — Complete Inventory

The app has 32 tabs, controlled by `data-tab` attributes on nav buttons and matching `id="sec-{name}"` section divs.

| # | Tab Label | `data-tab` | Section ID | Nav Group | Description |
|---|---|---|---|---|---|
| 1 | The Big Flip | `overview` | `sec-overview` | START HERE | Core concept: gravity (SWMM) → pressure (EPANET). Interactive pipe cross-section canvas, water depth slider, mode toggle. |
| 2 | Objects Map | `objects` | `sec-objects` | START HERE | Side-by-side mapping of SWMM5 objects to EPANET equivalents (junctions→nodes, conduits→pipes, etc.) |
| 3 | Topology | `topology` | `sec-topology` | START HERE | Network topology comparison: dendritic trees (SWMM5) vs looped grids (EPANET). SVG network diagrams. |
| 4 | First Principles | `firstprinciples` | `sec-firstprinciples` | START HERE | First-principles deconstruction: 25 inherited EPANET assumptions, 10 bedrock truths, rebuilt SWMM5 mental model. |
| 5 | Demands | `demands` | `sec-demands` | HYDRAULICS | SWMM5 lateral inflows vs. EPANET demand patterns. Demand categories, pattern multipliers. |
| 6 | Demand Alloc | `demand` | `sec-demand` | HYDRAULICS | Demand allocation methods (unit length, service connections, land use, meter data). Interactive PDA vs DDA chart. |
| 7 | Hydraulics | `hydraulics` | `sec-hydraulics` | HYDRAULICS | Manning's vs. Hazen-Williams vs. Darcy-Weisbach. Full Saint-Venant equations with term-by-term breakdown. |
| 8 | The Solver | `solver` | `sec-solver` | HYDRAULICS | Dynamic wave (SWMM5) vs. Gradient Algorithm (EPANET). CFL condition with worked examples. Preissmann slot. |
| 9 | Patterns | `patterns` | `sec-patterns` | HYDRAULICS | Diurnal pattern editor with 4 presets (residential, commercial, industrial, combined wet). Click-to-edit bar chart. |
| 10 | Valves | `valves` | `sec-valves` | COMPONENTS | EPANET valve types deep dive (PRV, PSV, PBV, FCV, TCV, GPV). Interactive valve simulator. |
| 11 | Force Mains | `forcemains` | `sec-forcemains` | COMPONENTS | Force Main Converter v2.0. Dual-mode n↔C conversion. Darcy-Weisbach. Batch chart. Setup checklist. |
| 12 | Pump Energy | `pumpenergy` | `sec-pumpenergy` | COMPONENTS | Pump energy & cost calculator. WHP, BHP, kW, daily/annual cost. Affinity laws. |
| 13 | Fire Flow | `fireflow` | `sec-fireflow` | COMPONENTS | Fire flow analysis calculator. Available fire flow from hydrant test data. ISO rating. |
| 14 | Rules & Controls | `controls` | `sec-controls` | COMPONENTS | SWMM5 control rules vs. EPANET simple/rule-based controls. PID controllers. |
| 15 | Leakage | `leakage` | `sec-leakage` | COMPONENTS | Leakage modeling: emitter-based approach, pressure-dependent leakage. |
| 16 | Water Quality | `quality` | `sec-quality` | QUALITY | SWMM5 buildup/washoff vs. EPANET reaction kinetics. Decoupled WQ transport. |
| 17 | Treatment | `treatment` | `sec-treatment` | QUALITY | Treatment expression editor with real-time validation, 10 pollutant presets, live Chart.js simulation. TX IIFE namespace. |
| 18 | Pipe Aging | `aging` | `sec-aging` | QUALITY | Pipe aging and condition assessment. Dual-axis chart showing C-factor decay and Manning's n increase. |
| 19 | Design Criteria | `designcrit` | `sec-designcrit` | MODELING | Design criteria comparison: velocity limits, pressure requirements, fire flow standards. |
| 20 | Calibration | `calibration` | `sec-calibration` | MODELING | Calibration workflow comparison: sequential (SWMM5) vs simultaneous (EPANET). |
| 21 | Skeletonize | `skeleton` | `sec-skeleton` | MODELING | Skeletonization simulator with pipe count and minimum diameter sliders. |
| 22 | Transients | `transient` | `sec-transient` | MODELING | Water hammer / transient analysis. Joukowsky calculator. Sudden vs slow closure detection. |
| 23 | File Format | `fileformat` | `sec-fileformat` | DATA & TOOLS | .INP file comparison. SWMM5 sections vs. EPANET sections, with annotated examples. |
| 24 | Calculator | `calculator` | `sec-calculator` | DATA & TOOLS | Interactive pipe head loss calculator with Manning's/H-W/D-W. Dual unit systems. |
| 25 | GIS | `gis` | `sec-gis` | DATA & TOOLS | GIS integration comparison. Shapefile workflows, attribute mapping. |
| 26 | SCADA/RT | `scada` | `sec-scada` | DATA & TOOLS | SCADA and real-time modeling comparison. EPANET-RTX integration. |
| 27 | Interop | `interop` | `sec-interop` | DATA & TOOLS | Interoperability and file exchange between SWMM5 and EPANET. |
| 28 | Reporting | `reporting` | `sec-reporting` | DATA & TOOLS | Output reporting comparison. Binary output files, time series extraction. |
| 29 | Gotchas | `gotchas` | `sec-gotchas` | REFERENCE | Common mistakes when crossing between SWMM5 and EPANET. Convergence troubleshooting. |
| 30 | Which Tool? | `whichtool` | `sec-whichtool` | REFERENCE | Decision flowchart: when to use SWMM5 vs. EPANET. SVG flowchart with decision nodes. |
| 31 | EPANET Guide | `guide` | `sec-guide` | REFERENCE | Comprehensive EPANET modeling guide with 22 accordion sections (see §4.1 below). |
| 32 | Reference | `docs` | `sec-docs` | REFERENCE | All 16 reference sections displayed inline with 2-column TOC and downloadable document. |

### 4.1 EPANET Guide Tab — Accordion Sections

The EPANET Guide tab (`sec-guide`) contains 22 expandable accordion sections covering the full spectrum from first principles to professional practice:

| # | Section Title | Content |
|---|---|---|
| 1 | What is Hydraulic Modeling? | Definition, why we model (table), modeling hierarchy (4 levels) |
| 2 | Why Theory Matters in EPANET Practice | Black-box anti-pattern, real-world consequences table |
| 3 | Core Concepts: The Physics EPANET Solves | Conservation of mass (continuity), conservation of energy (loop equation), inputs vs outputs table |
| 4 | Steady-State Analysis in EPANET | When to use, when NOT to use, .inp TIMES section |
| 5 | Extended Period Simulation (EPS) | EPS loop diagram, 24-hour results table, repeatability test, timestep settings |
| 6 | Transient Analysis (Water Hammer) | EPANET limitations, when transient analysis is required, dedicated software list |
| 7 | EPANET Network Components | Nodes (junctions, reservoirs, tanks) and links (pipes, pumps, valves) with properties tables, ASCII schematic |
| 8 | The Global Gradient Algorithm | Todini & Pilati (1988) GGA, matrix formulation, convergence example |
| 9 | Head Loss Formulas | Hazen-Williams (with C-factor table), Darcy-Weisbach (Colebrook-White), comparison table |
| 10 | Pressure, Head & Elevation | HGL relationships, pressure conversions, typical standards table |
| 11 | Demand Modeling | .inp format, demand categories table, spatial allocation methods |
| 12 | Pumps & Energy | Pump curves, operating point, energy/cost formulas, controls and rules syntax |
| 13 | Valves & Pressure Management | PRV operating modes, valve types table (PRV, FCV, TCV) |
| 14 | Water Quality Modeling | Chemical concentration, water age, source tracing, decay equations |
| 15 | Building Your First EPANET Model | 7-step workflow table, minimum viable .inp file (complete example) |
| 16 | Calibration Fundamentals | Calibration targets table (acceptable/good/excellent), priority-ordered adjustment list |
| 17 | Common Mistakes & Troubleshooting | System Unbalanced, negative pressures, pump delivery errors — each with diagnosis steps |
| 18 | The EPANET .inp File Format | Complete section inventory with descriptions |
| 19 | Tools & Ecosystem | Free/open-source tools, commercial tools with pricing, Python libraries |
| 20 | James's Rules for Responsible Modeling | 9 key rules mapped to EPANET practice standards |
| 21 | Model Report Checklist | 8-category checklist: Purpose, Data Sources, Construction, Calibration, Validation, Scenarios, Uncertainty, File Management |
| 22 | Further Reading & Resources | Theory references, practice standards, online resources |

---

## 5. Interactive Elements

### 5.1 Animated Canvases (3)

| Canvas | Location | Function | Key JS |
|---|---|---|---|
| Pipe Cross-Section | Tab 1 (Big Flip) | Shows SWMM partial-fill vs. EPANET full-pipe side by side. Animated water level, air space, dimension labels. | `drawPipeCanvas()` |
| HGL Blend | Tab 1 (Big Flip) | Hydraulic Grade Line comparison between gravity and pressure systems. | `drawHGL()` |
| Friction Slope Chart | Tab 11 (Force Mains) | Manning vs. Hazen-Williams friction slope divergence chart. Real-time update from sliders. | `fmDrawChart()` |

### 5.2 Interactive Sliders (17+)

Sliders use native `<input type="range">` with `oninput` handlers. All respect the US/SI unit system. Key sliders include:
- Water depth (d/D ratio) in Big Flip tab
- Manning's n in Big Flip tab
- Pipe diameter, length, flow, roughness in Calculator tab
- Hazen-Williams C, Manning's n, pipe diameter, slope in Force Mains tab

### 5.3 Calculators

**Pipe Head Loss Calculator** (Tab 24, `sec-calculator`):
- Inputs: diameter, length, flow, Manning's n, H-W C
- Outputs: velocity, Reynolds number, head loss (Manning, H-W, D-W), friction slope
- JS: `updateCalc()`

**Force Main Converter** (Tab 11, `sec-forcemains`):
- Dual formula modes: SWMM5 simplified (`cToN_swmm`) vs. full derivation (`cToN_alt`)
- Bidirectional: C→n and n→C
- Includes Darcy-Weisbach → Manning's n converter
- Batch friction slope comparison chart
- JS: `fmRender()`, `cToN_swmm()`, `cToN_alt()`

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
| `--accent-yellow` | Secondary accent |
| `--epanet-blue` | EPANET blue accent |
| `--text-primary` / `--text-muted` / `--text-dim` | Text hierarchy |
| `--font-body` | Body font (Outfit) |
| `--font-mono` | Monospace font (JetBrains Mono) |
| `--bg-glow-1` / `--bg-glow-2` | Background radial gradient colors |
| `--gravity-purple` | Gravity system accent |

### 6.2 Theme System (11 Themes)

Themes are defined as `[data-theme="X"]` selectors that override the CSS variables. Each theme must define ALL 19 CSS variables listed above.

**VALID_THEMES array:** `['dark','uf','osu','auburn','epa','vt','gt','um','purdue','midnight','autodesk']`

| Theme | `data-theme` | Colors |
|---|---|---|
| Dark (default) | `dark` | Navy/dark blue, cyan + amber accents |
| UF Gators | `uf` | Deep navy, UF blue (#0021A5) + Gator orange (#FA4616) |
| Oregon State | `osu` | Dark (#0d0d0d), Beaver orange (#DC4405) + gray |
| Auburn | `auburn` | Navy (#0d1020), Auburn navy (#03244d) + orange (#DD550C) |
| EPA | `epa` | Dark blue-gray, EPA blue (#0071BC) + EPA green (#2E8B57) |
| Virginia Tech | `vt` | Dark maroon (#0d0808), VT maroon (#861F41) + Chicago orange (#E5751F) |
| Georgia Tech | `gt` | Dark navy (#0a0a14), Tech Gold (#B3A369) + white |
| Michigan | `um` | Dark navy (#0a0e18), Maize (#FFCB05) + Michigan Blue (#00274C) |
| Purdue | `purdue` | Dark (#0d0d0d), Boilermaker Gold (#CFB991) + Purdue Black (#000000) |
| Midnight | `midnight` | Deep indigo (#0a0a1a), Indigo (#6366f1) + pink (#f472b6) |
| Autodesk | `autodesk` | Pure black (#000000), Autodesk Yellow (#FFFF00) + orange (#F09D4F) |

**JS:** `setTheme(theme)` validates against `VALID_THEMES` whitelist. Updates `data-theme` attribute on `<html>`, syncs the `<select>` dropdown, and calls `saveStateToHash()`.

**HTML:** `<select id="themeSelect" onchange="setTheme(this.value)">` in the hero area.

### 6.3 Component CSS Classes

| Class | Purpose |
|---|---|
| `.hero` | Top banner with title, legend, unit toggle, theme select, docs button |
| `.nav-tabs` / `.nav-tab` | Horizontal scrollable tab bar |
| `.nav-group` / `.nav-group-label` | Tab grouping with labels (START HERE, HYDRAULICS, etc.) |
| `.section` / `.section.active` | Tab content panels (display:none/block with fadeIn animation) |
| `.compare-grid` / `.compare-col` | Two-column SWMM vs. EPANET comparison cards |
| `.insight` / `.insight.aha` / `.insight.warn` / `.insight.key` | Callout blocks with colored top borders |
| `.map-table` | Styled comparison tables |
| `.equation-block` / `.eq` | Math equation display blocks |
| `.diagram-canvas` | Canvas wrapper |
| `.accordion` / `.accordion-item` | Collapsible sections (max-height: 5000px) |
| `.ref-section` / `.ref-eq` / `.ref-code` / `.ref-note` / `.ref-table` / `.ref-toc` | Reference tab styling |
| `.rq-btn` / `.rq-btn.selected` | Toggle buttons (e.g., formula mode) |

### 6.4 Print Stylesheet

The `@media print` block hides all interactive elements (sliders, canvases, nav tabs, unit toggle, theme select), forces all sections visible, strips backgrounds, and applies print-friendly typography. Key behaviors:
- All sections shown simultaneously (`display: block !important`)
- Page breaks avoided inside sections
- Backgrounds removed, text forced to black
- Interactive elements hidden: `#unitToggle`, `#themeSelect`, `#docsBtn`, `canvas`, `input[type="range"]`, etc.

---

## 7. JavaScript Function Inventory

### Core System Functions

| Function | Purpose |
|---|---|
| `setTheme(theme)` | Set color theme, validate, sync UI, persist |
| `setUnits(sys)` | Toggle US/SI units globally |
| `applyUnitsToCalc()` | Apply unit labels/conversions to calculator |
| `applyUnitsToFlip()` | Apply unit labels/conversions to Big Flip tab |
| `applyUnitsToFM()` | Apply unit labels/conversions to Force Main tab |
| `activateTab(tab)` | Show selected tab, hide others, update URL hash |
| `saveStateToHash()` | Serialize all app state to URL hash |
| `restoreStateFromHash()` | Restore state from URL hash on page load |
| `debounceSaveHash()` | Debounced hash save (500ms) for slider changes |

### Big Flip Tab

| Function | Purpose |
|---|---|
| `setMode(mode)` | Toggle SWMM/EPANET display mode |
| `updateFlip()` | Update pipe cross-section calculations and canvas |
| `drawPipeCanvas()` | Render the pipe cross-section canvas |
| `drawHGL()` | Render the HGL comparison canvas |
| `animateFlip()` | Run animation loop for canvases |

### Calculator Tab

| Function | Purpose |
|---|---|
| `updateCalc()` | Compute and display all pipe head loss results |

### Force Main Tab

| Function | Purpose |
|---|---|
| `setFmFormula(mode)` | Switch between SWMM5 and full derivation modes |
| `getFmSlope()` | Read slope value from input |
| `cToN_swmm(C, D_ft)` | SWMM5 simplified C→n conversion |
| `cToN_alt(C, D_ft, S0)` | Full derivation C→n conversion (keeps Sf term) |
| `cToN(C, D_ft)` | Dispatch to active formula mode |
| `nToC(n, D_ft)` | Reverse conversion: n→C |
| `sfManning(n, R, V)` | Compute friction slope via Manning's |
| `sfHW(C, R, V)` | Compute friction slope via Hazen-Williams |
| `fmPreset(C, n, name)` | Apply a preset material (new PVC, concrete, etc.) |
| `fmUpdateFromN()` | Update when Manning's n slider changes |
| `fmUpdateFromC()` | Update when H-W C slider changes |
| `fmRender(source)` | Master render function for force main tab |
| `fmDrawChart(n, C, R)` | Draw friction slope comparison chart |
| `updateDW()` | Darcy-Weisbach → Manning's n converter |
| `fm_init()` | Initialize force main slope comparison chart |
| `fm_updateSlopeChart(D, C)` | Update the slope comparison Chart.js instance |
| `fm_runUnitTests()` | Run force main equation unit tests |

### Other Interactive Tabs

| Function | Purpose |
|---|---|
| `updatePumpEnergy()` | Pump energy & cost calculator |
| `updateFireFlow()` | Fire flow analysis calculator |
| `updateValveSim()` | Valve simulator |
| `trUpdate()` | Transient/water hammer calculator |
| `agingUpdate()` | Pipe aging chart update |

### Reference & Docs

| Function | Purpose |
|---|---|
| `scrollToRef(evt, el)` | Smooth scroll within Reference tab (prevents hash mutation) |
| `generateDocs()` | Generate downloadable HTML reference document |
| `showDocsTip(show)` | Toggle docs button tooltip |

### Validation Tests

| Function | Purpose |
|---|---|
| `assert(condition, msg)` | Test assertion helper |
| `runTests()` | IIFE that runs 10 equation verification tests on page load |

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

**CRITICAL `el` scoping rule:** `const el = (id) => document.getElementById(id)` is ONLY defined inside `applyUnitsToCalc()`, `applyUnitsToFM()`, and `applyUnitsToFlip()`. ALL other code must use `document.getElementById()` directly.

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

`generateDocs()` builds a complete standalone HTML document containing all 16 reference sections:

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

The footer contains a dedication to Dr. Lewis A. Rossman, creator of EPANET at the US EPA (1991–2014). Section 16 of the downloadable docs ("About EPANET — Origins & Open Source Transition") covers:
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

Preview path: `/`

---

## 14. Development Workflow

### Running Locally

1. The app is served by Vite's dev server with HMR
2. All changes to `index.html` hot-reload automatically
3. No build step needed during development

### Adding a New Tab

1. Add a `<button class="nav-tab" data-tab="newtab">Label</button>` to the appropriate `.nav-group` div
2. Add a `<div class="section" id="sec-newtab">` section with content
3. The tab system auto-discovers tabs via `data-tab` attribute — no JS changes needed
4. If the tab has interactive state, add save/restore logic to `saveStateToHash()` / `restoreStateFromHash()`

### Adding New Theme

1. Add a `[data-theme="mytheme"] { ... }` CSS block overriding ALL 19 CSS variables (see §6.1)
2. Add `<option value="mytheme">My Theme</option>` to the `#themeSelect` dropdown
3. Add `'mytheme'` to the `VALID_THEMES` array in the JavaScript section

### Modifying Equations

All equation constants use US Customary internally. The display layer handles conversion via `applyUnitsTo*()` functions. If you change equation logic, update the console validation tests in `runTests()`.

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

1. **Test failure on large-diameter SWMM5 conversion:** The console test reports `FAIL: cToN_swmm(130, 2.0) = 0.00846 should be ~0.0109`. This fires every page load. The computed value matches the actual SWMM5 `forcemain_getEquivN()` formula.

2. **Unused React/Radix devDependencies:** The `package.json` lists ~30 Radix UI and React packages as devDependencies. These are leftover from the monorepo scaffold template and are not imported anywhere in `index.html`. They can be safely removed to reduce `node_modules` size.

### Future Considerations

- **Mobile responsiveness:** The app works on tablets but some tables overflow on narrow phones. The tab bar scrolls horizontally.
- **Offline/PWA:** The app could be made into a PWA with a service worker, since it's self-contained. Chart.js and Google Fonts are the only external dependencies.
- **Accessibility:** ARIA attributes are present on tabs, sliders, and accordions. Screen reader testing has not been done.
- **Performance:** The single-file architecture means the entire ~13,400 lines load at once. For the target audience (engineers at desktops), this is fine.

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
| #8 | Add Walski history anecdote to EPANET app | Complete |
| — | Theme system — 11 themes (Dark, UF, Oregon State, Auburn, EPA, VT, GT, Michigan, Purdue, Midnight, Autodesk) | Complete |
| — | First Principles tab — EPANET→SWMM5 deconstruction from attached markdown | Complete |
| — | Docs button changed from download to tab navigation | Complete |
| — | 12 new deep-dive tabs (Demand Alloc, Topology, Design Criteria, Patterns, Calibration, Skeletonize, SCADA/RT, Interop, GIS, Reporting, Pipe Aging, Transients) | Complete |
| — | Leakage tab — emitter-based leakage modeling | Complete |
| — | EPANET Guide tab — 22 accordion sections covering hydraulic modeling, GGA, head loss formulas, calibration, troubleshooting, James's Rules, Model Report Checklist | Complete |
| — | Bug fixes: `--epanet-blue` + `--accent-yellow` in all themes, `.rq-btn.selected` color, accordion max-height 5000px, dead assignment removal | Complete |

---

*End of handover document.*
