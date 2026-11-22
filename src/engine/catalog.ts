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

export interface TvUnitPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  legHeightMm: number;
  source: string;
}

export const TV_UNIT_PRESETS: Record<string, TvUnitPreset> = {
  castlery_seb_150: {
    id: 'castlery_seb_150',
    name: 'Castlery Seb TV Unit (1.5m)',
    widthMm: 1500,
    heightMm: 600,
    depthMm: 450,
    legHeightMm: 240,
    source: 'Castlery AU Seb TV Unit 1.5m (150 x 45 x 60 cm, 24 cm legs)'
  },
  loungelovers_ollie_160: {
    id: 'loungelovers_ollie_160',
    name: 'Lounge Lovers Ollie (1.6m)',
    widthMm: 1600,
    heightMm: 550,
    depthMm: 420,
    legHeightMm: 180,
    source: 'Lounge Lovers AU Ollie 160cm Oak TV Unit'
  },
  rjliving_muse_180: {
    id: 'rjliving_muse_180',
    name: 'RJ Living Muse (1.8m)',
    widthMm: 1800,
    heightMm: 520,
    depthMm: 420,
    legHeightMm: 180,
    source: 'RJ Living AU Muse 180cm Light Oak Entertainment Unit'
  },
  freedom_casier_180: {
    id: 'freedom_casier_180',
    name: 'Freedom Casier (1.8m)',
    widthMm: 1800,
    heightMm: 500,
    depthMm: 400,
    legHeightMm: 160,
    source: 'Freedom AU Casier 180cm Oak Entertainment Unit (180 x 40 cm)'
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

/** Default project: Feature Wall (2970mm) with 55" Hisense CanvasTV, Castlery Seb TV Unit & measured outlets */
export function createStarterProject(): Project {
  const trim = { ...DEFAULT_TRIM_SPEC };
  const tv = TV_PRESETS['55_canvas']!;
  const seb = TV_UNIT_PRESETS.castlery_seb_150!;
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
          name: 'Feature Wall (2970mm)',
          wallLength: 2970,
          wallHeight: 2400,
          panelCount: 3,
          targetWidth: 857,
          obstacles: [
            {
              id: 'obs-canvas-tv',
              name: tv.name,
              type: 'tv',
              x: Math.round((2970 - tv.widthMm) / 2), // 857 mm centered
              y: 1050, // 100 mm above 950 mm chair rail
              width: tv.widthMm,
              height: tv.heightMm
            },
            {
              id: 'obs-tv-unit',
              name: seb.name,
              type: 'furniture',
              x: Math.round((2970 - seb.widthMm) / 2), // 735 mm centered
              y: 0, // Freestanding on floor
              width: seb.widthMm,
              height: seb.heightMm
            },
            {
              id: 'obs-brush-tv',
              name: 'Deta Brush Wall Plate (Behind TV)',
              type: 'outlet',
              x: 1435, // Vertically aligned with Bottom TV Outlet in same stud bay
              y: 1180, // Lower third of TV, clear of UltraSlim mount above
              width: 118,
              height: 74
            },
            { id: 'obs-switch', name: 'Left Light Switch', type: 'outlet', x: 120, y: 1240, width: 115, height: 75 },
            { id: 'obs-tv', name: 'Bottom TV Outlet', type: 'outlet', x: 1435, y: 230, width: 115, height: 75 },
            { id: 'obs-gpo', name: 'Bottom GPO', type: 'outlet', x: 1580, y: 230, width: 115, height: 75 }
          ]
        },
        trim
      )
    ]
  };
}

/** Alias kept for backwards compatibility — returns the single Feature Wall with TV */
export function createStanhopeGardensProject(): Project {
  return createStarterProject();
}
