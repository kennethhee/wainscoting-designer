import {
  DEFAULT_TRIM_SPEC,
  STYLE_PRESETS,
  computeCutList,
  computeProjectTotals,
  computeWallGeometry,
  createStanhopeGardensProject,
  createStarterProject,
  createWall,
  normalizeProject
} from '../engine';
import type {
  CutPiece,
  Obstacle,
  Project,
  ProjectTotals,
  StockSettings,
  TrimSpec,
  Unit,
  UnitPrices,
  Wall,
  WallGeometry
} from '../engine';

export type DrawerTab = 'cutlist' | 'stock' | 'materials' | 'project';
export type Theme = 'light' | 'dark';

export interface UIState {
  zoomLevel: number;
  panX: number;
  panY: number;
  showDims: boolean;
  showShading: boolean;
  activeDrawerTab: DrawerTab;
  drawerCollapsed: boolean;
  selectedObstacleId: string | null;
  theme: Theme;
  autosaveStatus: string;
  conflictsDismissed: boolean;
}

export interface ComputedSnapshot {
  project: Project;
  ui: UIState;
  activeWall: Wall;
  geometry: WallGeometry;
  cuts: CutPiece[];
  projectTotals: ProjectTotals;
  canUndo: boolean;
  canRedo: boolean;
}

type Listener = (snap: ComputedSnapshot) => void;

const STORAGE_KEY_V2 = 'wainscot-studio-v2';
const LEGACY_KEYS = ['wainscot-project-v5', 'wainscot-project-v4', 'wainscot-project-v3'];
const THEME_KEY = 'wainscot-theme';
const HISTORY_LIMIT = 100;

const TRIM_KEYS: (keyof TrimSpec)[] = [
  'wainscotHeight',
  'baseboardHeight',
  'chairRailHeight',
  'corniceHeight',
  'style',
  'wallColor',
  'wallSheen',
  'trimColor',
  'trimSheen',
  'paintScope',
  'trimWidth',
  'innerGap',
  'gridRows',
  'gridRailWidth',
  'spacing',
  'marginBottom',
  'marginTop',
  'twoTier',
  'tierRatio',
  'tierGap'
];

function cloneProject(p: Project): Project {
  return JSON.parse(JSON.stringify(p)) as Project;
}

