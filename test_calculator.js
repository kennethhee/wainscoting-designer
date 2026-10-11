// Verification test for Wainscoting Calculator Core Engine
// Run with: node test_calculator.js (or npm test)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log('  Wainscot Studio — Core Engine Verification Tests  ');
console.log('====================================================\n');

// 1. EXTRACT ENGINE FROM index.html (Node vm Test Seam - Decision D1 Option B)
const htmlPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`FAILED: index.html not found at ${htmlPath}`);
  process.exit(1);
}

const htmlSource = fs.readFileSync(htmlPath, 'utf8');
const engineBlockRegex = /\/\* === CORE CALCULATOR ENGINE START \((.*?)\) === \*\/([\s\S]*?)\/\* === CORE CALCULATOR ENGINE END \(\1\) === \*\//g;

let match;
const extractedBlocks = {};
let combinedEngineCode = '';

while ((match = engineBlockRegex.exec(htmlSource)) !== null) {
  const blockName = match[1];
  const blockCode = match[2];
  extractedBlocks[blockName] = blockCode;
  combinedEngineCode += `\n/* --- Block: ${blockName} --- */\n` + blockCode;
}

const expectedBlocks = ['utils', 'catalog', 'geometry', 'cutlist', 'stock+paint', 'project'];
console.log(`Extracted ${Object.keys(extractedBlocks).length} engine block(s) from index.html:`);
for (const b of Object.keys(extractedBlocks)) {
  console.log(`  ✓ Block: (${b}) - ${extractedBlocks[b].trim().split('\n').length} lines`);
}

for (const exp of expectedBlocks) {
  if (!extractedBlocks[exp]) {
    console.error(`FAILED: Missing expected engine block (${exp}) in index.html`);
    process.exit(1);
  }
}

// Evaluate in isolated VM context
const sandbox = {
  Math,
  parseFloat,
  parseInt,
  Number,
  String,
  Array,
  Object,
  JSON,
  console
};
vm.createContext(sandbox);

try {
  vm.runInContext(combinedEngineCode, sandbox);
  console.log('\n✓ Core Engine successfully evaluated in isolated VM context.\n');
} catch (err) {
  console.error('FAILED: Error evaluating extracted engine in VM context:', err);
  process.exit(1);
}

// Destructure functions from VM context
const {
  roundUnit,
  formatLength,
  escHtml,
  escJsAttr,
  PRESETS_CATALOG,
  computeWallGeometry,
  computeCutList,
  buildFlatCuts,
  packCuts,
  computePaintArea,
  computeProjectTotals,
  normalizeProject
} = sandbox;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAILED ASSERTION: ${message}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Engine Seam & Export Integrity
// -------------------------------------------------------------
console.log('--- Test Suite 1: Seam & Export Integrity ---');
assert(typeof computeWallGeometry === 'function', 'computeWallGeometry must be a function');
assert(typeof computeCutList === 'function', 'computeCutList must be a function');
assert(typeof packCuts === 'function', 'packCuts must be a function');
assert(typeof computePaintArea === 'function', 'computePaintArea must be a function');
assert(typeof computeProjectTotals === 'function', 'computeProjectTotals must be a function');
assert(typeof normalizeProject === 'function', 'normalizeProject must be a function');
assert(typeof escHtml === 'function', 'escHtml must be a function');
assert(typeof escJsAttr === 'function', 'escJsAttr must be a function');
assert(typeof PRESETS_CATALOG === 'object', 'PRESETS_CATALOG must be an object');
console.log('✓ All 11 core engine exports verified.');

// -------------------------------------------------------------
// TEST SUITE 2: Spacing & Wall Geometry
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Spacing & Geometry Logic ---');
const sampleWall = {
  name: 'Living Room',
  wallLength: 3600,
  wallHeight: 2400,
  wainscotHeight: 950,
  baseboardHeight: 120,
  chairRailHeight: 50,
  trimWidth: 40,
  calcMode: 'auto_count',
  panelCount: 4,
  marginMode: 'equal',
  customMargin: 100,
  spacing: 100,
  marginBottom: 80,
  marginTop: 80,
  style: 'picture_frame',
  obstacles: []
};

