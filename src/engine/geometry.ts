import { computeClearRuns } from './segments';
import type { Conflict, PanelRect, SegmentLayout, Wall, WallGeometry, WallSegment } from './types';

export function isBoardAndBattenStyle(style: Wall['style']): boolean {
  return (
    style === 'board_and_batten' ||
    style === 'grid_batten' ||
    style === 'recessed_shaker' ||
    style === 'raised_panel' ||
    style === 'beadboard'
  );
}

function layoutSegment(
  segment: WallSegment,
  w: Wall,
  assignedPanels: number,
  isBoardAndBatten: boolean
): SegmentLayout {
  const segLen = segment.length;
  const trimW = Math.max(1, w.trimWidth);
  let numPanels = Math.max(1, assignedPanels);
  let spacing = Math.max(0, w.spacing);
  let leftMargin = w.marginMode === 'equal' ? spacing : Math.max(0, w.customMargin);
  let rightMargin = leftMargin;
  let panelWidth = 0;

  if (isBoardAndBatten) {
    if (w.calcMode === 'target_width') {
      const targetW = Math.max(50, w.targetWidth);
      numPanels = Math.max(1, Math.round((segLen - trimW) / (targetW + trimW)));
    }
    const totalBattenWidth = (numPanels + 1) * trimW;
    panelWidth = Math.max(10, (segLen - totalBattenWidth) / numPanels);
    spacing = trimW;
    leftMargin = 0;
    rightMargin = 0;
  } else {
    if (w.calcMode === 'auto_count' || w.calcMode === 'fixed_spacing') {
      if (w.marginMode === 'equal') {
        const totalSpaces = (numPanels + 1) * spacing;
        panelWidth = (segLen - totalSpaces) / numPanels;
        if (panelWidth <= trimW * 2 && w.calcMode === 'auto_count') {
          panelWidth = Math.max(trimW * 2 + 10, segLen / (numPanels * 2));
          spacing = Math.max(0, (segLen - numPanels * panelWidth) / (numPanels + 1));
          leftMargin = spacing;
          rightMargin = spacing;
        }
      } else {
        leftMargin = Math.max(0, w.customMargin);
        rightMargin = leftMargin;
        const interiorSpaces = Math.max(0, numPanels - 1) * spacing;
        panelWidth = (segLen - (leftMargin + rightMargin) - interiorSpaces) / numPanels;
      }
    } else if (w.calcMode === 'target_width') {
      const targetW = Math.max(50, w.targetWidth);
      const assumedGap = spacing;
      numPanels = Math.max(1, Math.round((segLen - assumedGap) / (targetW + assumedGap)));
      if (w.marginMode === 'equal') {
        const rawGap = (segLen - numPanels * targetW) / (numPanels + 1);
        if (rawGap < 0) {
          // Target width exceeds segment; fit inside equal margins
          spacing = Math.max(0, w.spacing);
          leftMargin = spacing;
          rightMargin = spacing;
          panelWidth = Math.max(10, (segLen - (numPanels + 1) * spacing) / numPanels);
        } else {
          spacing = rawGap;
          leftMargin = spacing;
          rightMargin = spacing;
          panelWidth = targetW;
        }
      } else {
        leftMargin = Math.max(0, w.customMargin);
        rightMargin = leftMargin;
        const remaining = segLen - (leftMargin + rightMargin) - numPanels * targetW;
        if (remaining < 0) {
          panelWidth = Math.max(10, (segLen - (leftMargin + rightMargin) - Math.max(0, numPanels - 1) * spacing) / numPanels);
        } else {
          spacing = numPanels > 1 ? remaining / (numPanels - 1) : remaining;
          panelWidth = targetW;
        }
      }
    }
  }

  return {
    segment,
    numPanels,
    panelWidth: Math.max(10, panelWidth),
    spacing: Math.max(0, spacing),
    leftMargin: Math.max(0, leftMargin),
    rightMargin: Math.max(0, rightMargin)
  };
}

/**
 * Distributes total panel count across multiple clear wall segments proportionally by length.
 */
function distributePanelCounts(segments: WallSegment[], totalRequested: number): number[] {
  if (segments.length === 0) return [];
  if (segments.length === 1) return [Math.max(1, totalRequested)];

  const totalLen = segments.reduce((acc, s) => acc + s.length, 0);
  if (totalLen <= 0) return segments.map(() => 1);

  const counts = segments.map((s) => Math.max(1, Math.round((s.length / totalLen) * totalRequested)));
  return counts;
}

