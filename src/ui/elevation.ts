import { escHtml, formatLength } from '../engine';
import type { Obstacle, Unit, WallGeometry } from '../engine';
import { store } from '../state/store';
import type { ComputedSnapshot } from '../state/store';

interface DragState {
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

let activeDrag: DragState | null = null;

function clientToSvgCoords(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

function renderDimensionsMarkup(geo: WallGeometry, unit: Unit, isDark: boolean): string {
  const color = isDark ? '#94a3b8' : '#475569';
  const textColor = isDark ? '#e2e8f0' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const badgeBg = isDark ? '#1e293b' : '#ffffff';
  const badgeBorder = isDark ? '#334155' : '#cbd5e1';
  const tick = 10;
  const font = 'Inter, sans-serif';

  let d = '';

  // 1. Top Wall Length Dimension
  const topY = -55;
  d += `
    <g class="dim-string">
      <line x1="0" y1="${topY}" x2="${geo.wallLength}" y2="${topY}" stroke="${color}" stroke-width="1.5" />
      <line x1="0" y1="${topY - tick}" x2="0" y2="${topY + tick}" stroke="${color}" stroke-width="1.5" />
      <line x1="${geo.wallLength}" y1="${topY - tick}" x2="${geo.wallLength}" y2="${topY + tick}" stroke="${color}" stroke-width="1.5" />
      <rect x="${geo.wallLength / 2 - 58}" y="${topY - 12}" width="116" height="22" fill="${badgeBg}" stroke="${badgeBorder}" rx="4" />
      <text x="${geo.wallLength / 2}" y="${topY + 4}" font-size="13" font-family="${font}" fill="${textColor}" text-anchor="middle" font-weight="600">
        ${escHtml(formatLength(geo.wallLength, unit))}
      </text>
    </g>
  `;

  // 2. Bottom Horizontal Segment & Panel Width Strings
  const botY = geo.wallHeight + 48;
  d += `<g class="dim-string">`;
  for (const sl of geo.segmentLayouts) {
    let curX = sl.segment.startX;
    if (!geo.isBoardAndBatten && sl.leftMargin > 0) {
      d += `
        <line x1="${curX}" y1="${botY}" x2="${curX + sl.leftMargin}" y2="${botY}" stroke="${color}" stroke-width="1.2" />
        <line x1="${curX}" y1="${botY - tick}" x2="${curX}" y2="${botY + tick}" stroke="${color}" stroke-width="1.2" />
        <text x="${curX + sl.leftMargin / 2}" y="${botY + 18}" font-size="11" font-family="${font}" fill="${subTextColor}" text-anchor="middle">
          ${escHtml(formatLength(sl.leftMargin, unit))}
        </text>
      `;
      curX += sl.leftMargin;
    }

    for (let i = 0; i < sl.numPanels; i++) {
      const x1 = geo.isBoardAndBatten ? sl.segment.startX + geo.trimWidth + i * (sl.panelWidth + geo.trimWidth) : curX;
      const x2 = x1 + sl.panelWidth;
      d += `
        <line x1="${x1}" y1="${botY}" x2="${x2}" y2="${botY}" stroke="${color}" stroke-width="1.5" />
        <line x1="${x1}" y1="${botY - tick}" x2="${x1}" y2="${botY + tick}" stroke="${color}" stroke-width="1.5" />
        <line x1="${x2}" y1="${botY - tick}" x2="${x2}" y2="${botY + tick}" stroke="${color}" stroke-width="1.5" />
        <text x="${(x1 + x2) / 2}" y="${botY + 18}" font-size="12" font-family="${font}" fill="${textColor}" text-anchor="middle" font-weight="600">
          ${escHtml(formatLength(sl.panelWidth, unit))}
        </text>
      `;

      if (!geo.isBoardAndBatten && i < sl.numPanels - 1) {
        const g1 = x2;
        const g2 = g1 + sl.spacing;
        d += `
          <line x1="${g1}" y1="${botY}" x2="${g2}" y2="${botY}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3" />
          <text x="${(g1 + g2) / 2}" y="${botY - 6}" font-size="10" font-family="${font}" fill="${subTextColor}" text-anchor="middle">
            ${escHtml(formatLength(sl.spacing, unit))}
          </text>
        `;
        curX = g2;
      } else if (!geo.isBoardAndBatten) {
        curX = x2;
      }
    }

    if (!geo.isBoardAndBatten && sl.rightMargin > 0) {
      d += `
        <line x1="${curX}" y1="${botY}" x2="${sl.segment.endX}" y2="${botY}" stroke="${color}" stroke-width="1.2" />
        <line x1="${sl.segment.endX}" y1="${botY - tick}" x2="${sl.segment.endX}" y2="${botY + tick}" stroke="${color}" stroke-width="1.2" />
        <text x="${curX + sl.rightMargin / 2}" y="${botY + 18}" font-size="11" font-family="${font}" fill="${subTextColor}" text-anchor="middle">
          ${escHtml(formatLength(sl.rightMargin, unit))}
        </text>
      `;
    }
  }
  d += `</g>`;

  // 3. Left Vertical Dimension String (Coving, Wainscot Height, Baseboard)
  const leftX = -65;
  const baseTopY = geo.wallHeight - geo.baseboardHeight;
  const railTopY = geo.wallHeight - geo.wainscotHeight;

  d += `
    <g class="dim-string">
      <line x1="${leftX}" y1="${geo.wallHeight}" x2="${leftX}" y2="${railTopY}" stroke="${color}" stroke-width="1.5" />
      <line x1="${leftX - tick}" y1="${geo.wallHeight}" x2="${leftX + tick}" y2="${geo.wallHeight}" stroke="${color}" stroke-width="1.5" />
      <line x1="${leftX - tick}" y1="${railTopY}" x2="${leftX + tick}" y2="${railTopY}" stroke="${color}" stroke-width="1.5" />
      <rect x="${leftX - 96}" y="${(geo.wallHeight + railTopY) / 2 - 11}" width="88" height="22" fill="${badgeBg}" stroke="${badgeBorder}" rx="4" />
      <text x="${leftX - 52}" y="${(geo.wallHeight + railTopY) / 2 + 4}" font-size="12" font-family="${font}" fill="${textColor}" text-anchor="middle" font-weight="600">
        H: ${escHtml(formatLength(geo.wainscotHeight, unit))}
      </text>

      ${
        geo.baseboardHeight > 0
          ? `
        <line x1="${leftX + 32}" y1="${geo.wallHeight}" x2="${leftX + 32}" y2="${baseTopY}" stroke="${color}" stroke-width="1" />
        <line x1="${leftX + 27}" y1="${baseTopY}" x2="${leftX + 37}" y2="${baseTopY}" stroke="${color}" stroke-width="1" />
        <text x="${leftX + 22}" y="${(geo.wallHeight + baseTopY) / 2 + 3}" font-size="10" font-family="${font}" fill="${subTextColor}" text-anchor="end">
          Base ${escHtml(formatLength(geo.baseboardHeight, unit))}
        </text>`
          : ''
      }

      ${
        geo.corniceHeight > 0
          ? `
        <line x1="${leftX + 32}" y1="0" x2="${leftX + 32}" y2="${geo.corniceHeight}" stroke="${color}" stroke-width="1" />
        <line x1="${leftX + 27}" y1="0" x2="${leftX + 37}" y2="0" stroke="${color}" stroke-width="1" />
        <line x1="${leftX + 27}" y1="${geo.corniceHeight}" x2="${leftX + 37}" y2="${geo.corniceHeight}" stroke="${color}" stroke-width="1" />
        <text x="${leftX + 22}" y="${geo.corniceHeight / 2 + 3}" font-size="10" font-family="${font}" fill="${subTextColor}" text-anchor="end">
          Cove ${escHtml(formatLength(geo.corniceHeight, unit))}
        </text>`
          : ''
      }
    </g>
  `;

  return d;
}

function renderObstacleSvg(obs: Obstacle, geo: WallGeometry, unit: Unit, isSelected: boolean): string {
  const svgY = geo.wallHeight - (obs.y + obs.height);
  const strokeSel = isSelected ? '#2563eb' : undefined;
  const tip = `${obs.name} (${formatLength(obs.width, unit)} × ${formatLength(obs.height, unit)}) @ X:${formatLength(obs.x, unit)}, Y:${formatLength(obs.y, unit)} — Drag to move`;

  if (obs.type === 'door') {
    const arch = Math.max(0, obs.architraveMm ?? 70);
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        ${
          arch > 0
            ? `<rect x="${obs.x - arch}" y="${svgY - arch}" width="${obs.width + arch * 2}" height="${obs.height + arch}" fill="#e2e8f0" stroke="${strokeSel ?? '#64748b'}" stroke-width="${isSelected ? 4 : 1.5}" />`
            : ''
        }
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#cbd5e1" stroke="${strokeSel ?? '#475569'}" stroke-width="${isSelected ? 4 : 2}" />
        <line x1="${obs.x + obs.width / 2}" y1="${svgY}" x2="${obs.x + obs.width / 2}" y2="${svgY + obs.height}" stroke="#64748b" stroke-width="2" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2}" font-size="28" fill="#334155" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  if (obs.type === 'window') {
    const arch = Math.max(0, obs.architraveMm ?? 0);
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        ${
          arch > 0
            ? `<rect x="${obs.x - arch}" y="${svgY - arch}" width="${obs.width + arch * 2}" height="${obs.height + arch * 2}" fill="#e2e8f0" stroke="${strokeSel ?? '#64748b'}" stroke-width="${isSelected ? 4 : 1.5}" />`
            : ''
        }
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#dbeafe" fill-opacity="0.7" stroke="${strokeSel ?? '#3b82f6'}" stroke-width="${isSelected ? 4 : 2}" />
        <line x1="${obs.x}" y1="${svgY + obs.height / 2}" x2="${obs.x + obs.width}" y2="${svgY + obs.height / 2}" stroke="#60a5fa" stroke-width="2" />
        <line x1="${obs.x + obs.width / 2}" y1="${svgY}" x2="${obs.x + obs.width / 2}" y2="${svgY + obs.height}" stroke="#60a5fa" stroke-width="2" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2 - 12}" font-size="24" fill="#1e3a8a" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  if (obs.type === 'tv') {
    return `
      <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
        <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#1e293b" stroke="${strokeSel ?? '#92400e'}" stroke-width="${isSelected ? 6 : 10}" rx="4" />
        <rect x="${obs.x + 14}" y="${svgY + 14}" width="${Math.max(0, obs.width - 28)}" height="${Math.max(0, obs.height - 28)}" fill="#0f172a" />
        <text x="${obs.x + obs.width / 2}" y="${svgY + obs.height / 2 + 8}" font-size="26" fill="#cbd5e1" text-anchor="middle" font-weight="600">${escHtml(obs.name)}</text>
      </g>
    `;
  }

