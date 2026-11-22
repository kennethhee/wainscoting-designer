import { describe, expect, it } from 'vitest';
import {
  CORNICE_PRESETS,
  DEFAULT_STOCK_SETTINGS,
  DEFAULT_UNIT_PRICES,
  PAINT_PRESETS,
  TV_PRESETS,
  buildFlatCuts,
  computeClearRuns,
  computeCutList,
  computeMaterialsEstimate,
  computePaintArea,
  computeProjectTotals,
  computeWallGeometry,
  createStarterProject,
  createWall,
  displayToMm,
  escHtml,
  formatLength,
  mmToDisplay,
  normalizeProject,
  packCuts,
  packCutsByProfile,
  parseNumericInput
} from '../src/engine';

describe('Units & Safe Input Parsing', () => {
  it('preserves 0 values instead of snapping to fallback', () => {
    expect(parseNumericInput('0', 50, 0)).toBe(0);
    expect(parseNumericInput('0.0', 50, 0)).toBe(0);
    expect(parseNumericInput('', 50, 0)).toBe(50);
    expect(parseNumericInput('abc', 50, 0)).toBe(50);
    expect(parseNumericInput('-10', 50, 0)).toBe(0);
  });

  it('formats imperial fractions to 1/16 inch cleanly without mutating canonical mm', () => {
    expect(formatLength(25.4, 'in')).toBe('1"');
    expect(formatLength(12.7, 'in')).toBe('1/2"');
    expect(formatLength(950, 'mm')).toBe('950 mm');
    // Round-trip display conversion
    const mm = 2970;
    const inches = mmToDisplay(mm, 'in');
    expect(inches).toBeCloseTo(116.9375, 4);
    expect(displayToMm(10, 'in')).toBe(254);
  });

  it('escapes HTML safely', () => {
    const escaped = escHtml(`<script>alert("XSS")</script>&'`);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&#39;');
  });
});

describe('Opening-Aware Wall Segmentation', () => {
  it('splits a wall cleanly around a patio sliding door with architrave clearance', () => {
    const wall = createWall({
      id: 'patio',
      name: 'Patio Wall',
      wallLength: 6000,
      wallHeight: 2400,
      wainscotHeight: 950,
      baseboardHeight: 138,
      chairRailHeight: 50,
      panelCount: 4,
      obstacles: [
        { id: 'door-1', name: 'Patio Door', type: 'door', x: 2100, y: 0, width: 2100, height: 2100, architraveMm: 70 }
      ]
    });

    const runs = computeClearRuns(wall.wallLength, wall.obstacles, 0, 138);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ startX: 0, endX: 2030, length: 2030 });
    expect(runs[1]).toMatchObject({ startX: 4270, endX: 6000, length: 1730 });

    const geo = computeWallGeometry(wall);
    expect(geo.segments).toHaveLength(2);
    // No panel may cross into the doorway [2030, 4270]
    for (const p of geo.panels) {
      const overlapsDoor = p.x < 4270 && p.x + p.width > 2030;
      expect(overlapsDoor).toBe(false);
    }

    // Cut list must deduct the doorway from both baseboard and chair rail
    const cuts = computeCutList(geo, wall);
    const baseTotal = cuts.filter((c) => c.profile === 'baseboard').reduce((a, c) => a + c.totalLinear, 0);
    const railTotal = cuts.filter((c) => c.profile === 'chair_rail').reduce((a, c) => a + c.totalLinear, 0);
    expect(baseTotal).toBe(2030 + 1730);
    expect(railTotal).toBe(2030 + 1730);
  });

  it('does not split wainscot when a high window sits entirely above the chair rail', () => {
    const wall = createWall({
      id: 'win-wall',
      name: 'Front Wall',
      wallLength: 3800,
      wallHeight: 2400,
      wainscotHeight: 950,
      obstacles: [
        { id: 'win-1', name: 'High Window', type: 'window', x: 1000, y: 1050, width: 1800, height: 1200, architraveMm: 65 }
      ]
    });
    const geo = computeWallGeometry(wall);
    expect(geo.segments).toHaveLength(1);
    expect(geo.clearBaseboardRuns).toHaveLength(1);
    expect(geo.clearChairRailRuns).toHaveLength(1);
  });
});

