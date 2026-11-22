import type { Project, StockSettings, TrimSpec, UnitPrices, Wall } from './types';

export interface CornicePreset {
  id: string;
  name: string;
  dropMm: number;
  verified: boolean;
  source: string;
}

export interface TvPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  verified: boolean;
  source: string;
}

export interface PaintPreset {
  id: string;
  name: string;
  hex: string;
  lrv: number;
  wallSheen: 'low_sheen';
  trimSheen: 'semi_gloss';
}

export const CORNICE_PRESETS: Record<string, CornicePreset> = {
  '90_cove': {
    id: '90_cove',
    name: '90mm Standard Cove Cornice',
    dropMm: 90,
    verified: true,
    source: 'Australian Standard plasterboard cove cornice (CSR Gyprock / Knauf 90mm Cove)'
  },
  '75_cove': {
    id: '75_cove',
    name: '75mm Cove Cornice',
    dropMm: 75,
    verified: true,
    source: 'CSR Gyprock 75mm Cove'
  },
  '55_cove': {
    id: '55_cove',
    name: '55mm Small Cove Cornice',
    dropMm: 55,
    verified: true,
    source: 'CSR Gyprock 55mm Cove'
  },
  square_set: {
    id: 'square_set',
    name: 'Square Set (No Cornice)',
    dropMm: 0,
    verified: true,
    source: 'Flush 90-degree internal ceiling angle'
  }
};

export const TV_PRESETS: Record<string, TvPreset> = {
  '55_canvas': {
    id: '55_canvas',
    name: '55" Hisense CanvasTV (55S7NAU)',
    widthMm: 1256,
    heightMm: 733,
    verified: true,
    source: 'Hisense Australia official 55S7NAU spec (1256 x 733 mm incl. teak frame)'
  },
  '65_canvas': {
    id: '65_canvas',
    name: '65" Hisense CanvasTV (65S7NAU)',
    widthMm: 1474,
    heightMm: 856,
    verified: true,
    source: 'Hisense Australia official 65S7NAU spec (1474 x 856 mm incl. teak frame)'
  },
  '75_canvas': {
    id: '75_canvas',
    name: '75" Display (Generic 16:9)',
    widthMm: 1680,
    heightMm: 960,
    verified: false,
    source: 'Generic 75" diagonal 16:9 outer bounds (no Hisense S7NAU 75" model exists)'
  }
};

export const PAINT_PRESETS: Record<string, PaintPreset> = {
  dulux_antique_white: {
    id: 'dulux_antique_white',
    name: 'Dulux Antique White U.S.A.',
    hex: '#f4efe6',
    lrv: 83,
    wallSheen: 'low_sheen',
    trimSheen: 'semi_gloss'
  },
  dulux_natural_white: {
    id: 'dulux_natural_white',
    name: 'Dulux Natural White',
    hex: '#f2f1ec',
    lrv: 85,
    wallSheen: 'low_sheen',
    trimSheen: 'semi_gloss'
  },
  dulux_vivid_white: {
    id: 'dulux_vivid_white',
    name: 'Dulux Vivid White',
    hex: '#f7f8f8',
    lrv: 90,
    wallSheen: 'low_sheen',
    trimSheen: 'semi_gloss'
  }
};

