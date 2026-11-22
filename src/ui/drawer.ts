import {
  PROFILE_LABELS,
  buildFlatCuts,
  computeMaterialsEstimate,
  displayToMm,
  escHtml,
  formatArea,
  formatLength,
  formatLinear,
  mmToDisplay,
  packCutsByProfile,
  parseNumericInput
} from '../engine';
import type { ProfileStockPlan, Unit, UnitPrices } from '../engine';
import { store } from '../state/store';
import type { ComputedSnapshot, DrawerTab } from '../state/store';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderStockPlansMarkup(plans: ProfileStockPlan[], unit: Unit): string {
  if (plans.length === 0) {
    return `<div style="color:var(--text-muted);">No linear stock cuts for this selection.</div>`;
  }

  return plans
    .map((plan) => {
      const { packed, stockLengthMm } = plan;
      const oversizeHtml =
        packed.oversize.length > 0
          ? `<div style="margin-bottom:8px; font-size:11px; color:var(--warn);">
               Scarf joint required: ${packed.oversize
                 .map((o) => `${escHtml(o.tag)} (${escHtml(formatLength(o.length, unit))} → ${o.joints} joint${o.joints > 1 ? 's' : ''})`)
                 .join(', ')}
             </div>`
          : '';

      const boardsHtml = packed.boards
        .map((b) => {
          const itemsHtml = b.items
            .map((it) => {
              const pct = Math.min(100, (it.length / stockLengthMm) * 100);
              return `<div class="board-cut" style="width:${pct.toFixed(2)}%;" title="${escHtml(it.tag)}: ${escHtml(formatLength(it.length, unit))}">${escHtml(it.tag)} (${escHtml(formatLength(it.length, unit, false))})</div>`;
            })
            .join('');

          const wastePct = Math.max(0, (b.remaining / stockLengthMm) * 100);
          const wasteHtml =
            b.remaining > 1
              ? `<div class="board-waste" style="width:${wastePct.toFixed(2)}%;" title="Offcut: ${escHtml(formatLength(b.remaining, unit))}">${wastePct > 10 ? escHtml(formatLength(b.remaining, unit)) : ''}</div>`
              : '';

          return `
            <div class="board-row">
              <div class="board-label">Board #${b.boardIndex}</div>
              <div class="board-bar">${itemsHtml}${wasteHtml}</div>
            </div>`;
        })
        .join('');

      return `
        <div class="profile-stock-card">
          <div class="profile-stock-header">
            <strong>${escHtml(plan.label)}</strong>
            <span class="mono" style="font-size:11px; color:var(--text-secondary);">
              ${packed.boards.length} × ${escHtml(formatLength(stockLengthMm, unit))} stock &bull;
              ${plan.pieceCount} cuts &bull;
              Waste: <strong>${packed.wastePct.toFixed(1)}%</strong>
            </span>
          </div>
          ${oversizeHtml}
          ${boardsHtml}
        </div>`;
    })
    .join('');
}

export function initDrawer(drawerEl: HTMLElement): void {
  drawerEl.innerHTML = `
    <div class="drawer-tabs">
      <div class="drawer-tab-list" role="tablist">
        <button class="drawer-tab-btn" data-tab="cutlist" role="tab" type="button">Cut List</button>
        <button class="drawer-tab-btn" data-tab="stock" role="tab" type="button">Stock Optimizer</button>
        <button class="drawer-tab-btn" data-tab="materials" role="tab" type="button">Materials &amp; Cost</button>
        <button class="drawer-tab-btn" data-tab="project" role="tab" type="button">Project Totals</button>
      </div>
      <div id="drawer-actions"></div>
    </div>
    <div class="drawer-content" id="drawer-content"></div>
  `;

  drawerEl.querySelectorAll<HTMLButtonElement>('.drawer-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setDrawerTab(btn.getAttribute('data-tab') as DrawerTab);
    });
  });
}

