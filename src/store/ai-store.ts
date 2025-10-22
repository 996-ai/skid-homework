import { GeminiAi } from "@/ai/gemini";
import { OpenAiClient } from "@/ai/openai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AiProvider = "gemini" | "openai";

export type AiModelSummary = {
  name: string;
  displayName: string;
};

export interface AiSource {
  id: string;
  name: string;
  provider: AiProvider;
  apiKey: string | null;
  baseUrl?: string;
  model: string;
  traits?: string;
  thinkingBudget?: number;
  enabled: boolean;
  pollIntervalMs?: number;
  maxPollMs?: number;
}

export interface AiClient {
  setSystemPrompt: (prompt: string) => void;
  sendMedia: (
    media: string,
    mimeType: string,
    prompt?: string,
    model?: string,
    callback?: (text: string) => void,
  ) => Promise<string>;
  getAvailableModels?: () => Promise<AiModelSummary[]>;
}

export const DEFAULT_GEMINI_MODEL = "models/gemini-2.5-flash";
export const DEFAULT_GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";

function loadLegacyGemini(): Partial<AiSource> | null {
  if (typeof window === "undefined") return null;
  try {
    const legacyRaw = window.localStorage.getItem("gemini-storage");
    if (!legacyRaw) return null;
    const parsed = JSON.parse(legacyRaw) as {
      state?: {
        geminiKey?: string | null;
        geminiBaseUrl?: string;
        geminiModel?: string;
        traits?: string;
        thinkingBudget?: number;
      };
    };
    const legacyState = parsed?.state;
    if (!legacyState) return null;
    return {
      apiKey: legacyState.geminiKey ?? null,
      baseUrl: legacyState.geminiBaseUrl ?? DEFAULT_GEMINI_BASE_URL,
      model: legacyState.geminiModel ?? DEFAULT_GEMINI_MODEL,
      traits: legacyState.traits,
      thinkingBudget: legacyState.thinkingBudget ?? 8192,
    };
  } catch (error) {
    console.warn("Failed to migrate legacy Gemini configuration", error);
    return null;
  }
}

function createDefaultSources(): AiSource[] {
  const legacy = loadLegacyGemini();
  return [
    {
      id: "gemini-default",
      name: "Gemini",
      provider: "gemini",
      apiKey: legacy?.apiKey ?? null,
      baseUrl: legacy?.baseUrl ?? DEFAULT_GEMINI_BASE_URL,
      model: legacy?.model ?? DEFAULT_GEMINI_MODEL,
      traits: legacy?.traits,
      thinkingBudget: legacy?.thinkingBudget ?? 8192,
      enabled: true,
      pollIntervalMs: undefined,
      maxPollMs: undefined,
    },
    {
      id: "openai-default",
      name: "OpenAI",
      provider: "openai",
      apiKey: null,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      model: DEFAULT_OPENAI_MODEL,
      traits: undefined,
      thinkingBudget: undefined,
      enabled: false,
      pollIntervalMs: 1_000,
      maxPollMs: 30_000,
    },
  ];
}

function createClientForSource(source: AiSource): AiClient | null {
  if (!source.apiKey) return null;

  if (source.provider === "gemini") {
    return new GeminiAi(source.apiKey, source.baseUrl, {
      thinkingBudget: source.thinkingBudget,
    });
  }

  if (source.provider === "openai") {
    return new OpenAiClient(source.apiKey, source.baseUrl, {
      pollIntervalMs: source.pollIntervalMs,
      maxPollMs: source.maxPollMs,
    });
  }

  return null;
}

export interface AiStore {
  sources: AiSource[];
  activeSourceId: string;

  addSource: (source: Omit<AiSource, "id">) => string;
  updateSource: (id: string, updates: Partial<AiSource>) => void;
  removeSource: (id: string) => void;
  toggleSource: (id: string, enabled: boolean) => void;
  setActiveSource: (id: string) => void;

  getActiveSource: () => AiSource | null;
  getEnabledSources: () => AiSource[];
  getSourceById: (id: string) => AiSource | undefined;
  hasActiveKey: () => boolean;
  allowPdfUpload: () => boolean;
  getClientForSource: (id?: string) => AiClient | null;
}

export const useAiStore = create<AiStore>()(
  persist(
    (set, get) => ({
      sources: createDefaultSources(),
      activeSourceId: "gemini-default",

      addSource: (source) => {
        const id = crypto.randomUUID();
        set((state) => ({
          sources: [
            ...state.sources,
            {
              ...source,
              id,
            },
          ],
        }));
        return id;
      },

      updateSource: (id, updates) =>
        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, ...updates } : source,
          ),
        })),

      removeSource: (id) =>
        set((state) => {
          const nextSources = state.sources.filter(
            (source) => source.id !== id,
          );

          const nextActive =
            state.activeSourceId === id
              ? nextSources.find((source) => source.enabled)?.id ??
                nextSources[0]?.id ??
                "gemini-default"
              : state.activeSourceId;

          return {
            sources: nextSources,
            activeSourceId: nextActive,
          };
        }),

      toggleSource: (id, enabled) =>
        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, enabled } : source,
          ),
        })),

      setActiveSource: (id) =>
        set((state) => {
          const exists = state.sources.some((source) => source.id === id);
          return exists ? { activeSourceId: id } : state;
        }),

      getActiveSource: () => {
        const state = get();
        const enabled = state.sources.filter(
          (source) => source.enabled && source.apiKey,
        );
        if (enabled.length > 0) {
          const index = Math.floor(Math.random() * enabled.length);
          return enabled[index];
        }
        return state.sources[0] ?? null;
      },

      getEnabledSources: () =>
        get().sources.filter((source) => source.enabled && source.apiKey),

      getSourceById: (id) => get().sources.find((source) => source.id === id),

      hasActiveKey: () => {
        return get().getEnabledSources().length > 0;
      },

      allowPdfUpload: () => {
        return get()
          .getEnabledSources()
          .some((source) => source.provider === "gemini");
      },

      getClientForSource: (id) => {
        const state = get();
        if (id) {
          const explicitSource = state.sources.find(
            (entry) => entry.id === id,
          );
          return explicitSource ? createClientForSource(explicitSource) : null;
        }

        const enabled = state.getEnabledSources();
        const fallbackSources = enabled.length > 0 ? enabled : state.sources;
        if (!fallbackSources.length) return null;

        const randomIndex = Math.floor(Math.random() * fallbackSources.length);
        const chosen = fallbackSources[randomIndex];
        return createClientForSource(chosen);
      },
    }),
    {
      name: "ai-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sources: state.sources,
        activeSourceId: state.activeSourceId,
      }),
      version: 1,
    },
  ),
);

export const useHasActiveAiKey = () =>
  useAiStore((state) => state.hasActiveKey());