export const STYLE_PRESETS: Record<string, Partial<TrimSpec> & { label: string; description: string }> = {
  classic_picture_frame: {
    label: 'Classic Picture Frame (950mm)',
    description: 'Traditional box moulding below dado rail',
    style: 'picture_frame',
    wainscotHeight: 950,
    baseboardHeight: 138,
    chairRailHeight: 50,
    trimWidth: 40,
    spacing: 100,
    marginBottom: 40,
    marginTop: 40,
    twoTier: false
  },
  double_nested_formal: {
    label: 'Double Picture Frame (Nested)',
    description: 'Formal nested inner shadow box moulding',
    style: 'double_picture_frame',
    wainscotHeight: 1050,
    baseboardHeight: 138,
    chairRailHeight: 55,
    trimWidth: 40,
    innerGap: 55,
    spacing: 100,
    marginBottom: 45,
    marginTop: 45,
    twoTier: false
  },
  two_tier_grand: {
    label: 'Two-Tier Grand (Full Height)',
    description: 'Tall upper boxes + lower square dado boxes',
    style: 'picture_frame',
    wainscotHeight: 2250,
    baseboardHeight: 138,
    chairRailHeight: 0,
    trimWidth: 40,
    spacing: 100,
    marginBottom: 60,
    marginTop: 60,
    twoTier: true,
    tierRatio: 0.35,
    tierGap: 90
  },
  modern_board_batten: {
    label: 'Board & Batten (1200mm)',
    description: 'Craftsman vertical battens with top rail',
    style: 'board_and_batten',
    wainscotHeight: 1200,
    baseboardHeight: 138,
    chairRailHeight: 45,
    trimWidth: 65,
    spacing: 65,
    marginBottom: 0,
    marginTop: 0,
    twoTier: false
  },
  grid_feature_wall: {
    label: 'Full-Height Grid Batten',
    description: 'Modern 3-row architectural square grid',
    style: 'grid_batten',
    wainscotHeight: 2310,
    baseboardHeight: 138,
    chairRailHeight: 0,
    trimWidth: 65,
    gridRows: 3,
    gridRailWidth: 65,
    spacing: 65,
    marginBottom: 0,
    marginTop: 0,
    twoTier: false
  },
  cottage_beadboard: {
    label: 'Cottage Beadboard (1050mm)',
    description: 'Vertical tongue-and-groove with dado cap',
    style: 'beadboard',
    wainscotHeight: 1050,
    baseboardHeight: 138,
    chairRailHeight: 55,
    trimWidth: 65,
    spacing: 65,
    marginBottom: 0,
    marginTop: 0,
    twoTier: false
  }
};

export const DEFAULT_TRIM_SPEC: TrimSpec = {
  wainscotHeight: 950,
  baseboardHeight: 138,
  chairRailHeight: 50,
  corniceHeight: 90,
  style: 'picture_frame',
  wallColor: '#f4efe6',
  wallSheen: 'low_sheen',
  trimColor: '#f4efe6',
  trimSheen: 'semi_gloss',
  paintScope: 'auto',
  trimWidth: 40,
  innerGap: 60,
  gridRows: 2,
  gridRailWidth: 75,
  spacing: 100,
  marginBottom: 40,
  marginTop: 40,
  twoTier: false,
  tierRatio: 0.35,
  tierGap: 80
};

export const DEFAULT_STOCK_SETTINGS: StockSettings = {
  mouldingStockMm: 2400,
  railStockMm: 5400,
  kerfMm: 3
};

export const DEFAULT_UNIT_PRICES: UnitPrices = {
  mouldingPerMetre: 4.5,
  chairRailPerMetre: 12.0,
  baseboardPerMetre: 14.0,
  sheetPanelsPerSqM: 18.0,
  adhesiveTube: 8.5,
  caulkTube: 6.0,
  fillerTub: 9.0,
  wallPaintPerLitre: 38.0,
  trimPaintPerLitre: 44.0,
  nailsBox: 12.0
};

export function createWall(overrides: Partial<Wall> & { id: string; name: string }, trim: TrimSpec = DEFAULT_TRIM_SPEC): Wall {
  return {
    ...trim,
    wallLength: 3600,
    wallHeight: 2400,
    calcMode: 'auto_count',
    panelCount: 4,
    targetWidth: 750,
    marginMode: 'equal',
    customMargin: 100,
    followProjectTrim: true,
    obstacles: [],
    ...overrides
  };
}

