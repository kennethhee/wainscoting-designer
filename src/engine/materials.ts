import { computeCutList } from './cutlist';
import { computeWallGeometry } from './geometry';
import { buildFlatCuts, packCutsByProfile } from './optimizer';
import type {
  CostLineItem,
  CutPiece,
  MaterialsEstimate,
  PaintAreaResult,
  ProjectTotals,
  StockSettings,
  Unit,
  UnitPrices,
  Wall
} from './types';
import { LITRES_PER_GALLON, MM_PER_FOOT, SQFT_PER_SQM } from './units';

/**
 * Computes net painted wall area in square metres.
 * Deducts ceiling coving drop and baseboard height (actual painted wall surface),
 * and subtracts doors, windows, and TVs clipped to the painted vertical span.
 */
export function computePaintArea(w: Wall): PaintAreaResult {
  const scope = w.paintScope || 'auto';
  const drench = w.wallColor.toLowerCase() === w.trimColor.toLowerCase();
  const fullWall = scope === 'full_wall' || (scope === 'auto' && drench);

  const baseH = Math.max(0, w.baseboardHeight);
  const corniceH = Math.max(0, w.corniceHeight);
  const paintedBottomMm = baseH;
  const paintedTopMm = fullWall
    ? Math.max(baseH, w.wallHeight - corniceH)
    : Math.max(baseH, Math.min(w.wainscotHeight, w.wallHeight - corniceH));

  const paintedSpanMm = Math.max(0, paintedTopMm - paintedBottomMm);
  let areaSqMm = w.wallLength * paintedSpanMm;

  for (const o of w.obstacles) {
    if (o.type !== 'door' && o.type !== 'window' && o.type !== 'tv') continue;
    const ox = Math.max(0, Math.min(o.x + o.width, w.wallLength) - Math.max(o.x, 0));
    const oy = Math.max(0, Math.min(o.y + o.height, paintedTopMm) - Math.max(o.y, paintedBottomMm));
    areaSqMm -= ox * oy;
  }

  return {
    areaSqM: Math.max(0, areaSqMm) / 1e6,
    fullWall,
    paintedBottomMm,
    paintedTopMm
  };
}

/**
 * Single source of truth for materials & itemized cost (used for both
 * single-wall view and whole-project totals so every cost row sums exactly to totalCost).
 */
