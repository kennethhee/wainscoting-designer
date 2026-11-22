import { escHtml, formatLength } from '../engine';
import type { Obstacle, Unit, WallGeometry } from '../engine';
import { store } from '../state/store';
import type { ComputedSnapshot } from '../state/store';

interface DragObstacleState {
  mode: 'obstacle';
  obstacleId: string;
  startSvgX: number;
  startSvgY: number;
  origX: number;
  origY: number;
  width: number;
  height: number;
  wallLength: number;
  wallHeight: number;
}

interface PanCanvasState {
  mode: 'pan';
  startClientX: number;
  startClientY: number;
  origPanX: number;
  origPanY: number;
  svgUnitsPerPxX: number;
  svgUnitsPerPxY: number;
}

type PointerInteraction = DragObstacleState | PanCanvasState | null;

let activeInteraction: PointerInteraction = null;

interface BaseViewBox {
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  baseW: number;
  baseH: number;
  u: number;
}

function computeBaseViewBox(geo: WallGeometry, showDims: boolean): BaseViewBox {
  const refDim = Math.max(2000, Math.min(6500, Math.max(geo.wallLength, geo.wallHeight)));
  const u = refDim / 36; // ~82mm on a 3m wall -> ~13-14px on screen at 100% fit
  const padLeft = showDims ? Math.round(u * 5.8) : Math.round(u * 1.0);
  const padRight = showDims ? Math.round(u * 4.4) : Math.round(u * 1.0);
  const padTop = showDims ? Math.round(u * 3.0) : Math.round(u * 1.0);
  const padBottom = showDims ? Math.round(u * 3.6) : Math.round(u * 1.0);
  return {
    padLeft,
    padRight,
    padTop,
    padBottom,
    baseW: geo.wallLength + padLeft + padRight,
    baseH: geo.wallHeight + padTop + padBottom,
    u
  };
}

function applyViewBox(svg: SVGSVGElement, base: BaseViewBox, zoom: number, panX: number, panY: number): void {
  const vbW = base.baseW / zoom;
  const vbH = base.baseH / zoom;
  const vbX = -base.padLeft + (base.baseW - vbW) / 2 + panX;
  const vbY = -base.padTop + (base.baseH - vbH) / 2 + panY;
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
}

