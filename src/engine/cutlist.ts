import type { CutPiece, Wall, WallGeometry } from './types';

export function computeCutList(geo: WallGeometry, w: Wall): CutPiece[] {
  const cuts: CutPiece[] = [];
  const style = w.style;

  if (geo.isBoardAndBatten) {
    const topRailH = geo.trimWidth;
    const battenH = Math.max(10, geo.wainscotHeight - geo.baseboardHeight - geo.chairRailHeight - topRailH);

    // Vertical Battens per segment
    let totalBattens = 0;
    geo.segmentLayouts.forEach((sl) => {
      totalBattens += sl.numPanels + 1;
    });

    if (totalBattens > 0) {
      cuts.push({
        tag: 'ST-VERT',
        name: 'Vertical Stile (Batten)',
        profile: 'batten',
        length: battenH,
        width: geo.trimWidth,
        cutType: '90° Square Cut Both Ends',
        quantity: totalBattens,
        totalLinear: totalBattens * battenH
      });
    }

    // Top Rail per clear segment
    geo.segmentLayouts.forEach((sl, idx) => {
      const segLabel = geo.segmentLayouts.length > 1 ? ` (Seg ${idx + 1})` : '';
      cuts.push({
        tag: geo.segmentLayouts.length > 1 ? `RL-TOP-S${idx + 1}` : 'RL-TOP',
        name: `Top Rail (Horizontal Cap)${segLabel}`,
        profile: 'top_rail',
        length: sl.segment.length,
        width: topRailH,
        cutType: '90° Butt / Scarf Joint',
        quantity: 1,
        totalLinear: sl.segment.length
      });

      if (style === 'grid_batten') {
        const rows = Math.max(1, Math.round(w.gridRows));
        const crossRailQty = sl.numPanels * (rows - 1);
        if (crossRailQty > 0) {
          cuts.push({
            tag: geo.segmentLayouts.length > 1 ? `RL-MID-S${idx + 1}` : 'RL-MID',
            name: `Grid Horizontal Cross Rail${segLabel}`,
            profile: 'cross_rail',
            length: sl.panelWidth,
            width: w.gridRailWidth,
            cutType: '90° Square Cut Both Ends',
            quantity: crossRailQty,
            totalLinear: crossRailQty * sl.panelWidth
          });
        }
      }

      if (style === 'recessed_shaker' || style === 'raised_panel') {
        cuts.push({
          tag: geo.segmentLayouts.length > 1 ? `PNL-SHEET-S${idx + 1}` : 'PNL-SHEET',
          name: `${style === 'recessed_shaker' ? 'MDF/Plywood Recessed' : 'Raised'} Infill Panel${segLabel}`,
          profile: 'infill_sheet',
          length: sl.panelWidth,
          width: battenH,
          cutType: '90° Table Saw Rip/Crosscut',
          quantity: sl.numPanels,
          totalLinear: sl.numPanels * (sl.panelWidth + battenH) * 2
        });
      }
    });
  } else {
    // Picture Frame Mouldings (outer-to-outer long-point miter dimensions)
    geo.panels.forEach((p) => {
      cuts.push({
        tag: `${p.id}-H`,
        name: `Box Frame Horizontals (${p.id})`,
        profile: 'outer_moulding',
        length: p.width,
        width: geo.trimWidth,
        cutType: '45° Miter Both Ends',
        quantity: 2,
        totalLinear: 2 * p.width
      });

      cuts.push({
        tag: `${p.id}-V`,
        name: `Box Frame Verticals (${p.id})`,
        profile: 'outer_moulding',
        length: p.height,
        width: geo.trimWidth,
        cutType: '45° Miter Both Ends',
        quantity: 2,
        totalLinear: 2 * p.height
      });

      if (w.style === 'double_picture_frame') {
        const innerW = p.width - geo.trimWidth * 2 - geo.innerGap * 2;
        const innerH = p.height - geo.trimWidth * 2 - geo.innerGap * 2;
        if (innerW > 20 && innerH > 20) {
          const innerTrimW = Math.max(10, Math.round(geo.trimWidth * 0.75));
          cuts.push({
            tag: `${p.id}-IN-H`,
            name: `Inner Nested Horizontals (${p.id})`,
            profile: 'inner_moulding',
            length: innerW,
            width: innerTrimW,
            cutType: '45° Miter Both Ends',
            quantity: 2,
            totalLinear: 2 * innerW
          });
          cuts.push({
            tag: `${p.id}-IN-V`,
            name: `Inner Nested Verticals (${p.id})`,
            profile: 'inner_moulding',
            length: innerH,
            width: innerTrimW,
            cutType: '45° Miter Both Ends',
            quantity: 2,
            totalLinear: 2 * innerH
          });
        }
      }
    });
  }

  // Chair Rail — split cleanly across clear runs (deducting doors / low windows)
  if (geo.chairRailHeight > 0) {
    geo.clearChairRailRuns.forEach((run, idx) => {
      const multi = geo.clearChairRailRuns.length > 1;
      cuts.push({
        tag: multi ? `CHR-RAIL-${idx + 1}` : 'CHR-RAIL',
        name: multi ? `Chair Rail Run #${idx + 1}` : 'Chair Rail (Dado Profile)',
        profile: 'chair_rail',
        length: run.length,
        width: geo.chairRailHeight,
        cutType: '90° / 45° Corner Miters',
        quantity: 1,
        totalLinear: run.length
      });
    });
  }

  // Baseboard / Skirting — split cleanly across clear runs (deducting doors)
  if (geo.baseboardHeight > 0) {
    geo.clearBaseboardRuns.forEach((run, idx) => {
      const multi = geo.clearBaseboardRuns.length > 1;
      cuts.push({
        tag: multi ? `BASE-BRD-${idx + 1}` : 'BASE-BRD',
        name: multi ? `Baseboard Run #${idx + 1}` : 'Baseboard / Skirting Profile',
        profile: 'baseboard',
        length: run.length,
        width: geo.baseboardHeight,
        cutType: '90° / 45° Corner Miters',
        quantity: 1,
        totalLinear: run.length
      });
    });
  }

  return cuts;
}
