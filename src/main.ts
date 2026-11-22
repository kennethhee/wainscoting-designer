import './styles/main.css';
import { store } from './state/store';
import { initDrawer, renderDrawer } from './ui/drawer';
import { bindElevationInteractions, renderElevation } from './ui/elevation';
import { initHeader, renderHeader } from './ui/header';
import { initSidebar, renderSidebar } from './ui/sidebar';

function bootstrap(): void {
  const headerEl = document.getElementById('app-header')!;
  const sidebarEl = document.getElementById('app-sidebar')!;
  const canvasSectionEl = document.getElementById('canvas-section')!;
  const drawerEl = document.getElementById('output-drawer')!;

  initHeader(headerEl);
  initSidebar(sidebarEl);
  bindElevationInteractions(canvasSectionEl);
  initDrawer(drawerEl);

  const printDateEl = document.getElementById('print-date');
  if (printDateEl) {
    printDateEl.textContent = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  store.subscribe((snap) => {
    if (snap.ui.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const dimsChk = document.getElementById('chk-show-dims') as HTMLInputElement | null;
    const shadingChk = document.getElementById('chk-show-shading') as HTMLInputElement | null;
    if (dimsChk) dimsChk.checked = snap.ui.showDims;
    if (shadingChk) shadingChk.checked = snap.ui.showShading;

    renderHeader(headerEl, snap);
    renderSidebar(sidebarEl, snap);
    renderElevation(canvasSectionEl, snap);
    renderDrawer(drawerEl, snap);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