  // Outlet / Switch / Other
  return `
    <g class="svg-obstacle" data-obs-id="${escHtml(obs.id)}" data-tooltip="${escHtml(tip)}">
      <rect x="${obs.x}" y="${svgY}" width="${obs.width}" height="${obs.height}" fill="#ffffff" stroke="${strokeSel ?? '#dc2626'}" stroke-width="${isSelected ? 4 : 2}" rx="4" />
      <circle cx="${obs.x + obs.width * 0.35}" cy="${svgY + obs.height * 0.5}" r="${Math.max(4, Math.min(obs.width, obs.height) * 0.12)}" fill="#475569" />
      <circle cx="${obs.x + obs.width * 0.65}" cy="${svgY + obs.height * 0.5}" r="${Math.max(4, Math.min(obs.width, obs.height) * 0.12)}" fill="#475569" />
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
  const trimStroke = isDark ? '#334155' : isColourDrench ? '#d6cbba' : '#64748b';
  const shadowOpacity = isDark ? '0.35' : isColourDrench ? '0.22' : '0.14';

  // Conflict banner (shows ALL conflicts, not just conflicts[0])
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
      <button class="btn btn-sm" id="btn-dismiss-conflicts">Dismiss</button>
    `;
    conflictEl.querySelector('#btn-dismiss-conflicts')?.addEventListener('click', () => store.dismissConflicts());
  } else {
    conflictEl.style.display = 'none';
  }

  // Toolbar summary
  const summaryEl = container.querySelector<HTMLElement>('#canvas-summary')!;
  summaryEl.innerHTML =
    `<strong>${escHtml(w.name)}</strong> &bull; ${geo.numPanels} ${geo.isBoardAndBatten ? 'Bays' : 'Panels'} ` +
    `(${geo.segments.length > 1 ? `${geo.segments.length} wall spans &bull; ` : ''}W: <strong>${escHtml(formatLength(geo.panelWidth, unit))}</strong>, ` +
    `H: <strong>${escHtml(formatLength(geo.panelHeight, unit))}</strong>, Gap: <strong>${escHtml(formatLength(geo.spacing, unit))}</strong>)` +
    (isColourDrench ? ` &bull; <span>Colour Drench</span>` : '');

  // Print header
  const printSummary = document.getElementById('print-wall-summary');
  if (printSummary) {
    printSummary.textContent =
      `${w.name} • Wall: ${formatLength(w.wallLength, unit)} × ${formatLength(w.wallHeight, unit)} • ` +
      `Coving: ${formatLength(w.corniceHeight, unit)} • Wainscot: ${formatLength(w.wainscotHeight, unit)} • ` +
      `Baseboard: ${formatLength(w.baseboardHeight, unit)} • Style: ${w.style.replace(/_/g, ' ').toUpperCase()}`;
  }

  // Build SVG markup
  const svg = container.querySelector<SVGSVGElement>('#elevation-svg')!;
  const padX = ui.showDims ? 175 : 50;
  const padY = ui.showDims ? 110 : 50;
  const svgW = geo.wallLength + padX * 2;
  const svgH = geo.wallHeight + padY * 2;
  svg.setAttribute('viewBox', `-${padX} -${padY} ${svgW} ${svgH}`);
  svg.style.transform = `scale(${ui.zoomLevel})`;

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
    <rect x="0" y="0" width="${geo.wallLength}" height="${geo.wallHeight}" fill="${escHtml(w.wallColor)}" stroke="${wallStroke}" stroke-width="2" />
  `;

  // Beadboard / Panel Backing per clear segment
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
        <rect x="0" y="0" width="${geo.wallLength}" height="${geo.corniceHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
        <line x1="0" y1="${geo.corniceHeight * 0.82}" x2="${geo.wallLength}" y2="${geo.corniceHeight * 0.82}" stroke="rgba(0,0,0,0.12)" stroke-width="1.5" />
        <line x1="0" y1="${geo.corniceHeight}" x2="${geo.wallLength}" y2="${geo.corniceHeight}" stroke="rgba(0,0,0,${shadowStrokeOpacity})" stroke-width="2" />
      </g>
    `;
  }

  // Clear Baseboard Runs (stopping cleanly at doorways)
  const baseTopY = geo.wallHeight - geo.baseboardHeight;
  if (geo.baseboardHeight > 0) {
    for (const run of geo.clearBaseboardRuns) {
      markup += `
        <g class="baseboard-run">
          <rect x="${run.startX}" y="${baseTopY}" width="${run.length}" height="${geo.baseboardHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
          <line x1="${run.startX}" y1="${baseTopY + 14}" x2="${run.endX}" y2="${baseTopY + 14}" stroke="rgba(0,0,0,0.18)" stroke-width="1.5" />
          ${ui.showShading ? `<line x1="${run.startX}" y1="${baseTopY + 1.5}" x2="${run.endX}" y2="${baseTopY + 1.5}" stroke="rgba(255,255,255,${highlightOpacity})" stroke-width="1.5" />` : ''}
        </g>
      `;
    }
  }

  // Clear Chair Rail Runs (stopping cleanly at doorways / low windows)
  const chairRailTopY = geo.wallHeight - geo.wainscotHeight;
  if (geo.chairRailHeight > 0) {
    for (const run of geo.clearChairRailRuns) {
      markup += `
        <g class="chair-rail-run">
          <rect x="${run.startX}" y="${chairRailTopY}" width="${run.length}" height="${geo.chairRailHeight}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} />
          <line x1="${run.startX}" y1="${chairRailTopY + geo.chairRailHeight * 0.4}" x2="${run.endX}" y2="${chairRailTopY + geo.chairRailHeight * 0.4}" stroke="rgba(0,0,0,0.18)" stroke-width="1.5" />
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
      markup += `<rect x="${sl.segment.startX}" y="${topRailY}" width="${sl.segment.length}" height="${topRailH}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1.5" />`;

      for (let b = 0; b <= sl.numPanels; b++) {
        const bx = sl.segment.startX + b * (sl.panelWidth + geo.trimWidth);
        const tip = `Batten #${b + 1}: ${formatLength(geo.trimWidth, unit)} × ${formatLength(battenH, unit)}`;
        markup += `<rect x="${bx}" y="${topRailY + topRailH}" width="${geo.trimWidth}" height="${battenH}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1.5" ${ui.showShading ? 'filter="url(#moulding-shadow)"' : ''} data-tooltip="${escHtml(tip)}" />`;
      }

      if (w.style === 'grid_batten') {
        const rows = Math.max(1, Math.round(w.gridRows));
        const railW = w.gridRailWidth;
        const bayH = (battenH - (rows - 1) * railW) / rows;
        for (let r = 1; r < rows; r++) {
          const midY = topRailY + topRailH + r * bayH + (r - 1) * railW;
          for (let i = 0; i < sl.numPanels; i++) {
            const bayX = sl.segment.startX + geo.trimWidth + i * (sl.panelWidth + geo.trimWidth);
            markup += `<rect x="${bayX}" y="${midY}" width="${sl.panelWidth}" height="${railW}" fill="${escHtml(w.trimColor)}" stroke="${trimStroke}" stroke-width="1" />`;
          }
        }
      }
    }
  } else {
    // Picture Frame Mouldings — INSET STROKE BY trimWidth / 2 SO OUTER BOUNDS ARE EXACT!
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
          <!-- Exact outer & inner profile hairlines -->
          <rect x="${p.x}" y="${svgBoxY}" width="${p.width}" height="${p.height}" fill="none" stroke="${trimStroke}" stroke-width="1.2" />
          ${
            p.width > geo.trimWidth * 2 && p.height > geo.trimWidth * 2
              ? `<rect x="${p.x + geo.trimWidth}" y="${svgBoxY + geo.trimWidth}" width="${p.width - geo.trimWidth * 2}" height="${p.height - geo.trimWidth * 2}" fill="none" stroke="${trimStroke}" stroke-width="1" />`
              : ''
          }
          ${
            ui.showShading
              ? `
            <!-- 45° Miter corner joint lines -->
            <line x1="${p.x}" y1="${svgBoxY}" x2="${p.x + geo.trimWidth}" y2="${svgBoxY + geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="1.2" />
            <line x1="${p.x + p.width}" y1="${svgBoxY}" x2="${p.x + p.width - geo.trimWidth}" y2="${svgBoxY + geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="1.2" />
            <line x1="${p.x}" y1="${svgBoxY + p.height}" x2="${p.x + geo.trimWidth}" y2="${svgBoxY + p.height - geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="1.2" />
            <line x1="${p.x + p.width}" y1="${svgBoxY + p.height}" x2="${p.x + p.width - geo.trimWidth}" y2="${svgBoxY + p.height - geo.trimWidth}" stroke="rgba(0,0,0,0.28)" stroke-width="1.2" />
            <!-- Specular top/left highlight -->
            <line x1="${p.x + 1}" y1="${svgBoxY + 1}" x2="${p.x + p.width - 1}" y2="${svgBoxY + 1}" stroke="rgba(255,255,255,${highlightOpacity})" stroke-width="1.5" />`
              : ''
          }
      `;

      // Double nested inner frame (also inset cleanly)
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
            <rect x="${innerOuterX}" y="${innerOuterY}" width="${innerOuterW}" height="${innerOuterH}" fill="none" stroke="${trimStroke}" stroke-width="1" />
          `;
        }
      }

      markup += `</g>`;
    }
  }

  // Obstacles & Openings (draggable)
  for (const obs of w.obstacles) {
    markup += renderObstacleSvg(obs, geo, unit, ui.selectedObstacleId === obs.id);
  }

  // Dimensions
  if (ui.showDims) {
    markup += renderDimensionsMarkup(geo, unit, isDark);
  }

  svg.innerHTML = markup;
}