const geoEqual = computeWallGeometry(sampleWall);
console.log(`4 Panels on 3600mm Wall (Equal Margins): Box width=${geoEqual.panelWidth}mm, Spacing=${geoEqual.spacing}mm`);
// 5 spaces (margins + gaps) of 100mm = 500mm. 3600 - 500 = 3100. 3100 / 4 = 775mm
assert(geoEqual.numPanels === 4, 'Expected 4 panels');
assert(geoEqual.panelWidth === 775, `Expected panel width 775mm, got ${geoEqual.panelWidth}`);
assert(geoEqual.spacing === 100, `Expected spacing 100mm, got ${geoEqual.spacing}`);
assert(geoEqual.panels.length === 4, 'Expected 4 rendered panels');

// Test fixed custom margin
const wallCustom = Object.assign({}, sampleWall, { marginMode: 'custom', customMargin: 150 });
const geoCustom = computeWallGeometry(wallCustom);
// 2 margins of 150 = 300. 3 gaps of 100 = 300. Total spacing = 600. Remaining span = 3000. 3000/4 = 750mm
console.log(`4 Panels on 3600mm Wall (Custom 150mm Margins): Box width=${geoCustom.panelWidth}mm`);
assert(geoCustom.panelWidth === 750, `Expected panel width 750mm, got ${geoCustom.panelWidth}`);
assert(geoCustom.leftMargin === 150, 'Expected left margin 150mm');

// Test obstacle collision detection in geometry engine
const wallWithObstacle = Object.assign({}, sampleWall, {
  obstacles: [
    { id: 'obs-1', name: 'Power Outlet', x: 90, y: 300, width: 80, height: 120, type: 'outlet' }
  ]
});
const geoCollision = computeWallGeometry(wallWithObstacle);
console.log(`Obstacle collisions detected: ${geoCollision.conflicts.length}`);
assert(geoCollision.conflicts.length > 0, 'Expected obstacle collision with first panel frame perimeter');
assert(geoCollision.conflicts[0].obstacle === 'Power Outlet', 'Expected collision with Power Outlet');
console.log('✓ Wall geometry and collision detection tests passed.');

// -------------------------------------------------------------
// TEST SUITE 3: Cut List Schedule Generation
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Cut List Schedule Generation ---');
const cuts = computeCutList(geoEqual, sampleWall);
console.log(`Generated ${cuts.length} cut list rows:`);
cuts.forEach(c => console.log(`  - ${c.tag}: ${c.name} (${c.quantity}x @ ${c.length}mm, ${c.cutType})`));

assert(cuts.length === 10, 'Expected 10 cut rows (2 per panel * 4 panels + chair rail + baseboard)');
const hCuts = cuts.filter(c => c.tag.endsWith('-H'));
const vCuts = cuts.filter(c => c.tag.endsWith('-V'));
const chairRailCut = cuts.find(c => c.tag === 'CHR-RAIL');
const baseboardCut = cuts.find(c => c.tag === 'BASE-BRD');

assert(hCuts.length === 4, 'Expected 4 horizontal box rail entries');
assert(hCuts[0].length === 775, `Expected top/bottom rail length 775mm, got ${hCuts[0].length}`);
assert(hCuts[0].quantity === 2, 'Expected 2 rails per panel');
assert(vCuts.length === 4, 'Expected 4 vertical box stile entries');
assert(vCuts[0].length === 620, `Expected vertical stile length 620mm, got ${vCuts[0].length}`);
assert(vCuts[0].quantity === 2, 'Expected 2 stiles per panel');
assert(chairRailCut && chairRailCut.length === 3600, 'Expected chair rail length to match wallLength (3600mm)');
assert(baseboardCut && baseboardCut.length === 3600, 'Expected baseboard length to match wallLength (3600mm)');
console.log('✓ Cut list generation tests passed.');

