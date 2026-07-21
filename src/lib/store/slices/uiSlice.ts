import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const SIDEBAR_PINNED_KEY = "finos:sidebar-pinned";
export const SIDEBAR_WIDTH_KEY = "finos:sidebar-width";

export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 420;
export const DEFAULT_SIDEBAR_WIDTH = 260;

export type ToastTone = "success" | "info" | "warning" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

export type ToastItem = ToastInput & { id: string };

export type UiState = {
  sidebarHydrated: boolean;
  sidebarPinned: boolean;
  sidebarPeeking: boolean;
  sidebarWidth: number;
  sidebarResizing: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  toasts: ToastItem[];
};

const initialState: UiState = {
  sidebarHydrated: false,
  sidebarPinned: true,
  sidebarPeeking: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  sidebarResizing: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  toasts: [],
};

function clampWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    hydrateSidebar(
      state,
      action: PayloadAction<{ pinned: boolean; width: number }>,
    ) {
      state.sidebarPinned = action.payload.pinned;
      state.sidebarWidth = clampWidth(action.payload.width);
      state.sidebarPeeking = false;
      state.sidebarHydrated = true;
    },
    setSidebarPinned(state, action: PayloadAction<boolean>) {
      state.sidebarPinned = action.payload;
      state.sidebarPeeking = false;
    },
    toggleSidebarPinned(state) {
      state.sidebarPinned = !state.sidebarPinned;
      state.sidebarPeeking = false;
    },
    setSidebarPeeking(state, action: PayloadAction<boolean>) {
      if (!state.sidebarPinned) {
        state.sidebarPeeking = action.payload;
      }
    },
    setSidebarWidth(state, action: PayloadAction<number>) {
      state.sidebarWidth = clampWidth(action.payload);
    },
    setSidebarResizing(state, action: PayloadAction<boolean>) {
      state.sidebarResizing = action.payload;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    openCommandPalette(state) {
      state.commandPaletteOpen = true;
    },
    closeCommandPalette(state) {
      state.commandPaletteOpen = false;
    },
    showToast(state, action: PayloadAction<ToastInput>) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      state.toasts = [
        ...state.toasts.slice(-3),
        { tone: "info", ...action.payload, id },
      ];
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const {
  hydrateSidebar,
  setSidebarPinned,
  toggleSidebarPinned,
  setSidebarPeeking,
  setSidebarWidth,
  setSidebarResizing,
  setMobileNavOpen,
  openCommandPalette,
  closeCommandPalette,
  showToast,
  dismissToast,
} = uiSlice.actions;
export default uiSlice.reducer;

export function selectSidebarVisible(state: { ui: UiState }) {
  return state.ui.sidebarPinned || state.ui.sidebarPeeking;
}