export function renderDrawer(drawerEl: HTMLElement, snap: ComputedSnapshot): void {
  const { project, activeWall, cuts, projectTotals, ui } = snap;
  const unit = project.unit;

  drawerEl.querySelectorAll<HTMLButtonElement>('.drawer-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === ui.activeDrawerTab);
  });

  const actionsEl = drawerEl.querySelector<HTMLElement>('#drawer-actions')!;
  const contentEl = drawerEl.querySelector<HTMLElement>('#drawer-content')!;

  // Avoid wiping active input inside drawer (e.g. while editing stock length or unit prices)
  if (contentEl.contains(document.activeElement)) return;

  if (ui.activeDrawerTab === 'cutlist') {
    actionsEl.innerHTML = `<button class="btn btn-sm" id="btn-export-wall-csv" type="button">Export Wall CSV</button>`;
    actionsEl.querySelector('#btn-export-wall-csv')?.addEventListener('click', () => {
      const header = ['Tag', 'Piece', 'Profile', 'Length', 'Width', 'Cut Type', 'Qty', 'Total Linear'];
      const rows = cuts.map((c) => [
        c.tag,
        c.name,
        PROFILE_LABELS[c.profile],
        formatLength(c.length, unit),
        formatLength(c.width, unit),
        c.cutType,
        String(c.quantity),
        formatLength(c.totalLinear, unit)
      ]);
      downloadCsv(`${activeWall.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cuts.csv`, [header, ...rows]);
    });

    contentEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Piece Description</th>
              <th>Profile</th>
              <th>Length</th>
              <th>Width</th>
              <th>Cut Type</th>
              <th>Qty</th>
              <th>Total Linear</th>
            </tr>
          </thead>
          <tbody>
            ${cuts
              .map(
                (c) => `
              <tr>
                <td class="mono"><strong>${escHtml(c.tag)}</strong></td>
                <td>${escHtml(c.name)}</td>
                <td><span class="badge badge-butt">${escHtml(PROFILE_LABELS[c.profile])}</span></td>
                <td class="mono">${escHtml(formatLength(c.length, unit))}</td>
                <td class="mono">${escHtml(formatLength(c.width, unit))}</td>
                <td><span class="badge ${c.cutType.includes('45°') ? 'badge-miter' : 'badge-butt'}">${escHtml(c.cutType)}</span></td>
                <td class="mono">${c.quantity}</td>
                <td class="mono">${escHtml(formatLength(c.totalLinear, unit))}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (ui.activeDrawerTab === 'stock') {
    const flat = buildFlatCuts(cuts);
    const plans = packCutsByProfile(flat, project.stockSettings);
    const totalBoards = plans.reduce((acc, p) => acc + p.packed.boards.length, 0);

    actionsEl.innerHTML = `<span class="mono" style="font-size:11px; color:var(--text-secondary);">Active Wall: <strong>${totalBoards}</strong> stock boards across ${plans.length} profile(s)</span>`;

    contentEl.innerHTML = `
      <div class="stock-controls">
        <div class="form-group">
          <label for="in-stock-moulding">Moulding Stock (${unit})</label>
          <input type="number" id="in-stock-moulding" value="${mmToDisplay(project.stockSettings.mouldingStockMm, unit)}" min="500" step="100" />
        </div>
        <div class="form-group">
          <label for="in-stock-rail">Skirting / Rail Stock (${unit})</label>
          <input type="number" id="in-stock-rail" value="${mmToDisplay(project.stockSettings.railStockMm, unit)}" min="500" step="100" />
        </div>
        <div class="form-group">
          <label for="in-stock-kerf">Saw Kerf (${unit})</label>
          <input type="number" id="in-stock-kerf" value="${mmToDisplay(project.stockSettings.kerfMm, unit)}" min="0" step="0.5" />
        </div>
      </div>
      ${renderStockPlansMarkup(plans, unit)}
    `;

    contentEl.querySelector<HTMLInputElement>('#in-stock-moulding')?.addEventListener('change', (e) => {
      const val = parseNumericInput((e.target as HTMLInputElement).value, mmToDisplay(project.stockSettings.mouldingStockMm, unit), 10);
      store.updateStockSettings({ mouldingStockMm: displayToMm(val, unit) });
    });
    contentEl.querySelector<HTMLInputElement>('#in-stock-rail')?.addEventListener('change', (e) => {
      const val = parseNumericInput((e.target as HTMLInputElement).value, mmToDisplay(project.stockSettings.railStockMm, unit), 10);
      store.updateStockSettings({ railStockMm: displayToMm(val, unit) });
    });
    contentEl.querySelector<HTMLInputElement>('#in-stock-kerf')?.addEventListener('change', (e) => {
      const val = parseNumericInput((e.target as HTMLInputElement).value, mmToDisplay(project.stockSettings.kerfMm, unit), 0);
      store.updateStockSettings({ kerfMm: displayToMm(val, unit) });
    });
    return;
  }

  if (ui.activeDrawerTab === 'materials') {
    const est = computeMaterialsEstimate([activeWall], cuts, unit, project.unitPrices);
    actionsEl.innerHTML = `<span class="mono" style="font-size:11px; color:var(--text-secondary);">Active Wall Total: <strong>$${est.totalCost.toFixed(2)}</strong></span>`;

    contentEl.innerHTML = `
      <div class="materials-grid">
        <div class="material-card">
          <div class="material-title">18-Gauge Brad Nails</div>
          <div class="material-value">${est.nails}</div>
          <div class="material-detail">~${est.nailsBoxes} box(es) of 1,000</div>
        </div>
        <div class="material-card">
          <div class="material-title">Construction Adhesive</div>
          <div class="material-value">${est.adhesiveTubes} Tubes</div>
          <div class="material-detail">300ml Liquid Nails / Power Grab</div>
        </div>
        <div class="material-card">
          <div class="material-title">Painter's Caulk</div>
          <div class="material-value">${est.caulkTubes} Tubes</div>
          <div class="material-detail">Flexible acrylic gap filler</div>
        </div>
        <div class="material-card">
          <div class="material-title">Wood Filler / Spackle</div>
          <div class="material-value">${est.fillerTubs} Tub(s)</div>
          <div class="material-detail">Nail holes &amp; miter joints</div>
        </div>
        <div class="material-card">
          <div class="material-title">Net Wall Paint Area</div>
          <div class="material-value">${escHtml(formatArea(est.paintAreaSqM, unit))}</div>
          <div class="material-detail">${est.wallPaintLitres.toFixed(1)} L (2 coats, coving &amp; base deducted)</div>
        </div>
        <div class="material-card">
          <div class="material-title">Total Linear Moulding</div>
          <div class="material-value">${escHtml(formatLinear(est.mouldingLinearMm, unit))}</div>
          <div class="material-detail">Base: ${escHtml(formatLinear(est.baseboardLinearMm, unit))} &bull; Rail: ${escHtml(formatLinear(est.chairRailLinearMm, unit))}</div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Material Item</th>
              <th>Quantity</th>
              <th>Unit Price ($)</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${est.lineItems
              .map(
                (item) => `
              <tr>
                <td>${escHtml(item.label)}</td>
                <td class="mono">${escHtml(item.quantityDisplay)}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <input type="number" step="0.5" min="0" style="width:82px;" data-price-key="${escHtml(item.priceKey)}" value="${item.unitPrice}" />
                    <span style="font-size:11px; color:var(--text-muted);">${escHtml(item.unitLabel)}</span>
                  </div>
                </td>
                <td class="mono">$${item.subtotal.toFixed(2)}</td>
              </tr>`
              )
              .join('')}
            <tr class="cost-total-row">
              <td colspan="3">Estimated Active Wall Total (1:1 Sum of Rows)</td>
              <td class="mono">$${est.totalCost.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    contentEl.querySelectorAll<HTMLInputElement>('[data-price-key]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const key = inp.getAttribute('data-price-key') as keyof UnitPrices;
        const val = parseNumericInput(inp.value, project.unitPrices[key], 0);
        store.updateUnitPrice(key, val);
      });
    });
    return;
  }

  // Project Totals tab
  const savedBoards = Math.max(0, projectTotals.perWallBoards - projectTotals.totalBoards);
  actionsEl.innerHTML = `<button class="btn btn-sm" id="btn-export-all-csv" type="button">Export All-Walls CSV</button>`;
  actionsEl.querySelector('#btn-export-all-csv')?.addEventListener('click', () => {
    const header = ['Wall', 'Tag', 'Piece', 'Profile', 'Length', 'Width', 'Cut Type', 'Qty', 'Total Linear'];
    const rows = projectTotals.rows.map((c) => [
      c.wallName || '',
      c.tag,
      c.name,
      PROFILE_LABELS[c.profile],
      formatLength(c.length, unit),
      formatLength(c.width, unit),
      c.cutType,
      String(c.quantity),
      formatLength(c.totalLinear, unit)
    ]);
    downloadCsv('wainscot-all-walls-cuts.csv', [header, ...rows]);
  });

  const m = projectTotals.materials;
  contentEl.innerHTML = `
    <div class="materials-grid">
      <div class="material-card">
        <div class="material-title">Total Project Walls</div>
        <div class="material-value">${projectTotals.wallCount}</div>
        <div class="material-detail">${m.totalPieces} total cut pieces</div>
      </div>
      <div class="material-card">
        <div class="material-title">Combined Stock Boards</div>
        <div class="material-value">${projectTotals.totalBoards}</div>
        <div class="material-detail">${savedBoards > 0 ? `Saves ${savedBoards} board(s) via cross-wall offcuts` : 'Optimal cross-wall packing'}</div>
      </div>
      <div class="material-card">
        <div class="material-title">Total Net Paint Area</div>
        <div class="material-value">${escHtml(formatArea(m.paintAreaSqM, unit))}</div>
        <div class="material-detail">${m.wallPaintCans} L wall &bull; ${m.trimPaintCans} L trim</div>
      </div>
      <div class="material-card">
        <div class="material-title">Whole-Project Cost</div>
        <div class="material-value">$${m.totalCost.toFixed(2)}</div>
        <div class="material-detail">All ${projectTotals.wallCount} walls + consumables</div>
      </div>
    </div>

    <h4 style="font-size:12px; margin-bottom:8px; color:var(--text-secondary);">Cross-Wall Stock Allocation (By Trim Profile)</h4>
    ${renderStockPlansMarkup(projectTotals.profilePlans, unit)}
  `;
}
