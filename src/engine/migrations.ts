import {
  DEFAULT_STOCK_SETTINGS,
  DEFAULT_TRIM_SPEC,
  DEFAULT_UNIT_PRICES,
  createWall
} from './catalog';
import type { Obstacle, ObstacleType, Project, TrimSpec, Unit, UnitPrices, Wall } from './types';
import { MM_PER_INCH } from './units';

const VALID_OBSTACLE_TYPES: ObstacleType[] = ['outlet', 'door', 'window', 'tv', 'furniture', 'other'];

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Validates and migrates any v1 (legacy) or v2 JSON project into a canonical mm v2 Project.
 * Throws Error with a clear message on unusable inputs.
 */
export function normalizeProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('File is not a valid project object');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.walls) || obj.walls.length === 0) {
    throw new Error('Project contains no walls');
  }

  const version = obj.version === undefined ? 1 : Number(obj.version);
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported project version ${String(obj.version)}`);
  }

  const rawUnit = obj.unit;
  if (rawUnit !== undefined && rawUnit !== 'mm' && rawUnit !== 'in') {
    throw new Error('Unit must be "mm" or "in"');
  }
  const unit: Unit = rawUnit === 'in' ? 'in' : 'mm';
  // Legacy v1 stored wall dimensions in `unit`; v2 always stores canonical mm
  const scaleToMm = version === 1 && unit === 'in' ? MM_PER_INCH : 1;

  const rawTrim = (obj.trimDefaults && typeof obj.trimDefaults === 'object'
    ? (obj.trimDefaults as Record<string, unknown>)
    : null);

  const trimDefaults: TrimSpec = {
    ...DEFAULT_TRIM_SPEC,
    ...(rawTrim ?? {})
  };

  const walls: Wall[] = obj.walls.map((wRaw, i) => {
    if (!wRaw || typeof wRaw !== 'object' || Array.isArray(wRaw)) {
      throw new Error(`Wall ${i + 1} is invalid`);
    }
    const w = wRaw as Record<string, unknown>;
    const wallLength = toNum(w.wallLength, 0) * scaleToMm;
    const wallHeight = toNum(w.wallHeight, 0) * scaleToMm;
    const wainscotHeight = toNum(w.wainscotHeight, 0) * scaleToMm;

    if (!(wallLength > 0)) throw new Error(`Wall ${i + 1}: wallLength must be positive`);
    if (!(wallHeight > 0)) throw new Error(`Wall ${i + 1}: wallHeight must be positive`);
    if (!(wainscotHeight > 0)) throw new Error(`Wall ${i + 1}: wainscotHeight must be positive`);

    const rawObstacles = Array.isArray(w.obstacles) ? w.obstacles : [];
    const obstacles: Obstacle[] = rawObstacles
      .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
      .map((o, oi) => {
        const rawType = String(o.type || 'outlet') as ObstacleType;
        const type: ObstacleType = VALID_OBSTACLE_TYPES.includes(rawType) ? rawType : 'other';
        return {
          id: String(o.id || `obs-${i + 1}-${oi + 1}`),
          name: String(o.name || 'Obstacle'),
          type,
          x: Math.round(toNum(o.x, 0) * scaleToMm * 10) / 10,
          y: Math.round(toNum(o.y, 0) * scaleToMm * 10) / 10,
          width: Math.max(0, Math.round(toNum(o.width, 100) * scaleToMm * 10) / 10),
          height: Math.max(0, Math.round(toNum(o.height, 100) * scaleToMm * 10) / 10),
          architraveMm:
            o.architraveMm !== undefined
              ? Math.max(0, toNum(o.architraveMm, 0) * scaleToMm)
              : type === 'door'
                ? 70
                : 0
        };
      });

    return createWall(
      {
        id: String(w.id || `wall-${i + 1}`),
        name: String(w.name || `Wall ${i + 1}`),
        wallLength: Math.round(wallLength * 10) / 10,
        wallHeight: Math.round(wallHeight * 10) / 10,
        wainscotHeight: Math.round(wainscotHeight * 10) / 10,
        baseboardHeight: Math.max(0, Math.round(toNum(w.baseboardHeight, trimDefaults.baseboardHeight) * scaleToMm * 10) / 10),
        chairRailHeight: Math.max(0, Math.round(toNum(w.chairRailHeight, trimDefaults.chairRailHeight) * scaleToMm * 10) / 10),
        corniceHeight: Math.max(0, Math.round(toNum(w.corniceHeight, trimDefaults.corniceHeight) * scaleToMm * 10) / 10),
        style: (w.style as Wall['style']) || trimDefaults.style,
        wallColor: String(w.wallColor || trimDefaults.wallColor),
        wallSheen: (w.wallSheen as Wall['wallSheen']) || trimDefaults.wallSheen,
        trimColor: String(w.trimColor || trimDefaults.trimColor),
        trimSheen: (w.trimSheen as Wall['trimSheen']) || trimDefaults.trimSheen,
        paintScope: (w.paintScope as Wall['paintScope']) || trimDefaults.paintScope,
        trimWidth: Math.max(1, Math.round(toNum(w.trimWidth, trimDefaults.trimWidth) * scaleToMm * 10) / 10),
        innerGap: Math.max(0, Math.round(toNum(w.innerGap, trimDefaults.innerGap) * scaleToMm * 10) / 10),
        gridRows: Math.max(1, Math.round(toNum(w.gridRows, trimDefaults.gridRows))),
        gridRailWidth: Math.max(1, Math.round(toNum(w.gridRailWidth, trimDefaults.gridRailWidth) * scaleToMm * 10) / 10),
        calcMode: (w.calcMode as Wall['calcMode']) || 'auto_count',
        panelCount: Math.max(1, Math.round(toNum(w.panelCount, 4))),
        targetWidth: Math.max(50, Math.round(toNum(w.targetWidth, 750) * scaleToMm * 10) / 10),
        spacing: Math.max(0, Math.round(toNum(w.spacing, trimDefaults.spacing) * scaleToMm * 10) / 10),
        marginMode: (w.marginMode as Wall['marginMode']) || 'equal',
        customMargin: Math.max(0, Math.round(toNum(w.customMargin, 100) * scaleToMm * 10) / 10),
        marginBottom: Math.max(0, Math.round(toNum(w.marginBottom, trimDefaults.marginBottom) * scaleToMm * 10) / 10),
        marginTop: Math.max(0, Math.round(toNum(w.marginTop, trimDefaults.marginTop) * scaleToMm * 10) / 10),
        twoTier: Boolean(w.twoTier),
        tierRatio: Math.min(0.85, Math.max(0.15, toNum(w.tierRatio, trimDefaults.tierRatio))),
        tierGap: Math.max(0, Math.round(toNum(w.tierGap, trimDefaults.tierGap) * scaleToMm * 10) / 10),
        followProjectTrim: w.followProjectTrim !== undefined ? Boolean(w.followProjectTrim) : true,
        obstacles
      },
      trimDefaults
    );
  });

  const rawPrices = (obj.unitPrices && typeof obj.unitPrices === 'object'
    ? (obj.unitPrices as Record<string, unknown>)
    : {});

  // Map legacy v1 price field names cleanly to v2 canonical price names
  const unitPrices: UnitPrices = {
    mouldingPerMetre: toNum(rawPrices.mouldingPerMetre ?? rawPrices.mouldingPerUnit, DEFAULT_UNIT_PRICES.mouldingPerMetre),
    chairRailPerMetre: toNum(rawPrices.chairRailPerMetre ?? rawPrices.chairRailPerUnit, DEFAULT_UNIT_PRICES.chairRailPerMetre),
    baseboardPerMetre: toNum(rawPrices.baseboardPerMetre ?? rawPrices.baseboardPerUnit, DEFAULT_UNIT_PRICES.baseboardPerMetre),
    sheetPanelsPerSqM: toNum(rawPrices.sheetPanelsPerSqM ?? rawPrices.sheetPanelsPerSqUnit, DEFAULT_UNIT_PRICES.sheetPanelsPerSqM),
    adhesiveTube: toNum(rawPrices.adhesiveTube, DEFAULT_UNIT_PRICES.adhesiveTube),
    caulkTube: toNum(rawPrices.caulkTube, DEFAULT_UNIT_PRICES.caulkTube),
    fillerTub: toNum(rawPrices.fillerTub, DEFAULT_UNIT_PRICES.fillerTub),
    wallPaintPerLitre: toNum(rawPrices.wallPaintPerLitre ?? rawPrices.wallPaintPerUnit ?? rawPrices.paintPerUnit, DEFAULT_UNIT_PRICES.wallPaintPerLitre),
    trimPaintPerLitre: toNum(rawPrices.trimPaintPerLitre ?? rawPrices.trimPaintPerUnit, DEFAULT_UNIT_PRICES.trimPaintPerLitre),
    nailsBox: toNum(rawPrices.nailsBox, DEFAULT_UNIT_PRICES.nailsBox)
  };

  const rawStock = (obj.stockSettings && typeof obj.stockSettings === 'object'
    ? (obj.stockSettings as Record<string, unknown>)
    : {});

  const stockSettings = {
    mouldingStockMm: Math.max(500, toNum(rawStock.mouldingStockMm, DEFAULT_STOCK_SETTINGS.mouldingStockMm)),
    railStockMm: Math.max(500, toNum(rawStock.railStockMm, DEFAULT_STOCK_SETTINGS.railStockMm)),
    kerfMm: Math.max(0, toNum(rawStock.kerfMm, DEFAULT_STOCK_SETTINGS.kerfMm))
  };

  const rawIdx = Number(obj.currentWallIndex);
  const currentWallIndex =
    Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < walls.length ? rawIdx : 0;

  return {
    version: 2,
    unit,
    currentWallIndex,
    trimDefaults,
    stockSettings,
    unitPrices,
    walls
  };
}
