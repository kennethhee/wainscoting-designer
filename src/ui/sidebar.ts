import {
  CORNICE_PRESETS,
  PAINT_PRESETS,
  TV_PRESETS,
  displayToMm,
  escHtml,
  isBoardAndBattenStyle,
  mmToDisplay,
  parseNumericInput
} from '../engine';
import type { ObstacleType, PaintScope, Sheen, Unit, WainscotStyle } from '../engine';
import { store } from '../state/store';
import type { ComputedSnapshot } from '../state/store';

function setInputValueSafe(el: HTMLInputElement | HTMLSelectElement | null, val: string): void {
  if (!el) return;
  if (document.activeElement === el) return;
  if (el.value !== val) el.value = val;
}

export function initSidebar(sidebarEl: HTMLElement): void {
  sidebarEl.innerHTML = `
    <!-- Walls Manager -->
    <section class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">Project Walls</span>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-sm" id="btn-dup-wall" type="button" title="Duplicate active wall">Duplicate</button>
          <button class="btn btn-sm btn-primary" id="btn-add-wall" type="button">+ Wall</button>
        </div>
      </div>
      <div class="wall-tabs" id="wall-tabs"></div>
      <div class="form-group">
        <label for="in-wall-name">Active Wall Name</label>
        <input type="text" id="in-wall-name" />
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
        <label class="checkbox-row" title="When checked, changing trim height, style, or colour updates all linked walls">
          <input type="checkbox" id="chk-follow-trim" />
          <span>Sync trim across project</span>
        </label>
        <button class="btn btn-sm" id="btn-sync-all-walls" type="button">Apply to All Walls</button>
      </div>
    </section>

    <!-- Wall Geometry & Coving -->
    <section class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">Wall Geometry &amp; Coving</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="in-wall-length">Wall Length</label>
          <div class="input-with-unit">
            <input type="number" id="in-wall-length" min="100" step="10" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label for="in-wall-height">Ceiling Height</label>
          <div class="input-with-unit">
            <input type="number" id="in-wall-height" min="100" step="10" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="in-wainscot-height">Wainscot Height</label>
          <div class="input-with-unit">
            <input type="number" id="in-wainscot-height" min="0" step="10" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label for="in-height-preset">Height Preset</label>
          <select id="in-height-preset">
            <option value="">Quick Set...</option>
            <option value="standard">Standard Chair Rail (950mm)</option>
            <option value="third">Rule of Thirds (1/3)</option>
            <option value="two_thirds">Tall Craftsman (2/3)</option>
            <option value="full_clear">Full Height Below Coving</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="in-baseboard-height">Baseboard / Skirting</label>
          <div class="input-with-unit">
            <input type="number" id="in-baseboard-height" min="0" step="2" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label for="in-chair-rail-height">Chair Rail Height</label>
          <div class="input-with-unit">
            <input type="number" id="in-chair-rail-height" min="0" step="2" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="in-cornice-height">Ceiling Coving Drop</label>
          <div class="input-with-unit">
            <input type="number" id="in-cornice-height" min="0" max="300" step="5" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label for="in-cornice-preset">Coving Preset</label>
          <select id="in-cornice-preset">
            <option value="90_cove">90mm Standard Cove</option>
            <option value="75_cove">75mm Cove</option>
            <option value="55_cove">55mm Small Cove</option>
            <option value="square_set">Square Set (0mm)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Style & Trim -->
    <section class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">Style, Trim &amp; Paint</span>
      </div>
      <div class="form-group">
        <label for="in-style">Wainscoting Style</label>
        <select id="in-style">
          <option value="picture_frame">Picture Frame (Box Moulding)</option>
          <option value="double_picture_frame">Double Picture Frame (Nested)</option>
          <option value="board_and_batten">Board &amp; Batten</option>
          <option value="grid_batten">Grid Board &amp; Batten</option>
          <option value="recessed_shaker">Recessed Shaker Panel</option>
          <option value="raised_panel">Raised Panel</option>
          <option value="beadboard">Cottage Beadboard</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="in-trim-width">Moulding / Batten Width</label>
          <div class="input-with-unit">
            <input type="number" id="in-trim-width" min="1" step="2" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
        <div class="form-group" id="grp-inner-gap">
          <label for="in-inner-gap">Inner Nested Gap</label>
          <div class="input-with-unit">
            <input type="number" id="in-inner-gap" min="0" step="5" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
      </div>

      <div class="form-row" id="grp-grid-opts" style="display:none;">
        <div class="form-group">
          <label for="in-grid-rows">Grid Rows</label>
          <input type="number" id="in-grid-rows" min="1" max="8" step="1" />
        </div>
        <div class="form-group">
          <label for="in-grid-rail-width">Cross Rail Width</label>
          <div class="input-with-unit">
            <input type="number" id="in-grid-rail-width" min="1" step="5" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Wall Colour &amp; Sheen</label>
          <div class="color-row">
            <input type="color" id="in-wall-color" />
            <select id="in-wall-sheen">
              <option value="matte">Matte</option>
              <option value="low_sheen">Low Sheen</option>
              <option value="satin">Satin</option>
              <option value="semi_gloss">Semi-Gloss</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Trim Colour &amp; Sheen</label>
          <div class="color-row">
            <input type="color" id="in-trim-color" />
            <select id="in-trim-sheen">
              <option value="satin">Satin</option>
              <option value="semi_gloss">Semi-Gloss</option>
              <option value="gloss">Gloss</option>
              <option value="matte">Matte</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="in-paint-scope">Paint Scope</label>
          <select id="in-paint-scope">
            <option value="auto">Auto (Drench = Full)</option>
            <option value="full_wall">Full Wall (Floor–Coving)</option>
            <option value="wainscot_only">Wainscot Only</option>
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button class="btn btn-sm" id="btn-colour-drench" type="button">Colour Drench (Antique White)</button>
        </div>
      </div>
    </section>

    <!-- Layout & Spacing -->
    <section class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">Layout &amp; Spacing</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="in-calc-mode">Calculation Mode</label>
          <select id="in-calc-mode">
            <option value="auto_count">Exact Panel Count</option>
            <option value="target_width">Target Panel Width</option>
            <option value="fixed_spacing">Fixed Gap Spacing</option>
          </select>
        </div>
        <div class="form-group" id="grp-panel-count">
          <label for="in-panel-count">Panel / Bay Count</label>
          <input type="number" id="in-panel-count" min="1" max="30" step="1" />
        </div>
        <div class="form-group" id="grp-target-width" style="display:none;">
          <label for="in-target-width">Target Width</label>
          <div class="input-with-unit">
            <input type="number" id="in-target-width" min="50" step="10" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>
      </div>

      <div id="grp-picture-spacing">
        <div class="form-row">
          <div class="form-group">
            <label for="in-spacing">Gap Spacing</label>
            <div class="input-with-unit">
              <input type="number" id="in-spacing" min="0" step="5" />
              <span class="input-unit unit-lbl">mm</span>
            </div>
          </div>
          <div class="form-group">
            <label for="in-margin-mode">End Margin Mode</label>
            <select id="in-margin-mode">
              <option value="equal">Equal to Gap</option>
              <option value="custom">Custom End Margin</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="grp-custom-margin" style="display:none; margin-top:8px;">
          <label for="in-custom-margin">Left / Right End Margin</label>
          <div class="input-with-unit">
            <input type="number" id="in-custom-margin" min="0" step="5" />
            <span class="input-unit unit-lbl">mm</span>
          </div>
        </div>

        <div class="form-row" style="margin-top:8px;">
          <div class="form-group">
            <label for="in-margin-bottom">Bottom Margin</label>
            <div class="input-with-unit">
              <input type="number" id="in-margin-bottom" min="0" step="5" />
              <span class="input-unit unit-lbl">mm</span>
            </div>
          </div>
          <div class="form-group">
            <label for="in-margin-top">Top Margin</label>
            <div class="input-with-unit">
              <input type="number" id="in-margin-top" min="0" step="5" />
              <span class="input-unit unit-lbl">mm</span>
            </div>
          </div>
        </div>

        <label class="checkbox-row" style="margin-top:8px;">
          <input type="checkbox" id="chk-two-tier" />
          <span>Two-Tier Upper &amp; Lower Boxes</span>
        </label>

        <div class="form-row" id="grp-two-tier" style="display:none; margin-top:8px;">
          <div class="form-group">
            <label for="in-tier-ratio">Lower Box Ratio</label>
            <input type="number" id="in-tier-ratio" min="0.15" max="0.85" step="0.05" />
          </div>
          <div class="form-group">
            <label for="in-tier-gap">Mid Tier Gap</label>
            <div class="input-with-unit">
              <input type="number" id="in-tier-gap" min="0" step="5" />
              <span class="input-unit unit-lbl">mm</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Obstacles & Openings -->
    <section class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">Obstacles &amp; Openings</span>
      </div>
      <div style="display:flex; gap:4px; flex-wrap:wrap;">
        <button class="btn btn-sm" id="btn-add-outlet" type="button">+ Outlet/Switch</button>
        <button class="btn btn-sm" id="btn-add-door" type="button">+ Door</button>
        <button class="btn btn-sm" id="btn-add-window" type="button">+ Window</button>
        <button class="btn btn-sm" id="btn-add-tv" type="button">+ CanvasTV</button>
      </div>
      <div id="obstacles-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </section>
  `;

  // Bind wall management buttons
  sidebarEl.querySelector('#btn-add-wall')?.addEventListener('click', () => store.addWall());
  sidebarEl.querySelector('#btn-dup-wall')?.addEventListener('click', () => store.duplicateActiveWall());
  sidebarEl.querySelector('#btn-sync-all-walls')?.addEventListener('click', () => store.syncActiveTrimToAllWalls());

  sidebarEl.querySelector<HTMLInputElement>('#in-wall-name')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (val.trim()) store.updateActiveWall({ name: val });
  });

  sidebarEl.querySelector<HTMLInputElement>('#chk-follow-trim')?.addEventListener('change', (e) => {
    store.updateActiveWall({ followProjectTrim: (e.target as HTMLInputElement).checked });
  });

  // Helper to bind length inputs (display unit -> canonical mm)
  const bindLengthInput = (id: string, field: keyof ReturnType<typeof store.getSnapshot>['activeWall'], min = 0) => {
    sidebarEl.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input', (e) => {
      const unit = store.getSnapshot().project.unit;
      const currentMm = Number(store.getSnapshot().activeWall[field]) || 0;
      const displayVal = parseNumericInput((e.target as HTMLInputElement).value, mmToDisplay(currentMm, unit), min);
      store.updateActiveWall({ [field]: displayToMm(displayVal, unit) });
    });
  };

  bindLengthInput('in-wall-length', 'wallLength', 100);
  bindLengthInput('in-wall-height', 'wallHeight', 100);
  bindLengthInput('in-wainscot-height', 'wainscotHeight', 0);
  bindLengthInput('in-baseboard-height', 'baseboardHeight', 0);
  bindLengthInput('in-chair-rail-height', 'chairRailHeight', 0);
  bindLengthInput('in-cornice-height', 'corniceHeight', 0);
  bindLengthInput('in-trim-width', 'trimWidth', 1);
  bindLengthInput('in-inner-gap', 'innerGap', 0);
  bindLengthInput('in-grid-rail-width', 'gridRailWidth', 1);
  bindLengthInput('in-target-width', 'targetWidth', 50);
  bindLengthInput('in-spacing', 'spacing', 0);
  bindLengthInput('in-custom-margin', 'customMargin', 0);
  bindLengthInput('in-margin-bottom', 'marginBottom', 0);
  bindLengthInput('in-margin-top', 'marginTop', 0);
  bindLengthInput('in-tier-gap', 'tierGap', 0);

  // Height presets
  sidebarEl.querySelector<HTMLSelectElement>('#in-height-preset')?.addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement;
    const w = store.getSnapshot().activeWall;
    if (sel.value === 'standard') store.updateActiveWall({ wainscotHeight: 950 });
    else if (sel.value === 'third') store.updateActiveWall({ wainscotHeight: Math.round(w.wallHeight / 3) });
    else if (sel.value === 'two_thirds') store.updateActiveWall({ wainscotHeight: Math.round((w.wallHeight * 2) / 3) });
    else if (sel.value === 'full_clear') store.updateActiveWall({ wainscotHeight: Math.max(100, w.wallHeight - w.corniceHeight) });
    sel.value = '';
  });

  // Cornice presets
  sidebarEl.querySelector<HTMLSelectElement>('#in-cornice-preset')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const preset = CORNICE_PRESETS[val];
    if (preset) {
      store.updateActiveWall({ corniceHeight: preset.dropMm });
    }
  });

  // Style, colours, sheens
  sidebarEl.querySelector<HTMLSelectElement>('#in-style')?.addEventListener('change', (e) => {
    store.updateActiveWall({ style: (e.target as HTMLSelectElement).value as WainscotStyle });
  });
  sidebarEl.querySelector<HTMLInputElement>('#in-grid-rows')?.addEventListener('input', (e) => {
    store.updateActiveWall({ gridRows: Math.round(parseNumericInput((e.target as HTMLInputElement).value, 2, 1, 8)) });
  });
  sidebarEl.querySelector<HTMLInputElement>('#in-wall-color')?.addEventListener('input', (e) => {
    store.updateActiveWall({ wallColor: (e.target as HTMLInputElement).value });
  });
  sidebarEl.querySelector<HTMLSelectElement>('#in-wall-sheen')?.addEventListener('change', (e) => {
    store.updateActiveWall({ wallSheen: (e.target as HTMLSelectElement).value as Sheen });
  });
  sidebarEl.querySelector<HTMLInputElement>('#in-trim-color')?.addEventListener('input', (e) => {
    store.updateActiveWall({ trimColor: (e.target as HTMLInputElement).value });
  });
  sidebarEl.querySelector<HTMLSelectElement>('#in-trim-sheen')?.addEventListener('change', (e) => {
    store.updateActiveWall({ trimSheen: (e.target as HTMLSelectElement).value as Sheen });
  });
  sidebarEl.querySelector<HTMLSelectElement>('#in-paint-scope')?.addEventListener('change', (e) => {
    store.updateActiveWall({ paintScope: (e.target as HTMLSelectElement).value as PaintScope });
  });
  sidebarEl.querySelector('#btn-colour-drench')?.addEventListener('click', () => {
    const aw = PAINT_PRESETS.dulux_antique_white!;
    store.updateActiveWall({
      wallColor: aw.hex,
      trimColor: aw.hex,
      wallSheen: aw.wallSheen,
      trimSheen: aw.trimSheen,
      paintScope: 'auto'
    });
  });

  // Layout controls
  sidebarEl.querySelector<HTMLSelectElement>('#in-calc-mode')?.addEventListener('change', (e) => {
    store.updateActiveWall({ calcMode: (e.target as HTMLSelectElement).value as ReturnType<typeof store.getSnapshot>['activeWall']['calcMode'] });
  });
  sidebarEl.querySelector<HTMLInputElement>('#in-panel-count')?.addEventListener('input', (e) => {
    store.updateActiveWall({ panelCount: Math.round(parseNumericInput((e.target as HTMLInputElement).value, 4, 1, 30)) });
  });
  sidebarEl.querySelector<HTMLSelectElement>('#in-margin-mode')?.addEventListener('change', (e) => {
    store.updateActiveWall({ marginMode: (e.target as HTMLSelectElement).value as 'equal' | 'custom' });
  });
  sidebarEl.querySelector<HTMLInputElement>('#chk-two-tier')?.addEventListener('change', (e) => {
    store.updateActiveWall({ twoTier: (e.target as HTMLInputElement).checked });
  });
  sidebarEl.querySelector<HTMLInputElement>('#in-tier-ratio')?.addEventListener('input', (e) => {
    store.updateActiveWall({ tierRatio: parseNumericInput((e.target as HTMLInputElement).value, 0.35, 0.15, 0.85) });
  });

  // Add Obstacle buttons
  sidebarEl.querySelector('#btn-add-outlet')?.addEventListener('click', () => {
    store.addObstacle({ name: 'Power Outlet', type: 'outlet', x: 400, y: 230, width: 115, height: 75 });
  });
  sidebarEl.querySelector('#btn-add-door')?.addEventListener('click', () => {
    store.addObstacle({ name: 'Doorway', type: 'door', x: 1000, y: 0, width: 820, height: 2040, architraveMm: 70 });
  });
  sidebarEl.querySelector('#btn-add-window')?.addEventListener('click', () => {
    store.addObstacle({ name: 'Window', type: 'window', x: 1000, y: 1050, width: 1200, height: 1100, architraveMm: 65 });
  });
  sidebarEl.querySelector('#btn-add-tv')?.addEventListener('click', () => {
    const w = store.getSnapshot().activeWall;
    const tv = TV_PRESETS['55_canvas']!;
    store.addObstacle({
      name: tv.name,
      type: 'tv',
      x: Math.max(0, Math.round((w.wallLength - tv.widthMm) / 2)),
      y: Math.round(w.wainscotHeight + 100),
      width: tv.widthMm,
      height: tv.heightMm
    });
  });
}