export function computeWallGeometry(w: Wall): WallGeometry {
  const totalLength = Math.max(100, w.wallLength);
  const totalHeight = Math.max(100, w.wallHeight);
  const corniceH = Math.max(0, w.corniceHeight);
  const wainscotH = Math.min(Math.max(0, w.wainscotHeight), totalHeight);
  const baseH = Math.max(0, w.baseboardHeight);
  const railH = Math.max(0, w.chairRailHeight);
  const trimW = Math.max(1, w.trimWidth);
  const style = w.style;
  const isBoardAndBatten = isBoardAndBattenStyle(style);

  const availableVerticalSpan = Math.max(10, wainscotH - baseH - railH);
  const verticalBottom = baseH + Math.max(0, w.marginBottom);
  const verticalTop = wainscotH - railH - Math.max(0, w.marginTop);
  const availableBoxH = Math.max(10, verticalTop - verticalBottom);

  // Clear runs for panels, baseboard, and chair rail (respecting doors & low windows)
  const panelBandBottom = isBoardAndBatten ? baseH : verticalBottom;
  const panelBandTop = isBoardAndBatten ? wainscotH - railH : verticalTop;
  const minPanelSegment = Math.max(trimW * 3, 150);

  const segments = computeClearRuns(totalLength, w.obstacles, panelBandBottom, panelBandTop, minPanelSegment);
  const clearBaseboardRuns = baseH > 0 ? computeClearRuns(totalLength, w.obstacles, 0, baseH, 10) : [];
  const clearChairRailRuns =
    railH > 0 ? computeClearRuns(totalLength, w.obstacles, Math.max(0, wainscotH - railH), wainscotH, 10) : [];

  const assignedCounts = distributePanelCounts(segments, Math.max(1, w.panelCount));
  const segmentLayouts: SegmentLayout[] = [];
  const panels: PanelRect[] = [];

  let globalPanelIdx = 0;

  segments.forEach((seg, segIdx) => {
    const layout = layoutSegment(seg, w, assignedCounts[segIdx] ?? 1, isBoardAndBatten);
    segmentLayouts.push(layout);

    let currentX = seg.startX + layout.leftMargin;

    for (let i = 0; i < layout.numPanels; i++) {
      globalPanelIdx++;
      const panelX = isBoardAndBatten
        ? seg.startX + trimW + i * (layout.panelWidth + trimW)
        : currentX;
      const prefix = segments.length > 1 ? `S${segIdx + 1}-P${i + 1}` : `Panel-${globalPanelIdx}`;

      if (w.twoTier && !isBoardAndBatten) {
        const ratio = Math.min(0.85, Math.max(0.15, w.tierRatio));
        const gap = Math.max(0, w.tierGap);
        const lowerH = Math.max(10, (availableBoxH - gap) * ratio);
        const upperH = Math.max(10, availableBoxH - lowerH - gap);

        panels.push({
          id: `${prefix}-L`,
          segmentIndex: segIdx,
          index: globalPanelIdx - 1,
          tier: 'lower',
          x: panelX,
          y: verticalBottom,
          width: layout.panelWidth,
          height: lowerH
        });

        panels.push({
          id: `${prefix}-U`,
          segmentIndex: segIdx,
          index: globalPanelIdx - 1,
          tier: 'upper',
          x: panelX,
          y: verticalBottom + lowerH + gap,
          width: layout.panelWidth,
          height: upperH
        });
      } else if (style === 'grid_batten') {
        const rows = Math.max(1, Math.round(w.gridRows));
        const railW = Math.max(1, w.gridRailWidth);
        const totalRailH = (rows - 1) * railW;
        const topRailH = trimW;
        const innerSpan = Math.max(10, availableVerticalSpan - topRailH);
        const bayH = Math.max(10, (innerSpan - totalRailH) / rows);

        for (let r = 0; r < rows; r++) {
          panels.push({
            id: `Bay-C${globalPanelIdx}-R${r + 1}`,
            segmentIndex: segIdx,
            index: globalPanelIdx - 1,
            tier: 'single',
            row: r,
            x: panelX,
            y: baseH + r * (bayH + railW),
            width: layout.panelWidth,
            height: bayH
          });
        }
      } else {
        panels.push({
          id: isBoardAndBatten ? `Bay-${globalPanelIdx}` : prefix,
          segmentIndex: segIdx,
          index: globalPanelIdx - 1,
          tier: 'single',
          x: panelX,
          y: isBoardAndBatten ? baseH : verticalBottom,
          width: layout.panelWidth,
          height: isBoardAndBatten ? availableVerticalSpan : availableBoxH
        });
      }

      if (!isBoardAndBatten) {
        currentX += layout.panelWidth + layout.spacing;
      }
    }
  });

  // Collision & Clearance Verification
  const conflicts: Conflict[] = [];
  let conflictCounter = 0;

  // Check if wainscot cap intrudes into ceiling coving
  if (corniceH > 0 && wainscotH > totalHeight - corniceH) {
    conflicts.push({
      id: `conf-${++conflictCounter}`,
      severity: 'error',
      obstacleId: 'cornice',
      obstacleName: 'Wainscot Cap',
      item: `Ceiling Coving (${Math.round(corniceH)} mm drop)`,
      suggestion: `Lower wainscot height to <= ${Math.round(totalHeight - corniceH)} mm.`
    });
  }

  for (const obs of w.obstacles) {
    // 1. Ceiling coving collision
    if (corniceH > 0) {
      const obsTop = obs.y + obs.height;
      const covingBottom = totalHeight - corniceH;
      if (obsTop > covingBottom) {
        conflicts.push({
          id: `conf-${++conflictCounter}`,
          severity: 'error',
          obstacleId: obs.id,
          obstacleName: obs.name,
          item: `Ceiling Coving / Cornice Drop (${Math.round(corniceH)} mm)`,
          suggestion: `Mount top edge at or below ${Math.round(covingBottom)} mm.`
        });
      }
    }

    // Doors and windows already split segments; skip moulding perimeter clashes for doors/windows
    if (obs.type === 'door' || obs.type === 'window') continue;

    // 2. Chair rail collision (TVs, switches, outlets)
    if (railH > 0) {
      const obsBottom = obs.y;
      const obsTop = obs.y + obs.height;
      if (obsBottom < wainscotH && obsTop > wainscotH - railH) {
        conflicts.push({
          id: `conf-${++conflictCounter}`,
          severity: 'error',
          obstacleId: obs.id,
          obstacleName: obs.name,
          item: `Chair Rail Cap (${Math.round(wainscotH - railH)}–${Math.round(wainscotH)} mm)`,
          suggestion:
            obs.type === 'tv'
              ? `Raise TV bottom to >= ${Math.round(wainscotH + 100)} mm.`
              : `Adjust wainscot height to clear fixture.`
        });
      }
    }

    // 3. Baseboard collision
    if (baseH > 0 && obs.y < baseH) {
      conflicts.push({
        id: `conf-${++conflictCounter}`,
        severity: 'warning',
        obstacleId: obs.id,
        obstacleName: obs.name,
        item: `Baseboard (${Math.round(baseH)} mm)`,
        suggestion: `Raise fixture above ${Math.round(baseH)} mm or notch skirting.`
      });
    }

    // 4. Trim / Batten collision
    if (isBoardAndBatten) {
      for (const layout of segmentLayouts) {
        for (let b = 0; b <= layout.numPanels; b++) {
          const battenX = layout.segment.startX + b * (layout.panelWidth + trimW);
          const xHit = obs.x < battenX + trimW && obs.x + obs.width > battenX;
          const yHit = obs.y < wainscotH - railH && obs.y + obs.height > baseH;
          if (xHit && yHit) {
            conflicts.push({
              id: `conf-${++conflictCounter}`,
              severity: 'error',
              obstacleId: obs.id,
              obstacleName: obs.name,
              item: `Vertical Batten #${b + 1} at ${Math.round(battenX)} mm`,
              suggestion: `Adjust bay count by ±1 to shift batten past ${obs.name}.`
            });
          }
        }
      }
    } else {
      for (const p of panels) {
        const overlapX = p.x < obs.x + obs.width && p.x + p.width > obs.x;
        const overlapY = p.y < obs.y + obs.height && p.y + p.height > obs.y;
        if (overlapX && overlapY) {
          const innerX = p.x + trimW;
          const innerW = p.width - 2 * trimW;
          const innerY = p.y + trimW;
          const innerH = p.height - 2 * trimW;
          const completelyInside =
            obs.x >= innerX &&
            obs.x + obs.width <= innerX + innerW &&
            obs.y >= innerY &&
            obs.y + obs.height <= innerY + innerH;
          if (!completelyInside) {
            conflicts.push({
              id: `conf-${++conflictCounter}`,
              severity: 'error',
              obstacleId: obs.id,
              obstacleName: obs.name,
              item: `${p.id} Frame Perimeter`,
              suggestion: `Change panel count or spacing so ${obs.name} sits cleanly inside a panel or gap.`
            });
          }
        }
      }
    }
  }

  const primaryLayout = segmentLayouts[0];
  const totalPanels = segmentLayouts.reduce((acc, sl) => acc + sl.numPanels, 0);

  return {
    wallLength: totalLength,
    wallHeight: totalHeight,
    wainscotHeight: wainscotH,
    baseboardHeight: baseH,
    chairRailHeight: railH,
    corniceHeight: corniceH,
    trimWidth: trimW,
    innerGap: Math.max(0, w.innerGap),
    isBoardAndBatten,
    segments,
    segmentLayouts,
    numPanels: totalPanels,
    panelWidth: primaryLayout ? primaryLayout.panelWidth : 0,
    panelHeight: availableBoxH,
    spacing: primaryLayout ? primaryLayout.spacing : w.spacing,
    leftMargin: primaryLayout ? primaryLayout.leftMargin : 0,
    rightMargin: primaryLayout ? primaryLayout.rightMargin : 0,
    clearBaseboardRuns,
    clearChairRailRuns,
    panels,
    conflicts
  };
}