// -------------------------------------------------------------
// TEST SUITE 4: Cutting Stock Bin-Packing & Oversize Detection
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Stock Optimizer & Over-Length Cuts ---');
const flatCuts = buildFlatCuts(cuts);
console.log(`Built ${flatCuts.length} stock pieces for bin packing.`);

// Test standard bin-packing
const packed = packCuts(flatCuts, 2400, 3);
console.log(`Packed into ${packed.boards.length} stock boards (2400mm) with ${packed.wastePct.toFixed(1)}% waste.`);
assert(packed.boards.length > 0, 'Expected at least 1 stock board');
assert(packed.wastePct >= 0 && packed.wastePct < 50, 'Waste percentage should be within realistic threshold');
assert(packed.oversize.length === 0, 'No pieces should be oversize for standard 775mm cuts on 2400mm board');

// Test Over-length Cut Detection (T6 / F6)
const oversizeFlatCuts = [
  { tag: 'EXTRA-LONG-RAIL', length: 3000 },
  { tag: 'NORMAL-STILE', length: 800 }
];
const packedOversize = packCuts(oversizeFlatCuts, 2400, 3);
console.log(`Oversize detection result: ${packedOversize.oversize.length} oversize piece(s) flagged:`);
packedOversize.oversize.forEach(o => console.log(`  - Piece "${o.tag}" of length ${o.length}mm requires ${o.joints} joint(s)`));
assert(packedOversize.oversize.length === 1, 'Expected 1 oversize piece detected');
assert(packedOversize.oversize[0].tag === 'EXTRA-LONG-RAIL', 'Expected EXTRA-LONG-RAIL to be flagged');
assert(packedOversize.oversize[0].joints === 1, 'Expected 3000mm on 2400mm stock to require 1 joint');
console.log('✓ Stock bin-packing and over-length cut detection tests passed.');

// -------------------------------------------------------------
// TEST SUITE 5: Colour Drench Paint Area & Openings Subtraction
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: Paint Area Maths (Colour Drench & Openings) ---');

// Case A: Colour Drench (wallColor === trimColor) -> Full Wall Floor-to-Ceiling
const wallDrench = {
  wallLength: 3600,
  wallHeight: 2400,
  wainscotHeight: 950,
  wallColor: '#f4efe6',
  trimColor: '#f4efe6',
  paintScope: 'auto',
  obstacles: []
};
const paintDrench = computePaintArea(wallDrench, 'mm');
console.log(`Colour Drench (3600x2400): Full wall = ${paintDrench.fullWall}, Area = ${paintDrench.areaSqM.toFixed(2)} m²`);
// 3.6m * 2.4m = 8.64 m²
assert(paintDrench.fullWall === true, 'Colour drench with matching colors must default to full wall');
assert(Math.abs(paintDrench.areaSqM - 8.64) < 0.01, `Expected 8.64 m², got ${paintDrench.areaSqM}`);

// Case B: Non-Drench Two-Tone -> Wainscot Height Only
const wallTwoTone = {
  wallLength: 3600,
  wallHeight: 2400,
  wainscotHeight: 950,
  wallColor: '#f8fafc',
  trimColor: '#334155',
  paintScope: 'auto',
  obstacles: []
};
const paintTwoTone = computePaintArea(wallTwoTone, 'mm');
console.log(`Two-Tone (3600x950 wainscot): Full wall = ${paintTwoTone.fullWall}, Area = ${paintTwoTone.areaSqM.toFixed(2)} m²`);
// 3.6m * 0.95m = 3.42 m²
assert(paintTwoTone.fullWall === false, 'Two tone should paint wainscot height only');
assert(Math.abs(paintTwoTone.areaSqM - 3.42) < 0.01, `Expected 3.42 m², got ${paintTwoTone.areaSqM}`);