export function computeMaterialsEstimate(
  walls: Wall[],
  cuts: CutPiece[],
  unit: Unit,
  prices: UnitPrices
): MaterialsEstimate {
  const isMm = unit === 'mm';

  let mouldingLinearMm = 0;
  let chairRailLinearMm = 0;
  let baseboardLinearMm = 0;
  let infillAreaSqM = 0;
  let totalPieces = 0;

  for (const c of cuts) {
    totalPieces += c.quantity;
    if (c.profile === 'chair_rail') {
      chairRailLinearMm += c.totalLinear;
    } else if (c.profile === 'baseboard') {
      baseboardLinearMm += c.totalLinear;
    } else if (c.profile === 'infill_sheet') {
      infillAreaSqM += (c.quantity * c.length * c.width) / 1e6;
    } else {
      mouldingLinearMm += c.totalLinear;
    }
  }

  const paintAreaSqM = walls.reduce((acc, w) => acc + computePaintArea(w).areaSqM, 0);

  const mouldingM = mouldingLinearMm / 1000;
  const chairRailM = chairRailLinearMm / 1000;
  const baseboardM = baseboardLinearMm / 1000;
  const trimLinearM = mouldingM + chairRailM + baseboardM;

  // Hardware & consumables
  const nails = Math.round(trimLinearM * 5 + totalPieces * 4);
  const nailsBoxes = Math.max(1, Math.ceil(nails / 1000));
  const adhesiveTubes = Math.max(1, Math.ceil(trimLinearM / 8));
  const caulkTubes = Math.max(1, Math.ceil((trimLinearM * 2) / 15));
  const fillerTubs = Math.max(1, Math.ceil(nails / 500));

  // Paint (2 coats): Wall paint ~11 m^2/L, Trim enamel ~12 linear m/L
  const wallPaintLitres = Math.max(1, (paintAreaSqM * 2) / 11);
  const wallPaintCans = Math.ceil(wallPaintLitres);
  const trimPaintLitres = Math.max(0.5, trimLinearM / 12);
  const trimPaintCans = Math.ceil(trimPaintLitres);

  const lineItems: CostLineItem[] = [];

  if (mouldingLinearMm > 0) {
    lineItems.push({
      id: 'moulding',
      label: 'Moulding & Batten Trim',
      quantityDisplay: isMm ? `${mouldingM.toFixed(1)} m` : `${(mouldingLinearMm / MM_PER_FOOT).toFixed(1)} ft`,
      priceKey: 'mouldingPerMetre',
      unitPrice: prices.mouldingPerMetre,
      unitLabel: '/m',
      subtotal: mouldingM * prices.mouldingPerMetre
    });
  }

  if (chairRailLinearMm > 0) {
    lineItems.push({
      id: 'chair_rail',
      label: 'Chair Rail Profile',
      quantityDisplay: isMm ? `${chairRailM.toFixed(1)} m` : `${(chairRailLinearMm / MM_PER_FOOT).toFixed(1)} ft`,
      priceKey: 'chairRailPerMetre',
      unitPrice: prices.chairRailPerMetre,
      unitLabel: '/m',
      subtotal: chairRailM * prices.chairRailPerMetre
    });
  }

  if (baseboardLinearMm > 0) {
    lineItems.push({
      id: 'baseboard',
      label: 'Baseboard / Skirting Trim',
      quantityDisplay: isMm ? `${baseboardM.toFixed(1)} m` : `${(baseboardLinearMm / MM_PER_FOOT).toFixed(1)} ft`,
      priceKey: 'baseboardPerMetre',
      unitPrice: prices.baseboardPerMetre,
      unitLabel: '/m',
      subtotal: baseboardM * prices.baseboardPerMetre
    });
  }

  if (infillAreaSqM > 0) {
    lineItems.push({
      id: 'infill_sheet',
      label: 'Infill Sheet Panels',
      quantityDisplay: isMm ? `${infillAreaSqM.toFixed(2)} m²` : `${(infillAreaSqM * SQFT_PER_SQM).toFixed(1)} sq ft`,
      priceKey: 'sheetPanelsPerSqM',
      unitPrice: prices.sheetPanelsPerSqM,
      unitLabel: '/m²',
      subtotal: infillAreaSqM * prices.sheetPanelsPerSqM
    });
  }

  lineItems.push(
    {
      id: 'adhesive',
      label: 'Construction Adhesive (300ml)',
      quantityDisplay: `${adhesiveTubes} tubes`,
      priceKey: 'adhesiveTube',
      unitPrice: prices.adhesiveTube,
      unitLabel: '/tube',
      subtotal: adhesiveTubes * prices.adhesiveTube
    },
    {
      id: 'caulk',
      label: "Painter's Caulk",
      quantityDisplay: `${caulkTubes} tubes`,
      priceKey: 'caulkTube',
      unitPrice: prices.caulkTube,
      unitLabel: '/tube',
      subtotal: caulkTubes * prices.caulkTube
    },
    {
      id: 'filler',
      label: 'Wood Filler / Spackle',
      quantityDisplay: `${fillerTubs} ${fillerTubs === 1 ? 'tub' : 'tubs'}`,
      priceKey: 'fillerTub',
      unitPrice: prices.fillerTub,
      unitLabel: '/tub',
      subtotal: fillerTubs * prices.fillerTub
    },
    {
      id: 'nails',
      label: '18-Gauge Brad Nails (Box of 1,000)',
      quantityDisplay: `${nailsBoxes} ${nailsBoxes === 1 ? 'box' : 'boxes'}`,
      priceKey: 'nailsBox',
      unitPrice: prices.nailsBox,
      unitLabel: '/box',
      subtotal: nailsBoxes * prices.nailsBox
    },
    {
      id: 'wall_paint',
      label: 'Wall Paint (Low Sheen, 2 coats)',
      quantityDisplay: isMm
        ? `${wallPaintCans} L (${wallPaintLitres.toFixed(1)} L est.)`
        : `${(wallPaintLitres / LITRES_PER_GALLON).toFixed(2)} Gal (${wallPaintCans} L)`,
      priceKey: 'wallPaintPerLitre',
      unitPrice: prices.wallPaintPerLitre,
      unitLabel: '/L',
      subtotal: wallPaintCans * prices.wallPaintPerLitre
    },
    {
      id: 'trim_paint',
      label: 'Trim Enamel (Semi-Gloss, 2 coats)',
      quantityDisplay: isMm
        ? `${trimPaintCans} L (${trimPaintLitres.toFixed(1)} L est.)`
        : `${(trimPaintLitres / LITRES_PER_GALLON).toFixed(2)} Gal (${trimPaintCans} L)`,
      priceKey: 'trimPaintPerLitre',
      unitPrice: prices.trimPaintPerLitre,
      unitLabel: '/L',
      subtotal: trimPaintCans * prices.trimPaintPerLitre
    }
  );

  const totalCost = lineItems.reduce((acc, item) => acc + item.subtotal, 0);

  return {
    wallCount: walls.length,
    mouldingLinearMm,
    chairRailLinearMm,
    baseboardLinearMm,
    infillAreaSqM,
    totalPieces,
    nails,
    nailsBoxes,
    adhesiveTubes,
    caulkTubes,
    fillerTubs,
    paintAreaSqM,
    wallPaintLitres,
    wallPaintCans,
    trimPaintLitres,
    trimPaintCans,
    lineItems,
    totalCost
  };
}

export function computeProjectTotals(
  walls: Wall[],
  unit: Unit,
  stockSettings: StockSettings,
  prices: UnitPrices
): ProjectTotals {
  const rows: CutPiece[] = [];
  let allFlat: ReturnType<typeof buildFlatCuts> = [];
  let perWallBoards = 0;

  for (const w of walls) {
    const geo = computeWallGeometry(w);
    const cuts = computeCutList(geo, w);
    const wallFlat = buildFlatCuts(cuts);
    const wallPlans = packCutsByProfile(wallFlat, stockSettings);
    perWallBoards += wallPlans.reduce((acc, p) => acc + p.packed.boards.length, 0);

    allFlat = allFlat.concat(buildFlatCuts(cuts, w.name));
    for (const c of cuts) {
      rows.push({ ...c, wallName: w.name });
    }
  }

  const profilePlans = packCutsByProfile(allFlat, stockSettings);
  const totalBoards = profilePlans.reduce((acc, p) => acc + p.packed.boards.length, 0);
  const materials = computeMaterialsEstimate(walls, rows, unit, prices);

  return {
    wallCount: walls.length,
    rows,
    profilePlans,
    totalBoards,
    perWallBoards,
    materials
  };
}