/** Clean generic starter project (default on fresh load) */
export function createStarterProject(): Project {
  const trim = { ...DEFAULT_TRIM_SPEC };
  return {
    version: 2,
    unit: 'mm',
    currentWallIndex: 0,
    trimDefaults: trim,
    stockSettings: { ...DEFAULT_STOCK_SETTINGS },
    unitPrices: { ...DEFAULT_UNIT_PRICES },
    walls: [
      createWall(
        {
          id: 'wall-1',
          name: 'Living Room Feature Wall',
          wallLength: 3600,
          wallHeight: 2400,
          panelCount: 4,
          targetWidth: 775,
          obstacles: [
            {
              id: 'obs-gpo-1',
              name: 'Power Outlet',
              type: 'outlet',
              x: 420,
              y: 230,
              width: 115,
              height: 75
            }
          ]
        },
        trim
      )
    ]
  };
}

/** Stanhope Gardens Ground Floor — 7-Wall Option A Preset */
export function createStanhopeGardensProject(): Project {
  const trim: TrimSpec = { ...DEFAULT_TRIM_SPEC };
  return {
    version: 2,
    unit: 'mm',
    currentWallIndex: 0,
    trimDefaults: trim,
    stockSettings: { ...DEFAULT_STOCK_SETTINGS },
    unitPrices: { ...DEFAULT_UNIT_PRICES },
    walls: [
      createWall(
        {
          id: 'wall-1',
          name: 'Zone 1: Entry / Staircase Feature Wall',
          wallLength: 2970,
          wallHeight: 2400,
          panelCount: 3,
          targetWidth: 850,
          obstacles: [
            { id: 'obs-switch', name: 'Left Light Switch', type: 'outlet', x: 120, y: 1240, width: 115, height: 75 },
            { id: 'obs-tv', name: 'Bottom TV Outlet', type: 'outlet', x: 1435, y: 230, width: 115, height: 75 },
            { id: 'obs-gpo', name: 'Bottom GPO', type: 'outlet', x: 1580, y: 230, width: 115, height: 75 }
          ]
        },
        trim
      ),
      createWall(
        {
          id: 'wall-2',
          name: 'Zone 2: Formal Living Front Wall',
          wallLength: 3800,
          wallHeight: 2400,
          panelCount: 4,
          targetWidth: 825,
          obstacles: [
            { id: 'front-win', name: 'Front Window Opening', type: 'window', x: 1000, y: 1050, width: 1800, height: 1200, architraveMm: 65 }
          ]
        },
        trim
      ),
      createWall(
        {
          id: 'wall-3',
          name: 'Zone 2: Living & Dining Left Patio Wall',
          wallLength: 6000,
          wallHeight: 2400,
          calcMode: 'target_width',
          panelCount: 4,
          targetWidth: 740,
          obstacles: [
            { id: 'patio-door', name: 'Patio Sliding Door', type: 'door', x: 2100, y: 0, width: 2100, height: 2100, architraveMm: 70 }
          ]
        },
        trim
      ),
      createWall(
        {
          id: 'wall-4',
          name: 'Zone 2: Dining Rear Return Wall',
          wallLength: 2400,
          wallHeight: 2400,
          panelCount: 3,
          targetWidth: 670
        },
        trim
      ),
      createWall(
        {
          id: 'wall-5',
          name: 'Zone 3: Central Hallway Spine',
          wallLength: 3200,
          wallHeight: 2400,
          panelCount: 4,
          targetWidth: 675
        },
        trim
      ),
      createWall(
        {
          id: 'wall-6',
          name: 'Zone 4: Rear Family Main Feature Wall',
          wallLength: 5000,
          wallHeight: 2400,
          panelCount: 6,
          targetWidth: 715
        },
        trim
      ),
      createWall(
        {
          id: 'wall-7',
          name: 'Zone 4: Rear Family Side Wall',
          wallLength: 3500,
          wallHeight: 2400,
          panelCount: 4,
          targetWidth: 750
        },
        trim
      )
    ]
  };
}