function clientToSvgCoords(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

function renderPillBadge(
  cx: number,
  cy: number,
  text: string,
  fontSize: number,
  bg: string,
  border: string,
  textColor: string,
  strokeW: number
): string {
  const padX = fontSize * 0.55;
  const padY = fontSize * 0.32;
  const w = Math.max(fontSize * 2.4, text.length * fontSize * 0.62 + padX * 2);
  const h = fontSize + padY * 2;
  return `
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h * 0.28}" fill="${bg}" stroke="${border}" stroke-width="${strokeW}" />
    <text x="${cx}" y="${cy + fontSize * 0.35}" font-size="${fontSize}" font-family="JetBrains Mono, ui-monospace, monospace" fill="${textColor}" text-anchor="middle" font-weight="600">${escHtml(text)}</text>
  `;
}

function renderDimensionsMarkup(geo: WallGeometry, unit: Unit, isDark: boolean, u: number): string {
  const lineCol = isDark ? '#94a3b8' : '#475569';
  const accentCol = isDark ? '#60a5fa' : '#2563eb';
  const textCol = isDark ? '#f8fafc' : '#0f172a';
  const subTextCol = isDark ? '#cbd5e1' : '#334155';
  const badgeBg = isDark ? '#1e293b' : '#ffffff';
  const badgeBorder = isDark ? '#475569' : '#94a3b8';

  const fontMain = Math.round(u * 0.82);
  const fontSub = Math.round(u * 0.68);
  const strokeMain = Math.max(3, Math.round(u * 0.055));
  const strokeThin = Math.max(2, Math.round(u * 0.038));
  const tick = Math.round(u * 0.32);

  let d = '';

  // 1. Top Wall Length Dimension
  const topY = -Math.round(u * 1.45);
  d += `
    <g class="dim-string">
      <line x1="0" y1="${topY}" x2="${geo.wallLength}" y2="${topY}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="0" y1="${topY - tick}" x2="0" y2="${topY + tick}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="${geo.wallLength}" y1="${topY - tick}" x2="${geo.wallLength}" y2="${topY + tick}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      ${renderPillBadge(geo.wallLength / 2, topY, formatLength(geo.wallLength, unit), fontMain, badgeBg, accentCol, textCol, strokeThin)}
    </g>
  `;

  // 2. Bottom Horizontal Segment & Panel Width Strings
  const botY = geo.wallHeight + Math.round(u * 1.35);
  const gapBadgeY = botY + Math.round(u * 1.35);
  d += `<g class="dim-string">`;
  for (const sl of geo.segmentLayouts) {
    let curX = sl.segment.startX;
    if (!geo.isBoardAndBatten && sl.leftMargin > 0) {
      d += `
        <line x1="${curX}" y1="${botY}" x2="${curX + sl.leftMargin}" y2="${botY}" stroke="${lineCol}" stroke-width="${strokeThin}" />
        <line x1="${curX}" y1="${botY - tick}" x2="${curX}" y2="${botY + tick}" stroke="${lineCol}" stroke-width="${strokeThin}" />
        ${renderPillBadge(curX + sl.leftMargin / 2, gapBadgeY, formatLength(sl.leftMargin, unit), fontSub, badgeBg, badgeBorder, subTextCol, strokeThin)}
      `;
      curX += sl.leftMargin;
    }

    for (let i = 0; i < sl.numPanels; i++) {
      const x1 = geo.isBoardAndBatten ? sl.segment.startX + geo.trimWidth + i * (sl.panelWidth + geo.trimWidth) : curX;
      const x2 = x1 + sl.panelWidth;
      d += `
        <line x1="${x1}" y1="${botY}" x2="${x2}" y2="${botY}" stroke="${lineCol}" stroke-width="${strokeMain}" />
        <line x1="${x1}" y1="${botY - tick}" x2="${x1}" y2="${botY + tick}" stroke="${lineCol}" stroke-width="${strokeMain}" />
        <line x1="${x2}" y1="${botY - tick}" x2="${x2}" y2="${botY + tick}" stroke="${lineCol}" stroke-width="${strokeMain}" />
        ${renderPillBadge((x1 + x2) / 2, botY, formatLength(sl.panelWidth, unit), fontMain, badgeBg, badgeBorder, textCol, strokeThin)}
      `;

      if (!geo.isBoardAndBatten && i < sl.numPanels - 1) {
        const g1 = x2;
        const g2 = g1 + sl.spacing;
        d += `
          <line x1="${g1}" y1="${botY}" x2="${g2}" y2="${botY}" stroke="${lineCol}" stroke-width="${strokeThin}" stroke-dasharray="${strokeMain * 2} ${strokeMain * 2}" />
          ${renderPillBadge((g1 + g2) / 2, gapBadgeY, formatLength(sl.spacing, unit), fontSub, badgeBg, badgeBorder, subTextCol, strokeThin)}
        `;
        curX = g2;
      } else if (!geo.isBoardAndBatten) {
        curX = x2;
      }
    }

    if (!geo.isBoardAndBatten && sl.rightMargin > 0) {
      d += `
        <line x1="${curX}" y1="${botY}" x2="${sl.segment.endX}" y2="${botY}" stroke="${lineCol}" stroke-width="${strokeThin}" />
        <line x1="${sl.segment.endX}" y1="${botY - tick}" x2="${sl.segment.endX}" y2="${botY + tick}" stroke="${lineCol}" stroke-width="${strokeThin}" />
        ${renderPillBadge(curX + sl.rightMargin / 2, gapBadgeY, formatLength(sl.rightMargin, unit), fontSub, badgeBg, badgeBorder, subTextCol, strokeThin)}
      `;
    }
  }
  d += `</g>`;

  // 3. Left Vertical Dimension String (Wainscot Height + Staggered Coving & Baseboard callouts)
  const leftLineX = -Math.round(u * 1.4);
  const leftBadgeX = -Math.round(u * 3.3);
  const baseTopY = geo.wallHeight - geo.baseboardHeight;
  const railTopY = geo.wallHeight - geo.wainscotHeight;

  d += `
    <g class="dim-string">
      <!-- Wainscot Height -->
      <line x1="${leftLineX}" y1="${geo.wallHeight}" x2="${leftLineX}" y2="${railTopY}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="${leftLineX - tick}" y1="${geo.wallHeight}" x2="${leftLineX + tick}" y2="${geo.wallHeight}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="${leftLineX - tick}" y1="${railTopY}" x2="${leftLineX + tick}" y2="${railTopY}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      ${renderPillBadge(leftBadgeX, (geo.wallHeight + railTopY) / 2, `H: ${formatLength(geo.wainscotHeight, unit)}`, fontMain, badgeBg, accentCol, textCol, strokeThin)}

      <!-- Baseboard Callout (bottom-left, clearly below Wainscot badge) -->
      ${
        geo.baseboardHeight > 0
          ? `
        <line x1="0" y1="${baseTopY}" x2="${leftLineX * 0.5}" y2="${baseTopY}" stroke="${lineCol}" stroke-width="${strokeThin}" stroke-dasharray="${strokeMain} ${strokeMain}" />
        ${renderPillBadge(leftBadgeX, geo.wallHeight - Math.max(geo.baseboardHeight / 2, u * 0.4), `Base: ${formatLength(geo.baseboardHeight, unit)}`, fontSub, badgeBg, badgeBorder, subTextCol, strokeThin)}`
          : ''
      }

      <!-- Ceiling Coving Callout (top-left) -->
      ${
        geo.corniceHeight > 0
          ? `
        <line x1="0" y1="${geo.corniceHeight}" x2="${leftLineX * 0.5}" y2="${geo.corniceHeight}" stroke="${lineCol}" stroke-width="${strokeThin}" stroke-dasharray="${strokeMain} ${strokeMain}" />
        ${renderPillBadge(leftBadgeX, Math.max(geo.corniceHeight / 2, u * 0.5), `Cove: ${formatLength(geo.corniceHeight, unit)}`, fontSub, badgeBg, badgeBorder, subTextCol, strokeThin)}`
          : ''
      }
    </g>
  `;

  // 4. Right Vertical Dimension String (Full Ceiling Height)
  const rightLineX = geo.wallLength + Math.round(u * 1.2);
  const rightBadgeX = geo.wallLength + Math.round(u * 2.7);
  d += `
    <g class="dim-string">
      <line x1="${rightLineX}" y1="0" x2="${rightLineX}" y2="${geo.wallHeight}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="${rightLineX - tick}" y1="0" x2="${rightLineX + tick}" y2="0" stroke="${lineCol}" stroke-width="${strokeMain}" />
      <line x1="${rightLineX - tick}" y1="${geo.wallHeight}" x2="${rightLineX + tick}" y2="${geo.wallHeight}" stroke="${lineCol}" stroke-width="${strokeMain}" />
      ${renderPillBadge(rightBadgeX, geo.wallHeight / 2, formatLength(geo.wallHeight, unit), fontMain, badgeBg, badgeBorder, textCol, strokeThin)}
    </g>
  `;

  return d;
}

function renderObstacleSvg(obs: Obstacle, geo: WallGeometry, unit: Unit, isSelected: boolean, u: number): string {
  const svgY = geo.wallHeight - (obs.y + obs.height);
  const strokeSel = isSelected ? '#2563eb' : undefined;
  const selStrokeW = Math.max(6, Math.round(u * 0.1));
  const labelFont = Math.max(36, Math.min(Math.round(u * 0.72), Math.round(obs.width / Math.max(8, obs.name.length * 0.65))));
  const tip = `${obs.name} (${formatLength(obs.width, unit)} × ${formatLength(obs.height, unit)}) @ X:${formatLength(obs.x, unit)}, Y:${formatLength(obs.y, unit)} — Drag to move`;

  if (obs.type === 'door') {
    const arch = Math.max(0, obs.architraveMm ?? 70);
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        ${
          arch > 0
            ? `<rect x="${obs.x - arch}" y="${svgY - arch}" width="${obs.width + arch * 2}" height="${obs.height + arch}" fill="#e2e8f0" stroke="${strokeSel ?? '#64748b'}" stroke-width="${isSelected ? selStrokeW : 3}" />`
            : ''
        }
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#cbd5e1" stroke="${strokeSel ?? '#475569'}" stroke-width="${isSelected ? selStrokeW : 4}" />
        <line x1="${obs.x + obs.width / 2}" y1="${svgY}" x2="${obs.x + obs.width / 2}" y2="${svgY + obs.height}" stroke="#64748b" stroke-width="3" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2}" font-size="${labelFont}" font-family="Inter, sans-serif" fill="#1e293b" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  if (obs.type === 'window') {
    const arch = Math.max(0, obs.architraveMm ?? 0);
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        ${
          arch > 0
            ? `<rect x="${obs.x - arch}" y="${svgY - arch}" width="${obs.width + arch * 2}" height="${obs.height + arch * 2}" fill="#e2e8f0" stroke="${strokeSel ?? '#64748b'}" stroke-width="${isSelected ? selStrokeW : 3}" />`
            : ''
        }
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#dbeafe" fill-opacity="0.72" stroke="${strokeSel ?? '#3b82f6'}" stroke-width="${isSelected ? selStrokeW : 4}" />
        <line x1="${obs.x}" y1="${svgY + obs.height / 2}" x2="${obs.x + obs.width}" y2="${svgY + obs.height / 2}" stroke="#60a5fa" stroke-width="3" />
        <line x1="${obs.x + obs.width / 2}" y1="${svgY}" x2="${obs.x + obs.width / 2}" y2="${svgY + obs.height}" stroke="#60a5fa" stroke-width="3" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2 - 14}" font-size="${labelFont}" font-family="Inter, sans-serif" fill="#1e3a8a" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  if (obs.type === 'tv') {
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#1e293b" stroke="${strokeSel ?? '#92400e'}" stroke-width="${isSelected ? selStrokeW : 14}" rx="6" />
        <rect x="${obs.x + 18}" y="${svgY + 18}" width="${Math.max(0, obs.width - 36)}" height="${Math.max(0, obs.height - 36)}" fill="#0f172a" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2 + labelFont * 0.35}" font-size="${labelFont}" font-family="Inter, sans-serif" fill="#e2e8f0" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  return `
    <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
      <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#ffffff" stroke="${strokeSel ?? '#dc2626'}" stroke-width="${isSelected ? selStrokeW : 4}" rx="6" />
      <circle cx="${obs.x + obs.width * 0.35}" cy="${svgY + obs.height * 0.5}" r="${Math.max(6, Math.min(obs.width, obs.height) * 0.13)}" fill="#475569" />
      <circle cx="${obs.x + obs.width * 0.65}" cy="${svgY + obs.height * 0.5}" r="${Math.max(6, Math.min(obs.width, obs.height) * 0.13)}" fill="#475569" />
    </g>
  `;
}

export function renderElevation(container: HTMLElement, snap: ComputedSnapshot): void {
  const { activeWall: w, geometry: geo, ui, project } = snap;
  const unit = project.unit;
  const isDark = ui.theme === 'dark';

  const isColourDrench = w.wallColor.toLowerCase() === w.trimColor.toLowerCase();
  const highlightOpacity =
    w.trimSheen === 'gloss' ? '0.9' : w.trimSheen === 'semi_gloss' ? '0.72' : w.trimSheen === 'satin' ? '0.45' : '0.25';
  const shadowStrokeOpacity = w.trimSheen === 'semi_gloss' || w.trimSheen === 'gloss' ? '0.28' : '0.15';
  const wallStroke = isDark ? '#475569' : '#cbd5e1';
  const trimStroke = isDark ? '#64748b' : isColourDrench ? '#c7bba8' : '#64748b';
  const shadowOpacity = isDark ? '0.35' : isColourDrench ? '0.22' : '0.14';

  // Conflict banner (shows ALL conflicts)
  const conflictEl = container.querySelector<HTMLElement>('#conflict-banner')!;
  if (geo.conflicts.length > 0 && !ui.conflictsDismissed) {
    conflictEl.style.display = 'flex';
    conflictEl.innerHTML = `
      <div class="conflict-list">
        ${geo.conflicts
          .map(
            (c) => `
          <div>
            <strong>${c.severity === 'error' ? 'Conflict:' : 'Note:'}</strong>
            ${escHtml(c.obstacleName)} overlaps ${escHtml(c.item)}.
            ${c.suggestion ? `<span class="conflict-suggestion">${escHtml(c.suggestion)}</span>` : ''}
          </div>`
          )
          .join('')}
      </div>
      <button class="btn btn-sm" id="btn-dismiss-conflicts" type="button">Dismiss</button>
    `;
    conflictEl.querySelector('#btn-dismiss-conflicts')?.addEventListener('click', () => store.dismissConflicts());
  } else {
    conflictEl.style.display = 'none';
  }

  // Toolbar summary & live zoom percentage
  const summaryEl = container.querySelector<HTMLElement>('#canvas-summary')!;
  summaryEl.innerHTML =
    `<strong>${escHtml(w.name)}</strong> &bull; ${geo.numPanels} ${geo.isBoardAndBatten ? 'Bays' : 'Panels'} ` +
    `(${geo.segments.length > 1 ? `${geo.segments.length} spans &bull; ` : ''}W: <strong>${escHtml(formatLength(geo.panelWidth, unit))}</strong>, ` +
    `H: <strong>${escHtml(formatLength(geo.panelHeight, unit))}</strong>, Gap: <strong>${escHtml(formatLength(geo.spacing, unit))}</strong>)` +
    (isColourDrench ? ` &bull; <span>Colour Drench</span>` : '');

  const zoomResetBtn = container.querySelector<HTMLButtonElement>('#btn-zoom-reset');
  if (zoomResetBtn) {
    zoomResetBtn.textContent = `${Math.round(ui.zoomLevel * 100)}% (Fit)`;
  }

  const printSummary = document.getElementById('print-wall-summary');
  if (printSummary) {
    printSummary.textContent =
      `${w.name} • Wall: ${formatLength(w.wallLength, unit)} × ${formatLength(w.wallHeight, unit)} • ` +
      `Coving: ${formatLength(w.corniceHeight, unit)} • Wainscot: ${formatLength(w.wainscotHeight, unit)} • ` +
      `Baseboard: ${formatLength(w.baseboardHeight, unit)} • Style: ${w.style.replace(/_/g, ' ').toUpperCase()}`;
  }

  const svg = container.querySelector<SVGSVGElement>('#elevation-svg')!;
  const base = computeBaseViewBox(geo, ui.showDims);
  applyViewBox(svg, base, ui.zoomLevel, ui.panX, ui.panY);

  let markup = `
    <defs>
      <filter id="moulding-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="${shadowOpacity}" />
      </filter>
      <pattern id="beadboard-pattern" width="50" height="100" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(0,0,0,0.14)" stroke-width="2" />
        <line x1="2" y1="0" x2="2" y2="100" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
      </pattern>
    </defs>

    <!-- Wall Surface -->
    <rect x="0" y="0" width="${geo.wallLength}" height="${geo.wallHeight}" fill="${escHtml(w.wallColor)}" stroke="${wallStroke}" stroke-width="4" />
  `;

  if (w.style === 'beadboard' || w.style === 'recessed_shaker' || w.style === 'raised_panel') {
    for (const seg of geo.segments) {
      markup += `<rect x="${seg.startX}" y="${geo.wallHeight - geo.wainscotHeight}" width="${seg.length}" height="${geo.wainscotHeight - geo.baseboardHeight}" fill="${escHtml(w.trimColor)}" opacity="${w.style === 'beadboard' ? '1' : '0.95'}" />`;
      if (w.style === 'beadboard') {
        markup += `<rect x="${seg.startX}" y="${geo.wallHeight - geo.wainscotHeight}" width="${seg.length}" height="${geo.wainscotHeight - geo.baseboardHeight}" fill="url(#beadboard-pattern)" />`;
      }
    }
  }

  // Ceiling Coving / Cornice
  if (geo.corniceHeight > 0) {
    markup += `
      <g id="cornice-group">
        <rect x="0" y="0" width="${geo.wallLength}" height="${geo.corniceHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
        <line x1="0" y1="${geo.corniceHeight * 0.82}" x2="${geo.wallLength}" y2="${geo.corniceHeight * 0.82}" stroke="rgba(0,0,0,0.14)" stroke-width="2" />
        <line x1="0" y1="${geo.corniceHeight}" x2="${geo.wallLength}" y2="${geo.corniceHeight}" stroke="rgba(0,0,0,${shadowStrokeOpacity})" stroke-width="3" />
      </g>
    `;
  }

  // Clear Baseboard Runs
  const baseTopY = geo.wallHeight - geo.baseboardHeight;
  if (geo.baseboardHeight > 0) {
    for (const run of geo.clearBaseboardRuns) {
      markup += `
        <g class="baseboard-run">
          <rect x="${run.startX}" y="${baseTopY}" width="${run.length}" height="${geo.baseboardHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
          <line x1="${run.startX}" y1="${baseTopY + 14}" x2="${run.endX}" y2="${baseTopY + 14}" stroke="rgba(0,0,0,0.18)" stroke-width="2" />
          ${ui.showShading ? `<line x1="${run.startX}" y1="${baseTopY + 2}" x2="${run.endX}" y2="${baseTopY + 2}" stroke="rgba(255,255,255,${highlightOpacity})" stroke-width="2" />` : ''}
        </g>
      `;
    }
  }

  // Clear Chair Rail Runs
  const chairRailTopY = geo.wallHeight - geo.wainscotHeight;
  if (geo.chairRailHeight > 0) {
    for (const run of geo.clearChairRailRuns) {
      markup += `
        <g class="chair-rail-run">
          <rect x="${run.startX}" y="${chairRailTopY}" width="${run.length}" height="${geo.chairRailHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
          <line x1="${run.startX}" y1="${chairRailTopY + geo.chairRailHeight * 0.4}" x2="${run.endX}" y2="${chairRailTopY + geo.chairRailHeight * 0.4}" stroke="rgba(0,0,0,0.18)" stroke-width="2" />
        </g>
      `;
    }
  }

  // Panels / Battens
  if (geo.isBoardAndBatten) {
    const topRailH = geo.trimWidth;
    const topRailY = chairRailTopY + geo.chairRailHeight;
    const battenH = Math.max(10, baseTopY - (topRailY + topRailH));

    for (const sl of geo.segmentLayouts) {
      markup += `<rect x="${sl.segment.startX}" y="${topRailY}" width="${sl.segment.length}" height="${topRailH}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2" />`;

      for (let b = 0; b <= sl.numPanels; b++) {
        const bx = sl.segment.startX + b * (sl.panelWidth + geo.trimWidth);
        const tip = `Batten #${b + 1}: ${formatLength(geo.trimWidth, unit)} × ${formatLength(battenH, unit)}`;
        markup += `<rect x="${bx}" y="${topRailY + topRailH}" width="${geo.trimWidth}" height="${battenH}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} data-tooltip="${escHtml(tip)}" />`;
      }

      if (w.style === 'grid_batten') {
        const rows = Math.max(1, Math.round(w.gridRows));
        const railW = w.gridRailWidth;
        const bayH = (battenH - (rows - 1) * railW) / rows;
        for (let r = 1; r < rows; r++) {
          const midY = topRailY + topRailH + r * bayH + (r - 1) * railW;
          for (let i = 0; i < sl.numPanels; i++) {
            const bayX = sl.segment.startX + geo.trimWidth + i * (sl.panelWidth + geo.trimWidth);
            markup += `<rect x="${bayX}" y="${midY}" width="${sl.panelWidth}" height="${railW}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="2" />`;
          }
        }
      }
    }
  } else {
    // Picture Frame Mouldings — exact outer-to-outer bounds via trimWidth/2 stroke inset
    const halfTrim = geo.trimWidth / 2;
    for (const p of geo.panels) {
      const svgBoxY = geo.wallHeight - (p.y + p.height);
      const strokeX = p.x + halfTrim;
      const strokeY = svgBoxY + halfTrim;
      const strokeW = Math.max(1, p.width - geo.trimWidth);
      const strokeH = Math.max(1, p.height - geo.trimWidth);
      const tip = `${p.id}: Outer ${formatLength(p.width, unit)} × ${formatLength(p.height, unit)}`;

      markup += `
        <g class="moulding-box" data-tooltip="${escHtml(tip)}">
          <rect x="${strokeX}" y="${strokeY}" width="${strokeW}" height="${strokeH}" fill="none" stroke="${escHtml(w.trimColor)}" stroke-width="${geo.trimWidth}" stroke-linejoin="miter" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
          <rect x="${p.x}" y="${svgBoxY}" width="${p.width}" height="${p.height}" fill="none" stroke="${trimStroke}" stroke-width="2" />
          ${
            p.width > geo.trimWidth * 2 && p.height > geo.trimWidth * 2
              ? `<rect x="${p.x + geo.trimWidth}" y="${svgBoxY + geo.trimWidth}" width="${p.width - geo.trimWidth * 2}" height="${p.height - geo.trimWidth * 2}" fill="none" stroke="${trimStroke}" stroke-width="1.8" />`
              : ''
          }
          ${
            ui.showShading
              ? `
            <line x1="${p.x}" y1="${svgBoxY}" x2="${p.x + geo.trimWidth}" y2="${svgBoxY + geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="2" />
            <line x1="${p.x + p.width}" y1="${svgBoxY}" x2="${p.x + p.width - geo.trimWidth}" y2="${svgBoxY + geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="2" />
            <line x1="${p.x}" y1="${svgBoxY + p.height}" x2="${p.x + geo.trimWidth}" y2="${svgBoxY + p.height - geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="2" />
            <line x1="${p.x + p.width}" y1="${svgBoxY + p.height}" x2="${p.x + p.width - geo.trimWidth}" y2="${svgBoxY + p.height - geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="2" />`
              : ''
          }
      `;

      if (w.style === 'double_picture_frame') {
        const innerOuterX = p.x + geo.trimWidth + geo.innerGap;
        const innerOuterY = svgBoxY + geo.trimWidth + geo.innerGap;
        const innerOuterW = p.width - (geo.trimWidth + geo.innerGap) * 2;
        const innerOuterH = p.height - (geo.trimWidth + geo.innerGap) * 2;
        const innerTrimW = Math.max(10, Math.round(geo.trimWidth * 0.75));
        if (innerOuterW > innerTrimW * 2 && innerOuterH > innerTrimW * 2) {
          const ih = innerTrimW / 2;
          markup += `
            <rect x="${innerOuterX + ih}" y="${innerOuterY + ih}" width="${innerOuterW - innerTrimW}" height="${innerOuterH - innerTrimW}" fill="none" stroke="${escHtml(w.trimColor)}" stroke-width="${innerTrimW}" stroke-linejoin="miter" />
            <rect x="${innerOuterX}" y="${innerOuterY}" width="${innerOuterW}" height="${innerOuterH}" fill="none" stroke="${trimStroke}" stroke-width="1.8" />
          `;
        }
      }

      markup += `</g>`;
    }
  }

  for (const obs of w.obstacles) {
    markup += renderObstacleSvg(obs, geo, unit, ui.selectedObstacleId === obs.id, base.u);
  }

  if (ui.showDims) {
    markup += renderDimensionsMarkup(geo, unit, isDark, base.u);
  }

  svg.innerHTML = markup;
}

export function bindElevationInteractions(container: HTMLElement): void {
  const viewport = container.querySelector<HTMLElement>('.canvas-viewport')!;
  const svg = container.querySelector<SVGSVGElement>('#elevation-svg')!;
  const tooltip = document.getElementById('svg-tooltip')!;

  // Smooth cursor-centered wheel / trackpad zoom
  viewport.addEventListener(
    'wheel',
    (evt) => {
      evt.preventDefault();
      const snap = store.getSnapshot();
      const base = computeBaseViewBox(snap.geometry, snap.ui.showDims);
      const oldZoom = snap.ui.zoomLevel;
      const factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = Math.max(0.4, Math.min(6.0, oldZoom * factor));
      if (Math.abs(newZoom - oldZoom) < 0.001) return;

      // Keep the SVG point under the mouse cursor stationary
      const before = clientToSvgCoords(svg, evt.clientX, evt.clientY);
      applyViewBox(svg, base, newZoom, snap.ui.panX, snap.ui.panY);
      const after = clientToSvgCoords(svg, evt.clientX, evt.clientY);

      const nextPanX = snap.ui.panX + (before.x - after.x);
      const nextPanY = snap.ui.panY + (before.y - after.y);
      store.setViewport(newZoom, nextPanX, nextPanY);
    },
    { passive: false }
  );

  // Pointer move: drag obstacle, pan canvas, or show hover tooltip
  svg.addEventListener('pointermove', (evt) => {
    if (activeInteraction?.mode === 'obstacle') {
      const drag = activeInteraction;
      const pt = clientToSvgCoords(svg, evt.clientX, evt.clientY);
      const dx = pt.x - drag.startSvgX;
      const dy = pt.y - drag.startSvgY;
      const snapMm = 5;
      const nextX = Math.max(0, Math.min(drag.wallLength - drag.width, Math.round((drag.origX + dx) / snapMm) * snapMm));
      const nextY = Math.max(0, Math.min(drag.wallHeight - drag.height, Math.round((drag.origY - dy) / snapMm) * snapMm));
      store.updateObstacle(drag.obstacleId, { x: nextX, y: nextY }, false);

      const unit = store.getSnapshot().project.unit;
      tooltip.textContent = `X: ${formatLength(nextX, unit)}, Y: ${formatLength(nextY, unit)}`;
      tooltip.style.display = 'block';
      tooltip.style.left = `${evt.clientX + 14}px`;
      tooltip.style.top = `${evt.clientY - 28}px`;
      return;
    }

    if (activeInteraction?.mode === 'pan') {
      const pan = activeInteraction;
      const dxPx = evt.clientX - pan.startClientX;
      const dyPx = evt.clientY - pan.startClientY;
      const nextPanX = pan.origPanX - dxPx * pan.svgUnitsPerPxX;
      const nextPanY = pan.origPanY - dyPx * pan.svgUnitsPerPxY;
      const snap = store.getSnapshot();
      const base = computeBaseViewBox(snap.geometry, snap.ui.showDims);
      // Update viewBox immediately at 60fps during pan
      applyViewBox(svg, base, snap.ui.zoomLevel, nextPanX, nextPanY);
      svg.dataset.livePanX = String(nextPanX);
      svg.dataset.livePanY = String(nextPanY);
      return;
    }

    const target = (evt.target as Element | null)?.closest('[data-tooltip]');
    if (target) {
      tooltip.textContent = target.getAttribute('data-tooltip') || '';
      tooltip.style.display = 'block';
      tooltip.style.left = `${evt.clientX + 14}px`;
      tooltip.style.top = `${evt.clientY - 28}px`;
    } else {
      tooltip.style.display = 'none';
    }
  });

  svg.addEventListener('pointerleave', () => {
    if (!activeInteraction) tooltip.style.display = 'none';
  });

  svg.addEventListener('pointerdown', (evt) => {
    if (evt.button !== 0) return;
    const obsEl = (evt.target as Element | null)?.closest<SVGGElement>('.svg-obstacle');
    const snap = store.getSnapshot();

    if (obsEl) {
      const id = obsEl.getAttribute('data-obs-id');
      if (!id) return;
      const obs = snap.activeWall.obstacles.find((o) => o.id === id);
      if (!obs) return;

      store.selectObstacle(id);
      const pt = clientToSvgCoords(svg, evt.clientX, evt.clientY);
      activeInteraction = {
        mode: 'obstacle',
        obstacleId: id,
        startSvgX: pt.x,
        startSvgY: pt.y,
        origX: obs.x,
        origY: obs.y,
        width: obs.width,
        height: obs.height,
        wallLength: snap.activeWall.wallLength,
        wallHeight: snap.activeWall.wallHeight
      };
      svg.setPointerCapture(evt.pointerId);
      return;
    }

    // Pan canvas background
    if (snap.ui.selectedObstacleId !== null) {
      store.selectObstacle(null);
    }
    const ctm = svg.getScreenCTM();
    const scaleX = ctm ? 1 / ctm.a : 1;
    const scaleY = ctm ? 1 / ctm.d : 1;
    activeInteraction = {
      mode: 'pan',
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      origPanX: snap.ui.panX,
      origPanY: snap.ui.panY,
      svgUnitsPerPxX: scaleX,
      svgUnitsPerPxY: scaleY
    };
    viewport.classList.add('panning');
    svg.setPointerCapture(evt.pointerId);
  });

  const endInteraction = (evt: PointerEvent) => {
    if (!activeInteraction) return;
    const prev = activeInteraction;
    activeInteraction = null;
    viewport.classList.remove('panning');
    try {
      svg.releasePointerCapture(evt.pointerId);
    } catch {
      // ignore
    }
    tooltip.style.display = 'none';

    if (prev.mode === 'obstacle') {
      store.commitNow();
    } else if (prev.mode === 'pan') {
      const lx = Number(svg.dataset.livePanX);
      const ly = Number(svg.dataset.livePanY);
      if (Number.isFinite(lx) && Number.isFinite(ly)) {
        store.setViewport(store.getSnapshot().ui.zoomLevel, lx, ly);
      }
      delete svg.dataset.livePanX;
      delete svg.dataset.livePanY;
    }
  };

  svg.addEventListener('pointerup', endInteraction);
  svg.addEventListener('pointercancel', endInteraction);

  // Double-click empty canvas to Fit
  svg.addEventListener('dblclick', (evt) => {
    if ((evt.target as Element | null)?.closest('.svg-obstacle')) return;
    store.resetViewport();
  });

  // Toolbar controls
  container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
    const { zoomLevel, panX, panY } = store.getSnapshot().ui;
    store.setViewport(zoomLevel * 1.25, panX, panY);
  });
  container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
    const { zoomLevel, panX, panY } = store.getSnapshot().ui;
    store.setViewport(zoomLevel / 1.25, panX, panY);
  });
  container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
    store.resetViewport();
  });
  container.querySelector<HTMLInputElement>('#chk-show-dims')?.addEventListener('change', (e) => {
    store.setShowDims((e.target as HTMLInputElement).checked);
  });
  container.querySelector<HTMLInputElement>('#chk-show-shading')?.addEventListener('change', (e) => {
    store.setShowShading((e.target as HTMLInputElement).checked);
  });
}