export function bindElevationInteractions(container: HTMLElement): void {
  const svg = container.querySelector<SVGSVGElement>('#elevation-svg')!;
  const tooltip = document.getElementById('svg-tooltip')!;

  // Tooltip hover delegation
  svg.addEventListener('pointermove', (evt) => {
    if (activeDrag) {
      const pt = clientToSvgCoords(svg, evt.clientX, evt.clientY);
      const dx = pt.x - activeDrag.startSvgX;
      const dy = pt.y - activeDrag.startSvgY;
      // Snap to 5mm grid; note SVG Y increases downward while wall Y increases upward from floor
      const snapMm = 5;
      const nextX = Math.max(
        0,
        Math.min(activeDrag.wallLength - activeDrag.width, Math.round((activeDrag.origX + dx) / snapMm) * snapMm)
      );
      const nextY = Math.max(
        0,
        Math.min(activeDrag.wallHeight - activeDrag.height, Math.round((activeDrag.origY - dy) / snapMm) * snapMm)
      );
      store.updateObstacle(activeDrag.obstacleId, { x: nextX, y: nextY }, false);

      const unit = store.getSnapshot().project.unit;
      tooltip.textContent = `X: ${formatLength(nextX, unit)}, Y: ${formatLength(nextY, unit)}`;
      tooltip.style.display = 'block';
      tooltip.style.left = `${evt.clientX + 14}px`;
      tooltip.style.top = `${evt.clientY - 28}px`;
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
    if (!activeDrag) tooltip.style.display = 'none';
  });

  svg.addEventListener('pointerdown', (evt) => {
    const obsEl = (evt.target as Element | null)?.closest<SVGGElement>('.svg-obstacle');
    if (!obsEl) {
      if (store.getSnapshot().ui.selectedObstacleId !== null) {
        store.selectObstacle(null);
      }
      return;
    }
    const id = obsEl.getAttribute('data-obs-id');
    if (!id) return;
    const snap = store.getSnapshot();
    const obs = snap.activeWall.obstacles.find((o) => o.id === id);
    if (!obs) return;

    store.selectObstacle(id);
    const pt = clientToSvgCoords(svg, evt.clientX, evt.clientY);
    activeDrag = {
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
  });

  const endDrag = (evt: PointerEvent) => {
    if (!activeDrag) return;
    activeDrag = null;
    try {
      svg.releasePointerCapture(evt.pointerId);
    } catch {
      // ignore
    }
    tooltip.style.display = 'none';
    store.commitNow();
  };

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // Toolbar controls
  container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
    store.setZoom(store.getSnapshot().ui.zoomLevel * 1.15);
  });
  container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
    store.setZoom(store.getSnapshot().ui.zoomLevel / 1.15);
  });
  container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
    store.setZoom(1.0);
  });
  container.querySelector<HTMLInputElement>('#chk-show-dims')?.addEventListener('change', (e) => {
    store.setShowDims((e.target as HTMLInputElement).checked);
  });
  container.querySelector<HTMLInputElement>('#chk-show-shading')?.addEventListener('change', (e) => {
    store.setShowShading((e.target as HTMLInputElement).checked);
  });
}
