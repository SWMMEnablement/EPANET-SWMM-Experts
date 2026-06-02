# EPANET for SWMM5 Experts  
## The Rosetta Stone

A self-contained, interactive web application that maps **SWMM5 concepts** to their **EPANET equivalents**, built specifically for stormwater engineers who already know SWMM5 and want to understand pressurized water distribution modeling in EPANET. [page:43]

**Repository:** [SWMMEnablement/EPANET-SWMM-Experts](https://github.com/SWMMEnablement/EPANET-SWMM-Experts)  
**Replit app:** [replit.com/@robertdickinson/EPANET-SWMM-Experts](https://replit.com/@robertdickinson/EPANET-SWMM-Experts)  

---

## Overview

EPANET for SWMM5 Experts is a single-page educational application that teaches the mental shift from **gravity-driven urban drainage modeling** to **pressure-driven water distribution modeling**. The handover explicitly describes its central idea as **“The Big Flip”**: moving from SWMM’s partially full, free-surface, dynamic-wave world into EPANET’s full-pipe, pressure-head, and demand-driven framework. [page:43]

The app is intentionally built as a **pure HTML/CSS/JavaScript** experience with no frontend framework in the deployable artifact. It is served as a static site by Vite, which keeps the project portable, self-contained, and easy to host. [page:43][page:44]

---

## Project scale

As documented in `HANDOVER.md`, the app includes the following major elements: [page:43]

- ~13,400 lines in a single `index.html`. [page:43]
- 32 interactive tabs. [page:43]
- 22 accordion sections inside the EPANET Guide tab. [page:43]
- 3 animated canvases. [page:43]
- 5 Chart.js charts. [page:43]
- 40+ interactive sliders. [page:43]
- 8 calculators and simulators. [page:43]
- US/SI unit toggle. [page:43]
- 11 color themes. [page:43]
- URL hash state persistence for shareable app state. [page:43]
- A print stylesheet and downloadable reference-document generator. [page:43]

This makes the application much more than a glossary or simple comparison page. It is a large, teaching-oriented engineering reference environment built for exploration, calculation, and cross-domain understanding. [page:43]

---

## Why this app exists

SWMM5 and EPANET are both network-modeling tools, but they solve fundamentally different problems. SWMM5 is oriented toward rainfall-runoff, dynamic hydraulics, surcharge, storage, flooding, and urban drainage systems, while EPANET is focused on pressurized water-distribution networks, nodal demands, pumps, valves, tanks, and water quality in closed conduits. [page:43]

This project exists to bridge that conceptual gap for experienced SWMM users. Instead of assuming the user is a novice, it treats SWMM expertise as the starting point and explains EPANET by analogy, contrast, and side-by-side engineering logic. [page:43]

---

## Core capabilities

The application combines conceptual comparison, engineering references, calculators, visualizations, and professional practice guidance in a single static page. Major capabilities include: [page:43]

- Side-by-side mapping of SWMM5 objects and EPANET equivalents. [page:43]
- Worked comparisons of governing hydraulics, solver behavior, head loss formulas, demands, controls, and water quality. [page:43]
- Interactive calculators for pipe head loss, force main conversion, pump energy, fire flow, transient response, and more. [page:43]
- A comprehensive EPANET Guide with 22 expandable sections. [page:43]
- Downloadable printable reference documentation generated directly in the browser. [page:43]

---

## Full tab inventory

The application has **32 tabs**, grouped into five navigation groups: **START HERE**, **HYDRAULICS**, **COMPONENTS**, **QUALITY**, **MODELING**, **DATA & TOOLS**, and **REFERENCE**. [page:43]

| # | Tab | Purpose |
|---|---|---|
| 1 | The Big Flip | Core concept: gravity systems vs. pressure systems, with animated cross-sections and HGL views. [page:43] |
| 2 | Objects Map | Maps SWMM5 objects to EPANET equivalents. [page:43] |
| 3 | Topology | Compares dendritic drainage networks with looped water-distribution systems. [page:43] |
| 4 | First Principles | Rebuilds the engineering mental model from SWMM assumptions to EPANET assumptions. [page:43] |
| 5 | Demands | Lateral inflows in SWMM vs. demand patterns in EPANET. [page:43] |
| 6 | Demand Alloc | Pressure-driven and demand-driven demand allocation concepts. [page:43] |
| 7 | Hydraulics | Manning, Hazen-Williams, Darcy-Weisbach, and Saint-Venant comparisons. [page:43] |
| 8 | The Solver | Dynamic wave vs. Global Gradient Algorithm, with CFL and Preissmann references. [page:43] |
| 9 | Patterns | Diurnal demand-pattern editor with presets and editable bars. [page:43] |
| 10 | Valves | Interactive exploration of PRV, PSV, PBV, FCV, TCV, and GPV behavior. [page:43] |
| 11 | Force Mains | Dual-mode force main roughness conversion and slope charts. [page:43] |
| 12 | Pump Energy | Pump horsepower, efficiency, energy, and annual cost calculator. [page:43] |
| 13 | Fire Flow | Fire-flow analysis and hydrant-test interpretation. [page:43] |
| 14 | Rules & Controls | SWMM rules vs. EPANET controls and PID-like logic. [page:43] |
| 15 | Leakage | Pressure-dependent leakage and emitter concepts. [page:43] |
| 16 | Water Quality | SWMM buildup/washoff vs. EPANET reaction and transport. [page:43] |
| 17 | Treatment | Treatment-expression editor with live validation and simulation. [page:43] |
| 18 | Pipe Aging | Dual-axis chart for C-factor decline and Manning’s n increase. [page:43] |
| 19 | Design Criteria | Pressure, velocity, and fire-flow design comparisons. [page:43] |
| 20 | Calibration | Sequential vs. simultaneous calibration workflows. [page:43] |
| 21 | Skeletonize | Network simplification and skeletonization simulator. [page:43] |
| 22 | Transients | Water-hammer and Joukowsky calculator. [page:43] |
| 23 | File Format | SWMM `.inp` vs. EPANET `.inp` structure comparison. [page:43] |
| 24 | Calculator | Pipe head loss calculator with multiple formulas and units. [page:43] |
| 25 | GIS | GIS workflows and attribute mapping comparisons. [page:43] |
| 26 | SCADA/RT | Real-time and SCADA-related workflow discussion. [page:43] |
| 27 | Interop | Interoperability and exchange between SWMM5 and EPANET. [page:43] |
| 28 | Reporting | Reporting, binary output, and time-series extraction concepts. [page:43] |
| 29 | Gotchas | Common mistakes and troubleshooting guidance. [page:43] |
| 30 | Which Tool? | Decision flowchart for choosing SWMM5 or EPANET. [page:43] |
| 31 | EPANET Guide | Full accordion-based learning guide with 22 sections. [page:43] |
| 32 | Reference | Inline reference sections plus downloadable docs. [page:43] |

---

## EPANET Guide

One of the largest sections of the app is the **EPANET Guide** tab, which contains **22 accordion sections** that move from conceptual basics to practice standards. Topics include hydraulic modeling fundamentals, the Global Gradient Algorithm, head-loss formulas, pressure and elevation, demand modeling, pumps, valves, water quality, calibration, troubleshooting, file format structure, tools and ecosystem, responsible modeling, model reporting, and further reading. [page:43]

The handover positions this tab as a full professional-learning module rather than a short FAQ. It is especially useful for experienced SWMM users who need a coherent, structured entry point into EPANET theory and workflow. [page:43]

---

## Interactive elements

### Animated canvases

The app includes **3 animated canvases**: a pipe cross-section comparison, an HGL comparison, and a friction-slope chart in the Force Mains tab. These are driven by JavaScript functions such as `drawPipeCanvas()`, `drawHGL()`, and `fmDrawChart()`. [page:43]

### Sliders and controls

The app uses native range inputs with live `oninput` behavior, including sliders for water depth, roughness, diameter, slope, flow, and several other engineering quantities. All of these respect the global US/SI unit system. [page:43]

### Chart.js charts

The handover identifies **5 Chart.js charts**, including visualizations for fire flow, pressure-dependent demand, demand patterns, pipe aging, and pump energy. These charts turn static engineering relationships into adjustable visual tools. [page:43]

---

## Calculators and simulators

The application includes **8 calculators/simulators**, several of which are significant enough to stand on their own as teaching tools. [page:43]

| Tool | Function |
|---|---|
| Pipe Head Loss Calculator | Computes velocity, Reynolds number, head loss by Manning, Hazen-Williams, and Darcy-Weisbach, plus friction slope. [page:43] |
| Force Main Converter | Converts between Hazen-Williams C and Manning’s n, with SWMM-style and full-derivation modes. [page:43] |
| Darcy-Weisbach Converter | Converts equivalent roughness into Manning’s n using Colebrook-White assumptions. [page:43] |
| Pump Energy Calculator | Estimates horsepower, kW, daily and annual energy cost, and affinity-law behavior. [page:43] |
| Fire Flow Calculator | Evaluates available fire flow using hydrant-test logic. [page:43] |
| Treatment Editor | Real-time treatment-expression editor with validation and simulation. [page:43] |
| Water Hammer / Joukowsky Calculator | Evaluates transient surge conditions and closure-rate sensitivity. [page:43] |
| Skeletonization Simulator | Illustrates simplification of water-distribution networks. [page:43] |

The **Force Main Converter** is treated in special depth in the handover, including two formula modes: a simplified SWMM5-style version and a full-derivation version that preserves the friction-slope term. This is one of the app’s most technically distinctive sections. [page:43]

---

## Force main deep dive

The force-main section includes dual conversion modes between **Hazen-Williams C** and **Manning’s n**. In **SWMM5 mode**, the formula drops the friction-slope term, while in **full derivation mode**, the slope term is preserved, allowing users to see how that assumption affects equivalent roughness. [page:43]

The app also includes a friction-slope comparison chart and a slope-sensitivity chart, both of which help explain where Manning and Hazen-Williams diverge. This makes the tab particularly useful for engineers working across force-main formulations and conversion assumptions. [page:43]

---

## Docs generator

The **Reference** area includes a downloadable document generator implemented entirely in the browser. The `generateDocs()` function builds a standalone printable HTML document containing **16 reference sections**, including equations, solver notes, CFL guidance, roughness tables, force-main setup, convergence notes, transient checklists, and a history section on EPANET and Dr. Rossman. [page:43]

Because the output is a self-contained HTML file with inline styles, it can be used as a portable engineering handout or offline reference. The main app also includes a print stylesheet that hides interactive controls and shows all sections at once in print mode. [page:43]

---

## Themes and units

The app supports **11 themes**: `dark`, `uf`, `osu`, `auburn`, `epa`, `vt`, `gt`, `um`, `purdue`, `midnight`, and `autodesk`. These are implemented through CSS custom properties and a `data-theme` attribute on the root HTML element. [page:43]

It also supports a global **US/SI unit toggle**, with conversions applied to the Big Flip tab, the general calculator, and the force-main tools. The handover specifically documents internal constants such as 1 foot = 0.3048 meters and 1 cfs = 0.02832 m³/s. [page:43]

---

## URL state persistence

A distinctive feature of the app is **URL hash persistence**. The app stores active tab, unit system, theme, and calculator inputs in the URL hash, allowing users to share direct links to specific engineering views and parameter combinations. [page:43]

For example, the hash can preserve settings such as `tab=calculator`, `units=si`, theme choice, force-main values, and pipe-calculator inputs. A simple hash like `#calculator` is also supported for direct tab activation. [page:43]

---

## Tech stack

Although the app itself is pure HTML/CSS/JS, the repository sits inside a **pnpm workspace monorepo** that also contains an Express API server, shared libraries, OpenAPI codegen infrastructure, and scripts. The deployable EPANET app itself is in `artifacts/epanet-swmm`. [page:44]

| Layer | Technology |
|---|---|
| App runtime | Pure HTML, CSS, and JavaScript. [page:43] |
| Dev server | Vite 6. [page:43] |
| Charting | Chart.js via CDN. [page:43] |
| Fonts | Google Fonts: Outfit and JetBrains Mono, with system fallbacks. [page:43] |
| Monorepo | pnpm workspaces. [page:44] |
| Node.js | Version 24. [page:43][page:44] |
| TypeScript | 5.9, primarily for config and workspace tooling. [page:43][page:44] |
| API framework in monorepo | Express 5. [page:44] |
| Database layer in monorepo | PostgreSQL + Drizzle ORM. [page:44] |
| Validation in monorepo | Zod and drizzle-zod. [page:44] |
| API codegen in monorepo | Orval from OpenAPI spec. [page:44] |

---

## Repository structure

The monorepo structure documented in `replit.md` includes deployable artifacts, shared libraries, and scripts. The EPANET app itself is only one artifact inside a larger workspace. [page:44]

```text
EPANET-SWMM-Experts/
├── artifacts/
│   ├── epanet-swmm/          # Static HTML app ("The Rosetta Stone")
│   └── api-server/           # Express 5 API server
├── lib/
│   ├── api-spec/             # OpenAPI spec and Orval config
│   ├── api-client-react/     # Generated React Query client
│   ├── api-zod/              # Generated Zod schemas
│   └── db/                   # Drizzle ORM schema and DB connection
├── scripts/                  # Utility scripts package
├── attached_assets/          # Supporting content/assets
├── HANDOVER.md               # Detailed app handover
├── replit.md                 # Workspace/monorepo documentation
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

The repository language breakdown on GitHub is **67.1% HTML**, **23.9% TypeScript**, **7.8% JavaScript**, and **1.2% CSS**, which aligns with the static-app-plus-monorepo-tooling architecture described in the docs. [page:42]

---

## Development

The root workspace uses pnpm and composite TypeScript project references. The documented root scripts are `pnpm run build` and `pnpm run typecheck`, where typechecking runs `tsc --build --emitDeclarationOnly` across the project graph. [page:44]

For the EPANET artifact specifically, the documented commands are:

```bash
pnpm install
pnpm --filter @workspace/epanet-swmm run dev
pnpm --filter @workspace/epanet-swmm run build
```

The handover notes that the EPANET app is served as a static HTML file by Vite, with the preview path rooted at `/`. [page:44]

---

## Engineering audience

This app is built for a very specific and valuable audience: engineers who already understand SWMM5 but want to become competent, thoughtful EPANET users. It is not positioned as a generic water-distribution tutorial for beginners; instead, it uses SWMM5 as the conceptual anchor and translates EPANET through that lens. [page:43]

That makes it especially useful for stormwater modelers, drainage engineers, infrastructure software specialists, and anyone crossing between urban drainage and pressurized network analysis. [page:43]

---

## Documentation

The most important technical documentation files in the repo are:

- `HANDOVER.md` — the detailed application handover, including tabs, calculators, themes, state persistence, print behavior, and function inventory. [page:43]
- `replit.md` — the workspace-level monorepo documentation, package structure, API server notes, and build conventions. [page:44]

These two files provide enough detail for future enhancement, maintenance, or selective extraction of calculators into separate tools. [page:43][page:44]

---

## Acknowledgments

The app includes a dedication to **Dr. Lewis A. Rossman**, creator of EPANET at the U.S. EPA, and the generated reference docs include an “About EPANET” history section covering his role and the later Open Water Analytics transition. [page:43]

---

## License

Add the appropriate license here if the repository is intended for public reuse.****