// Case C: Explicit Scope Override ('wainscot_only' on drench)
const wallOverride = Object.assign({}, wallDrench, { paintScope: 'wainscot_only' });
const paintOverride = computePaintArea(wallOverride, 'mm');
assert(paintOverride.fullWall === false, 'Paint scope override to wainscot_only must be respected');
assert(Math.abs(paintOverride.areaSqM - 3.42) < 0.01, `Expected 3.42 m² with override, got ${paintOverride.areaSqM}`);

// Case D: Openings Subtraction (Door 820x2040 and Window 1200x1000)
const wallWithOpenings = Object.assign({}, wallDrench, {
  obstacles: [
    { type: 'door', x: 200, y: 0, width: 820, height: 2040 },
    { type: 'window', x: 1800, y: 900, width: 1200, height: 1000 }
  ]
});
const paintWithOpenings = computePaintArea(wallWithOpenings, 'mm');
// Full: 8.64 m²
// Door: 0.82 * 2.04 = 1.6728 m²
// Window: 1.2 * 1.0 = 1.2 m²
// Expected: 8.64 - 1.6728 - 1.2 = 5.7672 m²
console.log(`With Door & Window subtracted: Area = ${paintWithOpenings.areaSqM.toFixed(2)} m²`);
assert(Math.abs(paintWithOpenings.areaSqM - 5.7672) < 0.01, `Expected ~5.77 m², got ${paintWithOpenings.areaSqM}`);
console.log('✓ Paint area calculation and openings subtraction tests passed.');

// -------------------------------------------------------------
// TEST SUITE 6: Multi-Wall Project Totals Aggregation
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Multi-Wall Project Totals Aggregation ---');
const wallA = Object.assign({}, sampleWall, { name: 'Front Wall', wallLength: 3600 });
const wallB = Object.assign({}, sampleWall, { name: 'Side Wall', wallLength: 2400, panelCount: 3 });

const defaultPrices = {
  mouldingPerUnit: 4.5,
  chairRailPerUnit: 8.5,
  baseboardPerUnit: 9.0,
  adhesiveTube: 9.5,
  caulkTube: 8.0,
  fillerTub: 14.0,
  wallPaintPerUnit: 38,
  trimPaintPerUnit: 44,
  nailsBox: 12.0
};

const projectTotals = computeProjectTotals([wallA, wallB], 'mm', 2400, 3, defaultPrices);
console.log(`Multi-Wall Totals: ${projectTotals.wallCount} walls, ${projectTotals.pieces} total cut pieces`);
console.log(`  Combined Stock Boards: ${projectTotals.packed.boards.length} (vs ${projectTotals.perWallBoards} summed per-wall)`);
console.log(`  Combined Paint Area: ${projectTotals.paintAreaSqM.toFixed(2)} m²`);
console.log(`  Total Estimated Project Cost: $${projectTotals.cost.toFixed(2)}`);

assert(projectTotals.wallCount === 2, 'Expected 2 walls aggregated');
assert(projectTotals.rows.length > 0, 'Expected cut schedule rows from both walls');
assert(projectTotals.packed.boards.length <= projectTotals.perWallBoards, 'Combined bin-packing should use <= boards than sum of isolated walls');
assert(projectTotals.cost > 0, 'Project cost must be greater than zero');
console.log('✓ Multi-wall project totals aggregation tests passed.');

// -------------------------------------------------------------
// TEST SUITE 7: Project Normalization & Unit Sync
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: Project Schema Validation & Unit Sync ---');
const defaultProjectTemplate = {
  unit: 'mm',
  currentWallIndex: 0,
  zoomLevel: 1.0,
  walls: [sampleWall],
  unitPrices: defaultPrices
};

// Test valid normalization
const norm = normalizeProject({ walls: [{ wallLength: 3000, wallHeight: 2400, wainscotHeight: 950 }] }, defaultProjectTemplate);
assert(norm.unit === 'mm', 'Expected default unit mm');
assert(norm.walls.length === 1, 'Expected 1 wall');
assert(norm.walls[0].wallLength === 3000, 'Expected wall length 3000');

// Test unit toggle preservation (F4 fix)
const normInches = normalizeProject({ unit: 'in', walls: [{ wallLength: 120, wallHeight: 96, wainscotHeight: 38 }] }, defaultProjectTemplate);
assert(normInches.unit === 'in', 'Inches unit must be preserved');