describe('Geometry, Spacing & Multi-Conflict Detection', () => {
  it('computes exact outer-to-outer panel dimensions for equal margins', () => {
    const wall = createWall({
      id: 'w1',
      name: 'Feature Wall',
      wallLength: 2970,
      wallHeight: 2400,
      wainscotHeight: 950,
      baseboardHeight: 138,
      chairRailHeight: 50,
      corniceHeight: 90,
      marginBottom: 40,
      marginTop: 40,
      panelCount: 3,
      spacing: 100,
      marginMode: 'equal'
    });
    const geo = computeWallGeometry(wall);
    expect(geo.numPanels).toBe(3);
    expect(geo.panelWidth).toBeCloseTo((2970 - 400) / 3, 2); // 856.67mm
    expect(geo.panelHeight).toBe(950 - 138 - 50 - 40 - 40); // 682mm
    expect(geo.conflicts).toHaveLength(0);
  });

  it('supports 0mm margins without snapping back', () => {
    const wall = createWall({
      id: 'w0',
      name: 'Flush Margins',
      wallLength: 2000,
      panelCount: 2,
      spacing: 100,
      marginMode: 'custom',
      customMargin: 0,
      marginBottom: 0,
      marginTop: 0
    });
    const geo = computeWallGeometry(wall);
    expect(geo.leftMargin).toBe(0);
    expect(geo.rightMargin).toBe(0);
    expect(geo.panelWidth).toBe(950);
  });

  it('detects coving, chair rail, and moulding perimeter conflicts simultaneously', () => {
    const wall = createWall({
      id: 'clash',
      name: 'Clash Wall',
      wallLength: 2970,
      wallHeight: 2400,
      wainscotHeight: 950,
      baseboardHeight: 138,
      chairRailHeight: 50,
      corniceHeight: 90,
      panelCount: 3,
      spacing: 100,
      obstacles: [
        { id: 'ac', name: 'High AC Unit', type: 'other', x: 500, y: 2320, width: 400, height: 70 },
        { id: 'tv', name: 'Low TV', type: 'tv', x: 800, y: 920, width: 1256, height: 733 },
        { id: 'gpo', name: 'Clashing GPO', type: 'outlet', x: 95, y: 300, width: 115, height: 75 }
      ]
    });
    const geo = computeWallGeometry(wall);
    expect(geo.conflicts.some((c) => c.obstacleId === 'ac' && c.item.includes('Coving'))).toBe(true);
    expect(geo.conflicts.some((c) => c.obstacleId === 'tv' && c.item.includes('Chair Rail'))).toBe(true);
    expect(geo.conflicts.some((c) => c.obstacleId === 'gpo' && c.item.includes('Frame Perimeter'))).toBe(true);
  });
});

