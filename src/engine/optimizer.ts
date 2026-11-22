import type {
  CutPiece,
  CutProfile,
  FlatCut,
  OversizeCut,
  PackedResult,
  ProfileStockPlan,
  StockBoard,
  StockSettings
} from './types';

export const PROFILE_LABELS: Record<CutProfile, string> = {
  outer_moulding: 'Outer Box Moulding',
  inner_moulding: 'Inner Nested Moulding',
  batten: 'Vertical Batten / Stile',
  top_rail: 'Top Rail (Horizontal Cap)',
  cross_rail: 'Grid Cross Rail',
  chair_rail: 'Chair Rail (Dado Cap)',
  baseboard: 'Baseboard / Skirting',
  infill_sheet: 'Infill Sheet Panels (2D)'
};

const PROFILE_ORDER: CutProfile[] = [
  'outer_moulding',
  'inner_moulding',
  'batten',
  'top_rail',
  'cross_rail',
  'chair_rail',
  'baseboard'
];

export function buildFlatCuts(cuts: CutPiece[], prefix?: string): FlatCut[] {
  const flat: FlatCut[] = [];
  for (const c of cuts) {
    if (c.profile === 'infill_sheet') continue;
    for (let i = 0; i < c.quantity; i++) {
      flat.push({
        tag: prefix ? `${prefix}: ${c.tag}` : c.tag,
        length: c.length,
        profile: c.profile
      });
    }
  }
  return flat;
}

/**
 * Best-fit-decreasing 1D bin packing.
 * Pieces longer than stockLength are split into full-board segments plus a remainder
 * and reported in `oversize` so the carpenter knows where scarf joints are required.
 */
export function packCuts(flatCuts: FlatCut[], stockLength: number, kerf: number): PackedResult {
  const safeStock = Math.max(100, stockLength);
  const safeKerf = Math.max(0, kerf);
  const oversize: OversizeCut[] = [];
  const pieces: FlatCut[] = [];

  for (const c of flatCuts) {
    if (c.length <= 0) continue;
    if (c.length > safeStock) {
      const full = Math.floor(c.length / safeStock);
      const rest = c.length - full * safeStock;
      oversize.push({ tag: c.tag, length: c.length, joints: rest > 0 ? full : full - 1 });
      for (let i = 0; i < full; i++) {
        pieces.push({ tag: `${c.tag} (seg ${i + 1})`, length: safeStock, profile: c.profile });
      }
      if (rest > 0.5) {
        pieces.push({ tag: `${c.tag} (rem)`, length: rest, profile: c.profile });
      }
    } else {
      pieces.push(c);
    }
  }

  pieces.sort((a, b) => b.length - a.length);

  const boards: StockBoard[] = [];
  for (const cutObj of pieces) {
    const cut = cutObj.length;
    let bestBoard = -1;
    let minRemainingAfter = Infinity;

    for (let i = 0; i < boards.length; i++) {
      const b = boards[i]!;
      const needed = b.items.length > 0 ? cut + safeKerf : cut;
      if (b.remaining >= needed) {
        const rem = b.remaining - needed;
        if (rem < minRemainingAfter) {
          minRemainingAfter = rem;
          bestBoard = i;
        }
      }
    }

    if (bestBoard !== -1) {
      const b = boards[bestBoard]!;
      const needed = b.items.length > 0 ? cut + safeKerf : cut;
      b.remaining -= needed;
      b.items.push(cutObj);
    } else {
      boards.push({
        boardIndex: boards.length + 1,
        remaining: safeStock - cut,
        items: [cutObj]
      });
    }
  }

  const totalCutLength = pieces.reduce((acc, c) => acc + c.length, 0);
  const totalStockUsed = boards.length * safeStock;
  const wastePct = totalStockUsed > 0 ? ((totalStockUsed - totalCutLength) / totalStockUsed) * 100 : 0;

  return { boards, oversize, totalCutLength, totalStockUsed, wastePct };
}

/**
 * Packs cuts grouped by trim profile so different moulding widths/profiles
 * are never mixed onto the same stock board.
 */
export function packCutsByProfile(flatCuts: FlatCut[], settings: StockSettings): ProfileStockPlan[] {
  const byProfile = new Map<CutProfile, FlatCut[]>();
  for (const cut of flatCuts) {
    const arr = byProfile.get(cut.profile) ?? [];
    arr.push(cut);
    byProfile.set(cut.profile, arr);
  }

  const plans: ProfileStockPlan[] = [];
  for (const profile of PROFILE_ORDER) {
    const list = byProfile.get(profile);
    if (!list || list.length === 0) continue;
    const stockLengthMm =
      profile === 'chair_rail' || profile === 'baseboard'
        ? settings.railStockMm
        : settings.mouldingStockMm;
    plans.push({
      profile,
      label: PROFILE_LABELS[profile],
      stockLengthMm,
      kerfMm: settings.kerfMm,
      pieceCount: list.length,
      packed: packCuts(list, stockLengthMm, settings.kerfMm)
    });
  }

  return plans;
}
