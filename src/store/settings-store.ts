import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";
export type LanguagePreference = "en" | "zh";
export type ShortcutAction =
  | "upload"
  | "camera"
  | "startScan"
  | "clearAll"
  | "openSettings"
  | "openChat";

export type ShortcutMap = Record<ShortcutAction, string>;

const DEFAULT_SHORTCUTS: ShortcutMap = {
  upload: "ctrl+1",
  camera: "ctrl+2",
  startScan: "ctrl+3",
  clearAll: "ctrl+4",
  openSettings: "ctrl+5",
  openChat: "ctrl+e",
};

const DEFAULT_LANGUAGE: LanguagePreference =
  typeof window !== "undefined" && window.navigator.language.startsWith("zh")
    ? "zh"
    : "en";

export interface SettingsState {
  imageBinarizing: boolean;
  setImageBinarizing: (imagePostprocessing: boolean) => void;

  showDonateBtn: boolean;
  setShowDonateBtn: (showDonateBtn: boolean) => void;

  theme: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;

  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;

  keybindings: ShortcutMap;
  setKeybinding: (action: ShortcutAction, binding: string) => void;
  resetKeybindings: () => void;

  traits: string;
  setTraits: (traits: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      imageBinarizing: false,
      showDonateBtn: true,
      theme: "system",
      language: DEFAULT_LANGUAGE,
      keybindings: { ...DEFAULT_SHORTCUTS },
      traits: "",

      setImageBinarizing: (state) => set({ imageBinarizing: state }),
      setShowDonateBtn: (state) => set({ showDonateBtn: state }),
      setThemePreference: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setKeybinding: (action, binding) =>
        set((state) => ({
          keybindings: {
            ...state.keybindings,
            [action]: binding,
          },
        })),
      resetKeybindings: () => set({ keybindings: { ...DEFAULT_SHORTCUTS } }),
      setTraits: (traits) => set({ traits }),
    }),
    {
      name: "skidhw-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        imageBinarizing: state.imageBinarizing,
        showDonateBtn: state.showDonateBtn,
        theme: state.theme,
        language: state.language,
        keybindings: state.keybindings,
      }),
      version: 3,
      migrate: (persistedState, version) => {
        const data =
          persistedState && typeof persistedState === "object"
            ? { ...persistedState }
            : {};

        if (version < 3) {
          return {
            ...data,
            keybindings: { ...DEFAULT_SHORTCUTS },
          };
        }

        const existing = (data as { keybindings?: ShortcutMap }).keybindings;

        return {
          ...data,
          keybindings: existing
            ? { ...DEFAULT_SHORTCUTS, ...existing }
            : { ...DEFAULT_SHORTCUTS },
        };
      },
    },
  ),
);

export const getDefaultShortcuts = () => ({ ...DEFAULT_SHORTCUTS });