describe('Profile-Grouped Stock Optimizer', () => {
  it('separates outer moulding, chair rail, and baseboard into independent stock plans', () => {
    const wall = createWall({
      id: 'w1',
      name: 'Feature',
      wallLength: 2970,
      panelCount: 3,
      style: 'double_picture_frame',
      innerGap: 60
    });
    const geo = computeWallGeometry(wall);
    const cuts = computeCutList(geo, wall);
    const flat = buildFlatCuts(cuts);
    const plans = packCutsByProfile(flat, DEFAULT_STOCK_SETTINGS);

    const profiles = plans.map((p) => p.profile);
    expect(profiles).toContain('outer_moulding');
    expect(profiles).toContain('inner_moulding');
    expect(profiles).toContain('chair_rail');
    expect(profiles).toContain('baseboard');

    // Chair rail and baseboard use railStockMm (5400mm), moulding uses mouldingStockMm (2400mm)
    const basePlan = plans.find((p) => p.profile === 'baseboard')!;
    const outerPlan = plans.find((p) => p.profile === 'outer_moulding')!;
    expect(basePlan.stockLengthMm).toBe(5400);
    expect(outerPlan.stockLengthMm).toBe(2400);
  });

  it('flags oversize pieces requiring scarf joints', () => {
    const packed = packCuts([{ tag: 'LONG-RAIL', length: 6000, profile: 'chair_rail' }], 5400, 3);
    expect(packed.oversize).toHaveLength(1);
    expect(packed.oversize[0]?.joints).toBe(1);
    expect(packed.boards.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Paint Area & 1:1 Itemized Cost Integrity', () => {
  it('deducts ceiling coving, baseboard, and openings from painted wall area', () => {
    const wall = createWall({
      id: 'p1',
      name: 'Paint Test',
      wallLength: 3000,
      wallHeight: 2400,
      baseboardHeight: 138,
      corniceHeight: 90,
      wallColor: '#f4efe6',
      trimColor: '#f4efe6',
      paintScope: 'auto'
    });
    const res = computePaintArea(wall);
    expect(res.fullWall).toBe(true);
    // Net painted height = 2400 - 90 - 138 = 2172mm -> 3.0 * 2.172 = 6.516 m^2
    expect(res.areaSqM).toBeCloseTo(6.516, 3);
  });

  it('ensures visible cost line items sum exactly to totalCost (including wood filler)', () => {
    const project = createStarterProject();
    const wall = project.walls[0]!;
    const geo = computeWallGeometry(wall);
    const cuts = computeCutList(geo, wall);
    const est = computeMaterialsEstimate([wall], cuts, 'mm', DEFAULT_UNIT_PRICES);

    expect(est.lineItems.some((item) => item.id === 'filler')).toBe(true);
    const sum = est.lineItems.reduce((acc, item) => acc + item.subtotal, 0);
    expect(sum).toBeCloseTo(est.totalCost, 6);
  });

  it('defaults to the single Feature Wall with 55" CanvasTV and 0 conflicts, and aggregates multi-wall totals cleanly', () => {
    const starter = createStarterProject();
    expect(starter.walls).toHaveLength(1);
    expect(starter.walls[0]?.obstacles.some((o) => o.type === 'tv')).toBe(true);

    // Feature wall should have 0 conflicts with TV + 3 measured outlets
    const wall1Geo = computeWallGeometry(starter.walls[0]!);
    expect(wall1Geo.conflicts).toHaveLength(0);

    // Verify multi-wall cross-wall stock packing aggregation
    const twoWalls = [
      starter.walls[0]!,
      createWall({ id: 'wall-2', name: 'Second Wall', wallLength: 3200, panelCount: 4 })
    ];
    const totals = computeProjectTotals(twoWalls, 'mm', starter.stockSettings, starter.unitPrices);
    expect(totals.wallCount).toBe(2);
    expect(totals.totalBoards).toBeLessThanOrEqual(totals.perWallBoards);
    expect(totals.materials.totalCost).toBeGreaterThan(0);
  });
});

describe('Migrations & Catalog Provenance', () => {
  it('migrates legacy v1 imperial projects into canonical mm v2 projects', () => {
    const legacyV1 = {
      version: 1,
      unit: 'in',
      currentWallIndex: 0,
      walls: [
        {
          id: 'w1',
          name: 'Imperial Wall',
          wallLength: 100, // 2540 mm
          wallHeight: 96, // 2438.4 mm
          wainscotHeight: 36, // 914.4 mm
          baseboardHeight: 5.5,
          chairRailHeight: 2,
          corniceHeight: 3.5,
          obstacles: [{ id: 'o1', name: 'Outlet', type: 'outlet', x: 10, y: 12, width: 4, height: 3 }]
        }
      ],
      unitPrices: { mouldingPerUnit: 5.0 }
    };

    const migrated = normalizeProject(legacyV1);
    expect(migrated.version).toBe(2);
    expect(migrated.unit).toBe('in');
    expect(migrated.walls[0]?.wallLength).toBeCloseTo(2540, 1);
    expect(migrated.walls[0]?.obstacles[0]?.x).toBeCloseTo(254, 1);
    expect(migrated.unitPrices.mouldingPerMetre).toBe(5.0);
  });

  it('verifies preset provenance', () => {
    expect(CORNICE_PRESETS['90_cove']?.dropMm).toBe(90);
    expect(TV_PRESETS['55_canvas']?.verified).toBe(true);
    expect(TV_PRESETS['75_canvas']?.verified).toBe(false);
    expect(PAINT_PRESETS.dulux_antique_white?.hex).toBe('#f4efe6');
  });
});
