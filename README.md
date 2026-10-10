# Wainscot Studio - Architectural Designer & Calculator

An interactive, zero-dependency carpentry CAD and layout tool for designing wainscoting installations, calculating exact box and batten spacings, generating 45°/90° cut lists, running 1D bin-packing lumber stock optimization, and estimating hardware, paint, and material costs.

## Live Application

- Web App: https://kennethhee.github.io/wainscoting-designer/
- Project Source: https://github.com/kennethhee/wainscoting-designer

## Features

### 1. Wainscoting Styles
- **Picture Frame (Box Moulding)**: Traditional single frames on drywall with 45° miter corners.
- **Double Picture Frame (Nested)**: Nested inner shadow box with configurable offset gap.
- **Board and Batten**: Vertical stiles with top and bottom rails, full or partial height.
- **Grid Board and Batten**: Multi-tier grid squares with horizontal cross rails.
- **Recessed Shaker Panel & Raised Panel**: Classic craftsman panels with infill sheet calculation.
- **Cottage Beadboard**: Vertical grooved wainscot below dado cap.
- **Two-Tier Layouts**: Upper tall box and lower square box divided by intermediate gap/rail.

### 2. Spacing & Layout Engine
- **Equal Stile / Gap Calculation**: Automatically computes exact box widths so all margins and internal gaps are identical.
- **Fixed Stile / Target Panel Width**: Computes optimal panel count and spacing based on desired box dimensions.
- **Obstacle Collision Detection**: Real-time conflict checks against electrical outlets, light switches, doors, and windows, alerting when a box moulding or batten would fall across a fixture.
- **Unit Toggle**: Dual Metric (`mm`) and Imperial (`in` with 1/16" fractional formatting).

### 3. Carpentry Outputs
- **Elevation Visualizer**: Scaled 2D SVG canvas with true dimensions, shadows, and architectural measurement annotations.
- **Cut List Schedule**: Categorized piece tags, lengths, widths, joint types (45° miter vs 90° butt), quantities, and linear measurements.
- **1D Cutting Stock Optimizer**: Best-fit decreasing bin-packing algorithm allocating cut pieces across standard stock board lengths (2.4m / 8ft, 3.0m / 10ft, 3.6m / 12ft, 4.8m / 16ft) with saw kerf allowance and waste percentage visualization.
- **Hardware & Materials Estimator**: 18-gauge brad nails count, construction adhesive tubes, painter's caulk, wood filler, primer/paint coverage (square area), and total customizable budget table.
- **Exports**: Print-ready architectural plan (`Ctrl/Cmd+P`), CSV cut list export, and JSON project save/load.

## Quick Start

### Option A: Open directly in your browser
Double-click `/Users/khee/Claude/wainscoting-designer.html` or run:
```bash
open /Users/khee/Claude/wainscoting-designer.html
```

### Option B: Local Web Server
```bash
cd /Users/khee/.gemini/antigravity/scratch/wainscoting-designer
npx serve .
```

### Run Calculation Verification Tests
```bash
cd /Users/khee/.gemini/antigravity/scratch/wainscoting-designer
node test_calculator.js
```