export function renderSidebar(sidebarEl: HTMLElement, snap: ComputedSnapshot): void {
  const { project, activeWall: w, ui } = snap;
  const unit: Unit = project.unit;

  // Update unit badges
  sidebarEl.querySelectorAll('.unit-lbl').forEach((el) => {
    el.textContent = unit;
  });

  // Wall tabs
  const tabsEl = sidebarEl.querySelector<HTMLElement>('#wall-tabs')!;
  tabsEl.innerHTML = project.walls
    .map(
      (wall, idx) => `
      <div class="wall-tab ${idx === project.currentWallIndex ? 'active' : ''}" data-wall-idx="${idx}">
        <span class="wall-tab-name" title="${escHtml(wall.name)}">${escHtml(wall.name)}</span>
        ${project.walls.length > 1 ? `<button class="wall-tab-del" data-del-wall="${idx}" title="Delete wall" type="button">&times;</button>` : ''}
      </div>`
    )
    .join('');

  tabsEl.querySelectorAll<HTMLElement>('.wall-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('data-del-wall')) {
        e.stopPropagation();
        const delIdx = Number(target.getAttribute('data-del-wall'));
        store.deleteWall(delIdx);
        return;
      }
      store.switchWall(Number(tab.getAttribute('data-wall-idx')));
    });
  });

  // Sync wall fields
  setInputValueSafe(sidebarEl.querySelector('#in-wall-name'), w.name);
  const followChk = sidebarEl.querySelector<HTMLInputElement>('#chk-follow-trim');
  if (followChk) followChk.checked = w.followProjectTrim;

  setInputValueSafe(sidebarEl.querySelector('#in-wall-length'), String(mmToDisplay(w.wallLength, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-wall-height'), String(mmToDisplay(w.wallHeight, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-wainscot-height'), String(mmToDisplay(w.wainscotHeight, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-baseboard-height'), String(mmToDisplay(w.baseboardHeight, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-chair-rail-height'), String(mmToDisplay(w.chairRailHeight, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-cornice-height'), String(mmToDisplay(w.corniceHeight, unit)));

  // Cornice preset sync (always compares canonical mm — works identically in mm and inches!)
  const cornicePreset = sidebarEl.querySelector<HTMLSelectElement>('#in-cornice-preset');
  if (cornicePreset) {
    if (w.corniceHeight === 90) cornicePreset.value = '90_cove';
    else if (w.corniceHeight === 75) cornicePreset.value = '75_cove';
    else if (w.corniceHeight === 55) cornicePreset.value = '55_cove';
    else if (w.corniceHeight === 0) cornicePreset.value = 'square_set';
    else cornicePreset.value = 'custom';
  }

  setInputValueSafe(sidebarEl.querySelector('#in-style'), w.style);
  setInputValueSafe(sidebarEl.querySelector('#in-trim-width'), String(mmToDisplay(w.trimWidth, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-inner-gap'), String(mmToDisplay(w.innerGap, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-grid-rows'), String(w.gridRows));
  setInputValueSafe(sidebarEl.querySelector('#in-grid-rail-width'), String(mmToDisplay(w.gridRailWidth, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-wall-color'), w.wallColor);
  setInputValueSafe(sidebarEl.querySelector('#in-wall-sheen'), w.wallSheen);
  setInputValueSafe(sidebarEl.querySelector('#in-trim-color'), w.trimColor);
  setInputValueSafe(sidebarEl.querySelector('#in-trim-sheen'), w.trimSheen);
  setInputValueSafe(sidebarEl.querySelector('#in-paint-scope'), w.paintScope);

  setInputValueSafe(sidebarEl.querySelector('#in-calc-mode'), w.calcMode);
  setInputValueSafe(sidebarEl.querySelector('#in-panel-count'), String(w.panelCount));
  setInputValueSafe(sidebarEl.querySelector('#in-target-width'), String(mmToDisplay(w.targetWidth, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-spacing'), String(mmToDisplay(w.spacing, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-margin-mode'), w.marginMode);
  setInputValueSafe(sidebarEl.querySelector('#in-custom-margin'), String(mmToDisplay(w.customMargin, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-margin-bottom'), String(mmToDisplay(w.marginBottom, unit)));
  setInputValueSafe(sidebarEl.querySelector('#in-margin-top'), String(mmToDisplay(w.marginTop, unit)));

  const twoTierChk = sidebarEl.querySelector<HTMLInputElement>('#chk-two-tier');
  if (twoTierChk) twoTierChk.checked = w.twoTier;
  setInputValueSafe(sidebarEl.querySelector('#in-tier-ratio'), String(w.tierRatio));
  setInputValueSafe(sidebarEl.querySelector('#in-tier-gap'), String(mmToDisplay(w.tierGap, unit)));

  // Conditional visibility
  const isBatten = isBoardAndBattenStyle(w.style);
  (sidebarEl.querySelector('#grp-inner-gap') as HTMLElement).style.display =
    w.style === 'double_picture_frame' ? 'flex' : 'none';
  (sidebarEl.querySelector('#grp-grid-opts') as HTMLElement).style.display =
    w.style === 'grid_batten' ? 'grid' : 'none';
  (sidebarEl.querySelector('#grp-picture-spacing') as HTMLElement).style.display = isBatten ? 'none' : 'block';
  (sidebarEl.querySelector('#grp-panel-count') as HTMLElement).style.display =
    w.calcMode === 'target_width' ? 'none' : 'flex';
  (sidebarEl.querySelector('#grp-target-width') as HTMLElement).style.display =
    w.calcMode === 'target_width' ? 'flex' : 'none';
  (sidebarEl.querySelector('#grp-custom-margin') as HTMLElement).style.display =
    w.marginMode === 'custom' ? 'flex' : 'none';
  (sidebarEl.querySelector('#grp-two-tier') as HTMLElement).style.display = w.twoTier ? 'grid' : 'none';

  // Render obstacles list (skip re-rendering inner DOM if an obstacle input inside is focused)
  const obsContainer = sidebarEl.querySelector<HTMLElement>('#obstacles-list')!;
  if (obsContainer.contains(document.activeElement)) return;

  if (w.obstacles.length === 0) {
    obsContainer.innerHTML = `<div style="font-size:11px; color:var(--text-muted);">No obstacles on this wall. Add outlets, doors, windows, or a TV — or drag them on the elevation.</div>`;
    return;
  }

  obsContainer.innerHTML = w.obstacles
    .map(
      (o) => `
      <div class="obstacle-item ${ui.selectedObstacleId === o.id ? 'selected' : ''}" data-obs-card="${escHtml(o.id)}">
        <div class="obstacle-header">
          <input type="text" data-obs-field="name" value="${escHtml(o.name)}" aria-label="Obstacle name" />
          <select data-obs-field="type" style="width:92px;" aria-label="Obstacle type">
            <option value="outlet" ${o.type === 'outlet' ? 'selected' : ''}>Outlet</option>
            <option value="door" ${o.type === 'door' ? 'selected' : ''}>Door</option>
            <option value="window" ${o.type === 'window' ? 'selected' : ''}>Window</option>
            <option value="tv" ${o.type === 'tv' ? 'selected' : ''}>TV</option>
            <option value="other" ${o.type === 'other' ? 'selected' : ''}>Other</option>
          </select>
          <button class="btn btn-sm btn-danger" data-obs-remove="${escHtml(o.id)}" type="button" title="Remove">&times;</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>X (${unit})</label>
            <input type="number" data-obs-num="x" value="${mmToDisplay(o.x, unit)}" step="5" />
          </div>
          <div class="form-group">
            <label>Y from Floor (${unit})</label>
            <input type="number" data-obs-num="y" value="${mmToDisplay(o.y, unit)}" step="5" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Width (${unit})</label>
            <input type="number" data-obs-num="width" value="${mmToDisplay(o.width, unit)}" min="10" step="5" />
          </div>
          <div class="form-group">
            <label>Height (${unit})</label>
            <input type="number" data-obs-num="height" value="${mmToDisplay(o.height, unit)}" min="10" step="5" />
          </div>
        </div>

        ${
          o.type === 'door' || o.type === 'window'
            ? `
          <div class="form-group">
            <label>Architrave Clearance (${unit})</label>
            <input type="number" data-obs-num="architraveMm" value="${mmToDisplay(o.architraveMm ?? (o.type === 'door' ? 70 : 0), unit)}" min="0" step="5" />
          </div>`
            : ''
        }

        <div class="obstacle-actions">
          <button class="btn btn-sm" data-obs-center="${escHtml(o.id)}" type="button">Center X</button>
          ${
            o.type === 'tv'
              ? `
            <button class="btn btn-sm" data-obs-align-tv="${escHtml(o.id)}" type="button">Align Above Rail</button>
            <select data-tv-preset="${escHtml(o.id)}" style="width:120px; padding:3px 6px; font-size:11px;">
              <option value="">TV Size...</option>
              <option value="55_canvas">55" CanvasTV</option>
              <option value="65_canvas">65" CanvasTV</option>
              <option value="75_canvas">75" Generic</option>
            </select>`
              : ''
          }
        </div>
      </div>`
    )
    .join('');

  // Bind obstacle card events
  obsContainer.querySelectorAll<HTMLElement>('.obstacle-item').forEach((card) => {
    const id = card.getAttribute('data-obs-card')!;
    const currentObs = w.obstacles.find((o) => o.id === id);
    if (!currentObs) return;

    card.addEventListener('click', () => {
      if (store.getSnapshot().ui.selectedObstacleId !== id) {
        store.selectObstacle(id);
      }
    });

    card.querySelector<HTMLInputElement>('[data-obs-field="name"]')?.addEventListener('change', (e) => {
      store.updateObstacle(id, { name: (e.target as HTMLInputElement).value });
    });

    card.querySelector<HTMLSelectElement>('[data-obs-field="type"]')?.addEventListener('change', (e) => {
      const nextType = (e.target as HTMLSelectElement).value as ObstacleType;
      const arch = nextType === 'door' ? 70 : nextType === 'window' ? 65 : 0;
      store.updateObstacle(id, { type: nextType, architraveMm: arch });
    });

    card.querySelectorAll<HTMLInputElement>('[data-obs-num]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const field = inp.getAttribute('data-obs-num') as 'x' | 'y' | 'width' | 'height' | 'architraveMm';
        const fallback = mmToDisplay(Number(currentObs[field] ?? 0), unit);
        const valDisplay = parseNumericInput(inp.value, fallback, 0);
        store.updateObstacle(id, { [field]: displayToMm(valDisplay, unit) });
      });
    });

    card.querySelector('[data-obs-remove]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.removeObstacle(id);
    });

    card.querySelector('[data-obs-center]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const centeredX = Math.max(0, Math.round((w.wallLength - currentObs.width) / 2));
      store.updateObstacle(id, { x: centeredX });
    });

    card.querySelector('[data-obs-align-tv]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.updateObstacle(id, { y: Math.round(w.wainscotHeight + 100) });
    });

    card.querySelector<HTMLSelectElement>('[data-tv-preset]')?.addEventListener('change', (e) => {
      const sel = e.target as HTMLSelectElement;
      const tv = TV_PRESETS[sel.value];
      if (tv) {
        store.updateObstacle(id, { name: tv.name, width: tv.widthMm, height: tv.heightMm });
      }
      sel.value = '';
    });
  });
}