class AppStore {
  private project: Project;
  private ui: UIState;
  private listeners = new Set<Listener>();
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const savedTheme = this.safeGetStorage(THEME_KEY);
    this.ui = {
      zoomLevel: 1.0,
      panX: 0,
      panY: 0,
      showDims: true,
      showShading: true,
      activeDrawerTab: 'cutlist',
      drawerCollapsed: false,
      selectedObstacleId: null,
      theme: savedTheme === 'dark' ? 'dark' : 'light',
      autosaveStatus: 'Ready',
      conflictsDismissed: false
    };
    this.project = this.loadInitialProject();
    this.undoStack = [JSON.stringify(this.project)];
  }

  private safeGetStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSetStorage(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch {
      // Ignore private browsing / quota errors
    }
  }

  private loadInitialProject(): Project {
    const rawV2 = this.safeGetStorage(STORAGE_KEY_V2);
    if (rawV2) {
      try {
        this.ui.autosaveStatus = 'Draft restored';
        return normalizeProject(JSON.parse(rawV2));
      } catch {
        // Fall through to legacy or starter
      }
    }

    // Attempt seamless migration from legacy v1-v5 drafts
    for (const key of LEGACY_KEYS) {
      const rawLegacy = this.safeGetStorage(key);
      if (rawLegacy) {
        try {
          const migrated = normalizeProject(JSON.parse(rawLegacy));
          this.safeSetStorage(STORAGE_KEY_V2, JSON.stringify(migrated));
          this.ui.autosaveStatus = 'Migrated previous draft';
          return migrated;
        } catch {
          // Try next key
        }
      }
    }

    return createStarterProject();
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => this.listeners.delete(fn);
  }

  public getSnapshot(): ComputedSnapshot {
    const activeWall = this.project.walls[this.project.currentWallIndex] ?? this.project.walls[0]!;
    const geometry = computeWallGeometry(activeWall);
    const cuts = computeCutList(geometry, activeWall);
    const projectTotals = computeProjectTotals(
      this.project.walls,
      this.project.unit,
      this.project.stockSettings,
      this.project.unitPrices
    );

    return {
      project: this.project,
      ui: this.ui,
      activeWall,
      geometry,
      cuts,
      projectTotals,
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0
    };
  }

  private emit(recordHistory = true): void {
    if (recordHistory) {
      this.scheduleCommit();
    }
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private scheduleCommit(): void {
    this.ui.autosaveStatus = 'Saving...';
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commitNow(), 300);
  }

  public commitNow(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    const serialized = JSON.stringify(this.project);
    if (this.undoStack[this.undoStack.length - 1] !== serialized) {
      this.undoStack.push(serialized);
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
      this.redoStack = [];
    }
    this.safeSetStorage(STORAGE_KEY_V2, serialized);
    this.ui.autosaveStatus = 'Draft saved';
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1]!;
    this.project = normalizeProject(JSON.parse(prev));
    this.safeSetStorage(STORAGE_KEY_V2, prev);
    this.ui.autosaveStatus = 'Undid change';
    this.emit(false);
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.project = normalizeProject(JSON.parse(next));
    this.safeSetStorage(STORAGE_KEY_V2, next);
    this.ui.autosaveStatus = 'Redid change';
    this.emit(false);
  }

  // --- Display & UI Actions ---

  public setUnit(unit: Unit): void {
    if (this.project.unit === unit) return;
    // Canonical mm storage: changing unit ONLY changes display formatting!
    this.project = { ...this.project, unit };
    this.emit(true);
  }

  public setTheme(theme: Theme): void {
    this.ui = { ...this.ui, theme };
    this.safeSetStorage(THEME_KEY, theme);
    this.emit(false);
  }

  public setDrawerTab(tab: DrawerTab): void {
    this.ui = { ...this.ui, activeDrawerTab: tab, drawerCollapsed: false };
    this.emit(false);
  }

  public toggleDrawer(): void {
    this.ui = { ...this.ui, drawerCollapsed: !this.ui.drawerCollapsed };
    this.emit(false);
  }

  public setZoom(zoomLevel: number): void {
    this.ui = { ...this.ui, zoomLevel: Math.max(0.4, Math.min(6.0, zoomLevel)) };
    this.emit(false);
  }

  public setViewport(zoomLevel: number, panX: number, panY: number): void {
    this.ui = {
      ...this.ui,
      zoomLevel: Math.max(0.4, Math.min(6.0, zoomLevel)),
      panX,
      panY
    };
    this.emit(false);
  }

  public resetViewport(): void {
    this.ui = { ...this.ui, zoomLevel: 1.0, panX: 0, panY: 0 };
    this.emit(false);
  }

  public setShowDims(showDims: boolean): void {
    this.ui = { ...this.ui, showDims };
    this.emit(false);
  }

  public setShowShading(showShading: boolean): void {
    this.ui = { ...this.ui, showShading };
    this.emit(false);
  }

  public selectObstacle(id: string | null): void {
    this.ui = { ...this.ui, selectedObstacleId: id };
    this.emit(false);
  }

  public dismissConflicts(): void {
    this.ui = { ...this.ui, conflictsDismissed: true };
    this.emit(false);
  }

  // --- Wall & Trim Mutations ---

  public switchWall(index: number): void {
    if (index < 0 || index >= this.project.walls.length) return;
    this.project = { ...this.project, currentWallIndex: index };
    this.ui = { ...this.ui, selectedObstacleId: null, conflictsDismissed: false, zoomLevel: 1.0, panX: 0, panY: 0 };
    this.emit(false);
  }

  public addWall(): void {
    const num = this.project.walls.length + 1;
    const newWall = createWall(
      { id: `wall-${Date.now()}`, name: `Wall ${num}` },
      this.project.trimDefaults
    );
    const walls = [...this.project.walls, newWall];
    this.project = { ...this.project, walls, currentWallIndex: walls.length - 1 };
    this.ui = { ...this.ui, selectedObstacleId: null, conflictsDismissed: false };
    this.emit(true);
  }

  public duplicateActiveWall(): void {
    const active = this.getSnapshot().activeWall;
    const copy: Wall = JSON.parse(JSON.stringify(active));
    copy.id = `wall-${Date.now()}`;
    copy.name = `${active.name} (Copy)`;
    const walls = [...this.project.walls, copy];
    this.project = { ...this.project, walls, currentWallIndex: walls.length - 1 };
    this.emit(true);
  }

  public deleteWall(index: number): void {
    if (this.project.walls.length <= 1) return;
    const walls = this.project.walls.filter((_, i) => i !== index);
    const currentWallIndex = Math.min(this.project.currentWallIndex, walls.length - 1);
    this.project = { ...this.project, walls, currentWallIndex };
    this.ui = { ...this.ui, selectedObstacleId: null };
    this.emit(true);
  }

  /**
   * Updates the active wall. If the wall follows project trim continuity and
   * trim-level fields are modified, also updates project.trimDefaults and all
   * other linked walls so multi-room continuity stays locked automatically.
   */
  public updateActiveWall(patch: Partial<Wall>, recordHistory = true): void {
    const idx = this.project.currentWallIndex;
    const active = this.project.walls[idx];
    if (!active) return;

    const updatedActive: Wall = { ...active, ...patch };
    const trimPatch: Partial<TrimSpec> = {};
    let hasTrimChange = false;

    for (const k of TRIM_KEYS) {
      if (k in patch) {
        (trimPatch as Record<string, unknown>)[k] = patch[k];
        hasTrimChange = true;
      }
    }

    let trimDefaults = this.project.trimDefaults;
    const walls = this.project.walls.map((w, i) => {
      if (i === idx) return updatedActive;
      if (hasTrimChange && updatedActive.followProjectTrim && w.followProjectTrim) {
        return { ...w, ...trimPatch };
      }
      return w;
    });

    if (hasTrimChange && updatedActive.followProjectTrim) {
      trimDefaults = { ...trimDefaults, ...trimPatch };
    }

    this.project = { ...this.project, trimDefaults, walls };
    this.ui = { ...this.ui, conflictsDismissed: false };
    this.emit(recordHistory);
  }

  public syncActiveTrimToAllWalls(): void {
    const active = this.getSnapshot().activeWall;
    const trimPatch: TrimSpec = { ...DEFAULT_TRIM_SPEC };
    for (const k of TRIM_KEYS) {
      (trimPatch as unknown as Record<string, unknown>)[k] = active[k];
    }
    const walls = this.project.walls.map((w) => ({
      ...w,
      ...trimPatch,
      followProjectTrim: true
    }));
    this.project = { ...this.project, trimDefaults: trimPatch, walls };
    this.emit(true);
  }

  // --- Obstacles ---

  public addObstacle(obs: Omit<Obstacle, 'id'>): void {
    const active = this.getSnapshot().activeWall;
    const created: Obstacle = { ...obs, id: `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
    this.updateActiveWall({ obstacles: [...active.obstacles, created] }, true);
    this.ui = { ...this.ui, selectedObstacleId: created.id };
    this.emit(false);
  }

  public updateObstacle(id: string, patch: Partial<Obstacle>, recordHistory = true): void {
    const active = this.getSnapshot().activeWall;
    const obstacles = active.obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o));
    this.updateActiveWall({ obstacles }, recordHistory);
  }

  public removeObstacle(id: string): void {
    const active = this.getSnapshot().activeWall;
    const obstacles = active.obstacles.filter((o) => o.id !== id);
    if (this.ui.selectedObstacleId === id) {
      this.ui = { ...this.ui, selectedObstacleId: null };
    }
    this.updateActiveWall({ obstacles }, true);
  }

  // --- Stock & Prices ---

  public updateStockSettings(patch: Partial<StockSettings>): void {
    this.project = {
      ...this.project,
      stockSettings: { ...this.project.stockSettings, ...patch }
    };
    this.emit(true);
  }

  public updateUnitPrice(key: keyof UnitPrices, val: number): void {
    this.project = {
      ...this.project,
      unitPrices: { ...this.project.unitPrices, [key]: Math.max(0, val) }
    };
    this.emit(true);
  }

  // --- Presets & Import/Export ---

  public applyStylePreset(presetKey: string): void {
    const preset = STYLE_PRESETS[presetKey];
    if (!preset) return;
    const { label: _l, description: _d, ...trimPatch } = preset;
    this.updateActiveWall(trimPatch, true);
  }

  public loadProjectPreset(preset: 'starter' | 'stanhope_gardens'): void {
    const unit = this.project.unit;
    const next = preset === 'stanhope_gardens' ? createStanhopeGardensProject() : createStarterProject();
    next.unit = unit;
    this.project = cloneProject(next);
    this.ui = { ...this.ui, selectedObstacleId: null, conflictsDismissed: false };
    this.commitNow();
  }

  public importProject(raw: unknown): void {
    const normalized = normalizeProject(raw);
    this.project = normalized;
    this.ui = { ...this.ui, selectedObstacleId: null, conflictsDismissed: false };
    this.commitNow();
  }
}

export const store = new AppStore();
