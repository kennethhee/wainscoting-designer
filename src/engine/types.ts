export type Unit = 'mm' | 'in';

export type WainscotStyle =
  | 'picture_frame'
  | 'double_picture_frame'
  | 'board_and_batten'
  | 'grid_batten'
  | 'recessed_shaker'
  | 'raised_panel'
  | 'beadboard';

export type CalcMode = 'auto_count' | 'target_width' | 'fixed_spacing';
export type MarginMode = 'equal' | 'custom';
export type PaintScope = 'auto' | 'full_wall' | 'wainscot_only';
export type Sheen = 'matte' | 'low_sheen' | 'satin' | 'semi_gloss' | 'gloss';
export type ObstacleType = 'outlet' | 'door' | 'window' | 'tv' | 'furniture' | 'other';

export type CutProfile =
  | 'outer_moulding'
  | 'inner_moulding'
  | 'batten'
  | 'top_rail'
  | 'cross_rail'
  | 'chair_rail'
  | 'baseboard'
  | 'infill_sheet';

export interface Obstacle {
  id: string;
  name: string;
  type: ObstacleType;
  /** Distance from left edge of wall in mm */
  x: number;
  /** Distance from floor (bottom edge) in mm */
  y: number;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Optional architrave/casing clearance around doors/windows in mm (default 0 for outlets/TV, 70 for doors) */
  architraveMm?: number;
}

export interface TrimSpec {
  wainscotHeight: number;
  baseboardHeight: number;
  chairRailHeight: number;
  corniceHeight: number;
  style: WainscotStyle;
  wallColor: string;
  wallSheen: Sheen;
  trimColor: string;
  trimSheen: Sheen;
  paintScope: PaintScope;
  trimWidth: number;
  innerGap: number;
  gridRows: number;
  gridRailWidth: number;
  spacing: number;
  marginBottom: number;
  marginTop: number;
  twoTier: boolean;
  tierRatio: number;
  tierGap: number;
}

export interface Wall extends TrimSpec {
  id: string;
  name: string;
  /** Canonical mm */
  wallLength: number;
  /** Canonical mm */
  wallHeight: number;
  calcMode: CalcMode;
  panelCount: number;
  targetWidth: number;
  marginMode: MarginMode;
  customMargin: number;
  /** When true, wall inherits project trimDefaults changes automatically */
  followProjectTrim: boolean;
  obstacles: Obstacle[];
}

export interface UnitPrices {
  /** Per linear metre (or per linear foot when displayed in inches, stored internally per metre) */
  mouldingPerMetre: number;
  chairRailPerMetre: number;
  baseboardPerMetre: number;
  sheetPanelsPerSqM: number;
  adhesiveTube: number;
  caulkTube: number;
  fillerTub: number;
  wallPaintPerLitre: number;
  trimPaintPerLitre: number;
  nailsBox: number;
}

export interface StockSettings {
  /** Default stock board length in mm (e.g. 2400, 3000, 3600, 5400) */
  mouldingStockMm: number;
  /** Skirting & chair rail stock length in mm (e.g. 5400 for Australian F/J pine) */
  railStockMm: number;
  /** Saw blade kerf in mm */
  kerfMm: number;
}

export interface Project {
  version: 2;
  unit: Unit;
  currentWallIndex: number;
  trimDefaults: TrimSpec;
  stockSettings: StockSettings;
  unitPrices: UnitPrices;
  walls: Wall[];
}

export interface WallSegment {
  index: number;
  startX: number;
  endX: number;
  length: number;
  leftBoundary: 'wall' | 'opening';
  rightBoundary: 'wall' | 'opening';
}

export interface PanelRect {
  id: string;
  segmentIndex: number;
  index: number;
  tier: 'single' | 'lower' | 'upper';
  row?: number;
  /** Exact outer-to-outer left edge in mm */
  x: number;
  /** Exact outer-to-outer bottom edge from floor in mm */
  y: number;
  /** Exact outer-to-outer width (long-point miter) in mm */
  width: number;
  /** Exact outer-to-outer height (long-point miter) in mm */
  height: number;
}

export interface Conflict {
  id: string;
  severity: 'error' | 'warning';
  obstacleId: string;
  obstacleName: string;
  item: string;
  suggestion?: string;
}

export interface SegmentLayout {
  segment: WallSegment;
  numPanels: number;
  panelWidth: number;
  spacing: number;
  leftMargin: number;
  rightMargin: number;
}

export interface WallGeometry {
  wallLength: number;
  wallHeight: number;
  wainscotHeight: number;
  baseboardHeight: number;
  chairRailHeight: number;
  corniceHeight: number;
  trimWidth: number;
  innerGap: number;
  isBoardAndBatten: boolean;
  segments: WallSegment[];
  segmentLayouts: SegmentLayout[];
  /** Total panels across all segments */
  numPanels: number;
  /** Representative panel width (first non-empty segment) */
  panelWidth: number;
  panelHeight: number;
  /** Representative spacing (first non-empty segment) */
  spacing: number;
  leftMargin: number;
  rightMargin: number;
  /** Clear horizontal linear length for baseboard (after deducting floor-level openings) */
  clearBaseboardRuns: WallSegment[];
  /** Clear horizontal linear length for chair rail (after deducting openings crossing chair rail) */
  clearChairRailRuns: WallSegment[];
  panels: PanelRect[];
  conflicts: Conflict[];
}

export interface CutPiece {
  tag: string;
  name: string;
  profile: CutProfile;
  /** Length in mm */
  length: number;
  /** Width/height of profile in mm */
  width: number;
  cutType: string;
  quantity: number;
  /** quantity * length (or perimeter for sheet) in mm */
  totalLinear: number;
  wallName?: string;
}

export interface FlatCut {
  tag: string;
  length: number;
  profile: CutProfile;
}

export interface OversizeCut {
  tag: string;
  length: number;
  joints: number;
}

export interface StockBoard {
  boardIndex: number;
  remaining: number;
  items: FlatCut[];
}

export interface PackedResult {
  boards: StockBoard[];
  oversize: OversizeCut[];
  totalCutLength: number;
  totalStockUsed: number;
  wastePct: number;
}

export interface ProfileStockPlan {
  profile: CutProfile;
  label: string;
  stockLengthMm: number;
  kerfMm: number;
  pieceCount: number;
  packed: PackedResult;
}

export interface PaintAreaResult {
  /** Net painted wall area in m^2 (deducting coving, baseboard, and openings) */
  areaSqM: number;
  fullWall: boolean;
  paintedBottomMm: number;
  paintedTopMm: number;
}

export interface CostLineItem {
  id: string;
  label: string;
  quantityDisplay: string;
  priceKey: keyof UnitPrices;
  unitPrice: number;
  unitLabel: string;
  subtotal: number;
}

export interface MaterialsEstimate {
  wallCount: number;
  mouldingLinearMm: number;
  chairRailLinearMm: number;
  baseboardLinearMm: number;
  infillAreaSqM: number;
  totalPieces: number;
  nails: number;
  nailsBoxes: number;
  adhesiveTubes: number;
  caulkTubes: number;
  fillerTubs: number;
  paintAreaSqM: number;
  wallPaintLitres: number;
  wallPaintCans: number;
  trimPaintLitres: number;
  trimPaintCans: number;
  lineItems: CostLineItem[];
  totalCost: number;
}

export interface ProjectTotals {
  wallCount: number;
  rows: CutPiece[];
  profilePlans: ProfileStockPlan[];
  totalBoards: number;
  perWallBoards: number;
  materials: MaterialsEstimate;
}