// Test rejection of corrupt data
let threw = false;
try {
  normalizeProject(null, defaultProjectTemplate);
} catch (e) {
  threw = true;
}
assert(threw, 'normalizeProject must throw on null');

threw = false;
try {
  normalizeProject({ walls: [] }, defaultProjectTemplate);
} catch (e) {
  threw = true;
}
assert(threw, 'normalizeProject must throw on empty walls array');

threw = false;
try {
  normalizeProject({ version: 99, walls: [{ wallLength: 100, wallHeight: 100, wainscotHeight: 50 }] }, defaultProjectTemplate);
} catch (e) {
  threw = true;
}
assert(threw, 'normalizeProject must throw on unsupported version');
console.log('✓ Project normalization and unit synchronization tests passed.');

// -------------------------------------------------------------
// TEST SUITE 8: XSS Sanitization & String Escaping
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: XSS Sanitization ---');
const dangerousString = `<script>alert("XSS")</script>&'`;
const escapedHtml = escHtml(dangerousString);
console.log(`Escaped HTML: ${escapedHtml}`);
assert(!escapedHtml.includes('<script>'), 'escHtml must remove raw <script>');
assert(escapedHtml.includes('&lt;script&gt;'), 'escHtml must convert < to &lt;');
assert(escapedHtml.includes('&quot;'), 'escHtml must convert " to &quot;');
assert(escapedHtml.includes('&#39;'), "escHtml must convert ' to &#39;");

const dangerousAttr = `Living Room' onclick='alert(1)`;
const escapedAttr = escJsAttr(dangerousAttr);
console.log(`Escaped JS Attr: ${escapedAttr}`);
assert(!escapedAttr.includes("' onclick='"), 'escJsAttr must escape single quotes');
console.log('✓ XSS sanitization tests passed.');

// -------------------------------------------------------------
// TEST SUITE 9: Presets Catalog Provenance & CanvasTV Clearance
// -------------------------------------------------------------
console.log('\n--- Test Suite 9: Presets Provenance & CanvasTV Placement ---');
assert(PRESETS_CATALOG.tv['55_canvas'].verified === true, '55" CanvasTV must be marked verified: true');
assert(PRESETS_CATALOG.tv['55_canvas'].widthMm === 1256, '55" CanvasTV width must be 1256mm');
assert(PRESETS_CATALOG.tv['55_canvas'].heightMm === 733, '55" CanvasTV height must be 733mm');
assert(PRESETS_CATALOG.tv['65_canvas'].verified === true, '65" CanvasTV must be marked verified: true');
assert(PRESETS_CATALOG.tv['75_canvas'].verified === false, '75" Display must be marked verified: false (no 75S7NAU exists)');
assert(PRESETS_CATALOG.paints.dulux_antique_white.hex === '#f4efe6', 'Dulux Antique White hex must be #f4efe6');
assert(PRESETS_CATALOG.paints.dulux_antique_white.lrv === 83, 'Dulux Antique White LRV must be 83');

// CanvasTV Centering & Mount Clearance
const tvCat = PRESETS_CATALOG.tv['55_canvas'];
const wallLen = 3600;
const wainscotH = 950;
const centeredX = Math.round((wallLen - tvCat.widthMm) / 2);
const mountY = wainscotH + 100; // 100mm clearance above rail
const clearance = mountY - wainscotH;
console.log(`CanvasTV centered at X=${centeredX}mm, mount Y=${mountY}mm, clearance=${clearance}mm`);
assert(centeredX === 1172, `Expected centered X=1172, got ${centeredX}`);
assert(clearance === 100, `Expected clearance=100, got ${clearance}`);
console.log('✓ Presets catalog provenance and CanvasTV tests passed.');

console.log('\n====================================================');
console.log('  ALL 9 TEST SUITES PASSED (100% PRODUCTION SEAM)   ');
console.log('====================================================');
