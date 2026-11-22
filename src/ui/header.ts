import { STYLE_PRESETS } from '../engine';
import { store } from '../state/store';
import type { ComputedSnapshot } from '../state/store';

function downloadBlob(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function initHeader(headerEl: HTMLElement): void {
  const styleOptions = Object.entries(STYLE_PRESETS)
    .map(([k, v]) => `<option value="style:${k}">${v.label}</option>`)
    .join('');

  headerEl.innerHTML = `
    <div class="header-brand">
      <div class="brand-mark">W</div>
      <div>
        <div class="brand-title">Wainscot Studio</div>
        <div class="brand-subtitle">Architectural Layout &amp; Carpentry Calculator</div>
      </div>
    </div>

    <div class="header-controls">
      <span class="autosave-pill" id="autosave-status">Ready</span>

      <select id="preset-select" style="width: 210px;" aria-label="Load preset">
        <option value="">Load Preset / Project...</option>
        <optgroup label="Project">
          <option value="project:starter">Reset to Feature Wall + 55&quot; TV</option>
        </optgroup>
        <optgroup label="Architectural Styles (Active Wall)">
          ${styleOptions}
        </optgroup>
      </select>

      <div class="unit-toggle" role="group" aria-label="Display Units">
        <button id="unit-mm" type="button">mm</button>
        <button id="unit-in" type="button">in</button>
      </div>

      <button class="btn" id="btn-undo" type="button" title="Undo (Ctrl/Cmd+Z)">Undo</button>
      <button class="btn" id="btn-redo" type="button" title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
      <button class="btn" id="btn-export-json" type="button">Save JSON</button>
      <button class="btn" id="btn-import-json" type="button">Load JSON</button>
      <input type="file" id="import-json-input" accept=".json" style="display:none;" />
      <button class="btn" id="btn-theme" type="button">Dark</button>
      <button class="btn btn-primary" id="btn-print" type="button">Print Plan</button>
    </div>
  `;

  headerEl.querySelector('#unit-mm')?.addEventListener('click', () => store.setUnit('mm'));
  headerEl.querySelector('#unit-in')?.addEventListener('click', () => store.setUnit('in'));
  headerEl.querySelector('#btn-undo')?.addEventListener('click', () => store.undo());
  headerEl.querySelector('#btn-redo')?.addEventListener('click', () => store.redo());
  headerEl.querySelector('#btn-theme')?.addEventListener('click', () => {
    const cur = store.getSnapshot().ui.theme;
    store.setTheme(cur === 'dark' ? 'light' : 'dark');
  });
  headerEl.querySelector('#btn-print')?.addEventListener('click', () => window.print());

  headerEl.querySelector('#btn-export-json')?.addEventListener('click', () => {
    const p = store.getSnapshot().project;
    downloadBlob(JSON.stringify(p, null, 2), 'application/json', 'wainscot-project.json');
  });

  const fileInput = headerEl.querySelector<HTMLInputElement>('#import-json-input')!;
  headerEl.querySelector('#btn-import-json')?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        store.importProject(JSON.parse(String(reader.result)));
      } catch (err) {
        alert(`Could not load project: ${err instanceof Error ? err.message : String(err)}`);
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  const presetSelect = headerEl.querySelector<HTMLSelectElement>('#preset-select')!;
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;
    if (val === 'project:stanhope_gardens') {
      store.loadProjectPreset('stanhope_gardens');
    } else if (val === 'project:starter') {
      store.loadProjectPreset('starter');
    } else if (val.startsWith('style:')) {
      store.applyStylePreset(val.slice('style:'.length));
    }
    presetSelect.value = '';
  });

  // Keyboard shortcuts for Undo/Redo
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    }
  });
}

export function renderHeader(headerEl: HTMLElement, snap: ComputedSnapshot): void {
  const statusEl = headerEl.querySelector<HTMLElement>('#autosave-status');
  if (statusEl) statusEl.textContent = snap.ui.autosaveStatus;

  headerEl.querySelector('#unit-mm')?.classList.toggle('active', snap.project.unit === 'mm');
  headerEl.querySelector('#unit-in')?.classList.toggle('active', snap.project.unit === 'in');

  const undoBtn = headerEl.querySelector<HTMLButtonElement>('#btn-undo');
  const redoBtn = headerEl.querySelector<HTMLButtonElement>('#btn-redo');
  if (undoBtn) undoBtn.disabled = !snap.canUndo;
  if (redoBtn) redoBtn.disabled = !snap.canRedo;

  const themeBtn = headerEl.querySelector<HTMLButtonElement>('#btn-theme');
  if (themeBtn) themeBtn.textContent = snap.ui.theme === 'dark' ? 'Light' : 'Dark';
}
