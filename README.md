# Wainscot Studio — Architectural Designer & Carpentry Calculator

An interactive carpentry CAD and layout studio for designing wainscoting installations, calculating opening-aware box and batten layouts, generating profile-grouped 45°/90° cut lists, running 1D cutting-stock bin packing, and estimating hardware, paint, and itemized material costs.

## Live Application

- **Web App:** https://kennethhee.github.io/wainscoting-designer/
- **Repository:** https://github.com/kennethhee/wainscoting-designer

## Key Capabilities (v2)

- **Canonical Millimetre Engine (`src/engine/`):** All geometry and persistence are stored in canonical `mm`; imperial (`in` with `1/16"` fractions) is strictly a display/input layer with zero toggle drift.
- **Opening-Aware Wall Segmentation:** Doors and low windows (with configurable architrave clearance) automatically split wall spans so panels, skirting, and chair rail stop cleanly at openings.
- **True-Scale Interactive SVG Elevation:** Picture-frame strokes are inset by `trimWidth / 2` so rendered outer edges, gaps, and margins match exact long-point miter dimensions. Obstacles (outlets, doors, windows, TVs) can be dragged directly on the elevation with 5 mm snap-to-grid.
- **Ceiling Coving & Multi-Conflict Detection:** Models standard Australian cornice drops (90/75/55 mm Cove, Square Set, Custom) and surfaces all simultaneous clashes (coving, chair rail, baseboard, moulding perimeters, battens) with suggestions.
- **Project-Wide Trim Continuity:** Keep multi-room projects locked to shared trim heights, profiles, and colours, or override individual walls.
- **Profile-Grouped 1D Stock Optimizer:** Separately bin-packs outer moulding, inner nested moulding, battens, chair rail, and skirting with independent stock lengths and saw kerf, flagging oversize runs that need scarf joints.
- **1:1 Itemized Cost & Net Paint Area:** Deducts coving, baseboard, and openings from painted wall area; every cost row sums directly to the displayed total.

## Development & Build

```bash
npm install
npm run dev          # Local Vite dev server
npm test             # Run Vitest unit suite
npm run typecheck    # Strict TypeScript check
npm run build        # Production build (dist/) for GitHub Pages
npm run build:single # Portable single-file HTML (dist-single/index.html)
```

## Architecture

```text
src/
├── engine/      # Pure deterministic TypeScript engine (zero DOM dependencies)
│   ├── types.ts, units.ts, catalog.ts, segments.ts,
│   ├── geometry.ts, cutlist.ts, optimizer.ts, materials.ts, migrations.ts
├── state/       # Reactive store, undo/redo, debounced localStorage + v1->v2 migration
├── ui/          # Header, Sidebar, Interactive SVG Elevation, Output Drawer
└── styles/      # Light/Dark architectural theme + print stylesheet
tests/
└── engine.test.ts
```
