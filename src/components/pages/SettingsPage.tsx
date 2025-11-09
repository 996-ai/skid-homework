import {
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  type AiModelSummary,
  type AiProvider,
  useAiStore,
} from "@/store/ai-store";
import {
  useSettingsStore,
  type LanguagePreference,
  type ThemePreference,
  type ShortcutAction,
} from "@/store/settings-store";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Kbd } from "../ui/kbd";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import { useTheme } from "../theme-provider";
import ShortcutRecorder from "../ShortcutRecorder";

const DEFAULT_BASE_BY_PROVIDER: Record<AiProvider, string> = {
  gemini: DEFAULT_GEMINI_BASE_URL,
  openai: DEFAULT_OPENAI_BASE_URL,
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation("commons", { keyPrefix: "settings-page" });

  const sources = useAiStore((s) => s.sources);
  const activeSourceId = useAiStore((s) => s.activeSourceId);
  const setActiveSource = useAiStore((s) => s.setActiveSource);
  const updateSource = useAiStore((s) => s.updateSource);
  const toggleSource = useAiStore((s) => s.toggleSource);
  const addSource = useAiStore((s) => s.addSource);
  const removeSource = useAiStore((s) => s.removeSource);
  const getClientForSource = useAiStore((s) => s.getClientForSource);

  const {
    imageBinarizing,
    setImageBinarizing,
    showDonateBtn,
    setShowDonateBtn,
    theme: themePreference,
    setThemePreference,
    language,
    setLanguage,
    keybindings,
    setKeybinding,
    resetKeybindings,
  } = useSettingsStore((s) => s);
  const { theme: activeTheme, setTheme } = useTheme();

  const activeSource = useMemo(
    () => sources.find((source) => source.id === activeSourceId) ?? sources[0],
    [sources, activeSourceId],
  );

  const [localName, setLocalName] = useState(activeSource?.name ?? "");
  const [localApiKey, setLocalApiKey] = useState(activeSource?.apiKey ?? "");
  const [localBaseUrl, setLocalBaseUrl] = useState(
    activeSource?.baseUrl ??
      (activeSource ? DEFAULT_BASE_BY_PROVIDER[activeSource.provider] : ""),
  );
  const [localTraits, setLocalTraits] = useState(activeSource?.traits ?? "");
  const [localThinkingBudget, setLocalThinkingBudget] = useState(
    activeSource?.thinkingBudget ?? 8192,
  );
  const [localPollInterval, setLocalPollInterval] = useState(
    activeSource?.pollIntervalMs?.toString() ?? "1000",
  );
  const [localMaxPoll, setLocalMaxPoll] = useState(
    activeSource?.maxPollMs?.toString() ?? "30000",
  );
  const [availableModels, setAvailableModels] = useState<AiModelSummary[]>([]);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState<AiProvider>("gemini");
  const [newSourceName, setNewSourceName] = useState("");

  useEffect(() => {
    setLocalName(activeSource?.name ?? "");
    setLocalApiKey(activeSource?.apiKey ?? "");
    setLocalBaseUrl(
      activeSource?.baseUrl ??
        (activeSource ? DEFAULT_BASE_BY_PROVIDER[activeSource.provider] : ""),
    );
    setLocalTraits(activeSource?.traits ?? "");
    setLocalThinkingBudget(activeSource?.thinkingBudget ?? 8192);
    setLocalPollInterval(activeSource?.pollIntervalMs?.toString() ?? "1000");
    setLocalMaxPoll(activeSource?.maxPollMs?.toString() ?? "30000");
  }, [activeSource]);

  const navigate = useNavigate();
  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);
  useHotkeys("esc", handleBack);

  useEffect(() => {
    if (themePreference !== activeTheme) {
      setTheme(themePreference);
    }
  }, [themePreference, activeTheme, setTheme]);

  const themeOptions = useMemo(
    () => [
      {
        value: "system" as ThemePreference,
        label: t("appearance.theme.options.system"),
      },
      {
        value: "light" as ThemePreference,
        label: t("appearance.theme.options.light"),
      },
      {
        value: "dark" as ThemePreference,
        label: t("appearance.theme.options.dark"),
      },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      {
        value: "en" as LanguagePreference,
        label: t("appearance.language.options.en"),
      },
      {
        value: "zh" as LanguagePreference,
        label: t("appearance.language.options.zh"),
      },
    ],
    [t],
  );

  const handleThemeSelect = (value: ThemePreference) => {
    setThemePreference(value);
    setTheme(value);
  };

  const handleLanguageSelect = (value: LanguagePreference) => {
    setLanguage(value);
    if (i18n.language !== value) {
      i18n.changeLanguage(value);
    }
  };

  const loadModels = useCallback(async () => {
    if (!activeSource?.id || !activeSource.apiKey) {
      setAvailableModels([]);
      return;
    }
    try {
      const client = getClientForSource(activeSource.id);
      if (!client?.getAvailableModels) {
        setAvailableModels([]);
        return;
      }
      const models = await client.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error("Failed to fetch models", error);
      setAvailableModels([]);
      toast.error(
        t("model.fetch.error", {
          provider: activeSource.name,
        }),
      );
    }
  }, [activeSource, getClientForSource, t]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const translateSettings = useCallback(
    (key: string) => t(key as never) as string,
    [t],
  );

  const shortcutItems = useMemo(() => {
    return [
      {
        action: "upload" as ShortcutAction,
        label: translateSettings("shortcuts.actions.upload.label"),
        description: translateSettings("shortcuts.actions.upload.description"),
      },
      {
        action: "camera" as ShortcutAction,
        label: translateSettings("shortcuts.actions.camera.label"),
        description: translateSettings("shortcuts.actions.camera.description"),
      },
      {
        action: "startScan" as ShortcutAction,
        label: translateSettings("shortcuts.actions.startScan.label"),
        description: translateSettings(
          "shortcuts.actions.startScan.description",
        ),
      },
      {
        action: "clearAll" as ShortcutAction,
        label: translateSettings("shortcuts.actions.clearAll.label"),
        description: translateSettings(
          "shortcuts.actions.clearAll.description",
        ),
      },
      {
        action: "openSettings" as ShortcutAction,
        label: translateSettings("shortcuts.actions.openSettings.label"),
        description: translateSettings(
          "shortcuts.actions.openSettings.description",
        ),
      },
      {
        action: "openChat" as ShortcutAction,
        label: translateSettings("shortcuts.actions.openChat.label"),
        description: translateSettings(
          "shortcuts.actions.openChat.description",
        ),
      },
      {
        action: "openGlobalTraitsEditor" as ShortcutAction,
        label: translateSettings(
          "shortcuts.actions.open-global-traits-editor.label",
        ),
        description: translateSettings(
          "shortcuts.actions.open-global-traits-editor.description",
        ),
      },
    ];
  }, [translateSettings]);

  const shortcutsTitle = translateSettings("shortcuts.title");
  const shortcutsDesc = translateSettings("shortcuts.desc");
  const shortcutsResetLabel = translateSettings("shortcuts.reset");

  const handleNameBlur = () => {
    if (!activeSource) return;
    const trimmed = localName.trim();
    if (!trimmed || trimmed === activeSource.name) return;
    updateSource(activeSource.id, { name: trimmed });
  };

  const applyApiKey = () => {
    if (!activeSource) return;
    const trimmed = localApiKey.trim();
    const current = activeSource.apiKey ?? "";
    if (trimmed === current) return;
    updateSource(activeSource.id, {
      apiKey: trimmed ? trimmed : null,
    });
    toast.success(t("api-credentials.applied"));
  };

  const clearApiKey = () => {
    if (!activeSource) return;
    setLocalApiKey("");
    updateSource(activeSource.id, { apiKey: null });
  };

  const applyBaseUrl = () => {
    if (!activeSource) return;
    const trimmed = localBaseUrl.trim();
    const next = trimmed || DEFAULT_BASE_BY_PROVIDER[activeSource.provider];
    if (
      (activeSource.baseUrl ??
        DEFAULT_BASE_BY_PROVIDER[activeSource.provider]) === next
    ) {
      return;
    }
    updateSource(activeSource.id, {
      baseUrl: next,
    });
  };

  const resetBaseUrl = () => {
    if (!activeSource) return;
    const defaults = DEFAULT_BASE_BY_PROVIDER[activeSource.provider];
    setLocalBaseUrl(defaults);
    updateSource(activeSource.id, { baseUrl: defaults });
  };

  const handleModelSelect = (model: string) => {
    if (!activeSource) return;
    updateSource(activeSource.id, { model });
    setModelPopoverOpen(false);
  };

  const handleTraitsChange = (value: string) => {
    if (!activeSource) return;
    setLocalTraits(value);
    updateSource(activeSource.id, { traits: value || undefined });
  };

  const clearTraits = () => {
    if (!activeSource) return;
    setLocalTraits("");
    updateSource(activeSource.id, { traits: undefined });
  };

  const handleThinkingBudgetChange = (value: number) => {
    if (!activeSource) return;
    setLocalThinkingBudget(value);
    updateSource(activeSource.id, { thinkingBudget: value });
  };

  const handlePollIntervalBlur = () => {
    if (!activeSource) return;
    const parsed = parseInt(localPollInterval, 10);
    updateSource(activeSource.id, {
      pollIntervalMs: Number.isFinite(parsed) ? parsed : undefined,
    });
  };

  const handleMaxPollBlur = () => {
    if (!activeSource) return;
    const parsed = parseInt(localMaxPoll, 10);
    updateSource(activeSource.id, {
      maxPollMs: Number.isFinite(parsed) ? parsed : undefined,
    });
  };

  const modelDisplay = useMemo(() => {
    if (!activeSource) return "";
    if (!activeSource.model) return t("model.sel.none");
    const match = availableModels.find(
      (model) => model.name === activeSource.model,
    );
    return match
      ? match.displayName
      : t("model.sel.unknown", { name: activeSource.model });
  }, [activeSource, availableModels, t]);

  const canRemoveSource = sources.length > 1;

  const resetAddDialog = () => {
    setNewSourceName("");
    setNewProvider("gemini");
  };

  const handleAddDialogChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      resetAddDialog();
    }
  };

  const handleAddSource = () => {
    const provider = newProvider;
    const counter =
      sources.filter((source) => source.provider === provider).length + 1;
    const defaultName =
      provider === "gemini"
        ? t("sources.providers.gemini") + ` #${counter}`
        : t("sources.providers.openai") + ` #${counter}`;

    const name = newSourceName.trim() || defaultName;

    const newId = addSource({
      name,
      provider,
      apiKey: null,
      baseUrl:
        provider === "gemini"
          ? DEFAULT_GEMINI_BASE_URL
          : DEFAULT_OPENAI_BASE_URL,
      model:
        provider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL,
      traits: undefined,
      thinkingBudget: provider === "gemini" ? 8192 : undefined,
      enabled: false,
      pollIntervalMs: provider === "openai" ? 1_000 : undefined,
      maxPollMs: provider === "openai" ? 30_000 : undefined,
    });

    setActiveSource(newId);
    setAddDialogOpen(false);
    resetAddDialog();
    toast.success(
      t("sources.add.success", {
        name,
      }),
    );
  };

  const handleRemoveSource = (id: string) => {
    if (sources.length <= 1) {
      toast.error(t("sources.remove.error"));
      return;
    }
    const target = sources.find((source) => source.id === id);
    removeSource(id);
    if (target) {
      toast.success(
        t("sources.remove.success", {
          name: target.name,
        }),
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("heading")}</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:flex-1" onClick={handleBack}>
          {t("back")} <Kbd>ESC</Kbd>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sources.title")}</CardTitle>
          <CardDescription>{t("sources.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t("sources.active.label")}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("sources.add.label")}
            </Button>
          </div>

          <div className="space-y-2">
            {sources.map((source) => {
              const isActive = source.id === activeSourceId;
              return (
                <div
                  key={source.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between",
                    isActive && "border-primary",
                  )}
                  onClick={() => setActiveSource(source.id)}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 select-none">
                    <div>
                      <p className="text-sm font-medium">
                        {source.name}
                        <span className="ml-2 text-xs uppercase text-muted-foreground">
                          {t(`sources.providers.${source.provider}`)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.baseUrl ??
                          DEFAULT_BASE_BY_PROVIDER[source.provider]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        onClick={(e) => e.stopPropagation()}
                        checked={source.enabled}
                        onCheckedChange={(state) =>
                          toggleSource(source.id, Boolean(state))
                        }
                      />
                      {t("sources.enabled.toggle")}
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveSource(source.id);
                      }}
                      disabled={!canRemoveSource}
                      aria-label={t("sources.remove.label")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("api-credentials.title")}</CardTitle>
          <CardDescription>{t("api-credentials.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-name">
              {t("api-credentials.name.label")}
            </Label>
            <Input
              id="source-name"
              value={localName}
              onChange={(event) => setLocalName(event.target.value)}
              onBlur={handleNameBlur}
              placeholder={t("api-credentials.name.placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key-input">{t("api-credentials.label")}</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="api-key-input"
                type="password"
                value={localApiKey}
                placeholder={t("api-credentials.placeholder", {
                  provider: activeSource?.name ?? "",
                })}
                onChange={(event) => setLocalApiKey(event.target.value)}
                onBlur={applyApiKey}
              />
              <Button
                variant="outline"
                onClick={clearApiKey}
                disabled={!localApiKey}
              >
                {t("clear-input")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url-input">
              {t("advanced.custom-base-url.title")}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="base-url-input"
                type="url"
                value={localBaseUrl}
                placeholder={t("advanced.custom-base-url.placeholder")}
                onChange={(event) => setLocalBaseUrl(event.target.value)}
                onBlur={applyBaseUrl}
              />
              <Button variant="outline" onClick={resetBaseUrl}>
                {t("reset")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("advanced.custom-base-url.helper", {
                provider: activeSource?.name ?? "",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.title")}</CardTitle>
          <CardDescription>{t("appearance.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-select">{t("appearance.theme.label")}</Label>
            <select
              id="theme-select"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              value={themePreference}
              onChange={(event) =>
                handleThemeSelect(event.target.value as ThemePreference)
              }
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t("appearance.theme.desc")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language-select">
              {t("appearance.language.label")}
            </Label>
            <select
              id="language-select"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              value={language}
              onChange={(event) =>
                handleLanguageSelect(event.target.value as LanguagePreference)
              }
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t("appearance.language.desc")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{shortcutsTitle}</CardTitle>
          <CardDescription>{shortcutsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shortcutItems.map((item) => (
            <div
              key={item.action}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ShortcutRecorder
                value={keybindings[item.action] ?? ""}
                onChange={(combo) => setKeybinding(item.action, combo)}
              />
            </div>
          ))}
          <Button variant="ghost" onClick={resetKeybindings} className="mt-2">
            {shortcutsResetLabel}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("model.title")}</CardTitle>
          <CardDescription>{t("model.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelPopoverOpen}
                  className="flex-2 justify-between"
                >
                  {modelDisplay}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Command>
                  <CommandInput placeholder={t("model.sel.search")} />
                  <CommandList>
                    <CommandEmpty>{t("model.sel.empty")}</CommandEmpty>
                    <CommandGroup>
                      {availableModels.map((model) => (
                        <CommandItem
                          key={model.name}
                          value={model.name}
                          onSelect={(currentValue) => {
                            handleModelSelect(
                              currentValue === activeSource?.model
                                ? ""
                                : currentValue,
                            );
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              activeSource?.model === model.name
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {model.displayName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={loadModels} className="flex-1">
              {t("model.refresh")}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-manual">{t("model.manual.title")}</Label>
            <Input
              id="model-manual"
              value={activeSource?.model ?? ""}
              onChange={(event) =>
                activeSource &&
                updateSource(activeSource.id, { model: event.target.value })
              }
              placeholder={t("model.manual.placeholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("model.manual.desc")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("thinking.title")}</CardTitle>
          <CardDescription>{t("thinking.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSource?.provider === "gemini" && (
            <div className="space-y-2">
              <Label>{t("thinking.budget")}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Slider
                    value={[localThinkingBudget]}
                    onValueChange={(value) =>
                      handleThinkingBudgetChange(value[0])
                    }
                    min={128}
                    max={24576}
                    step={1}
                  />
                </div>
                <Input
                  className="w-24"
                  value={localThinkingBudget}
                  type="number"
                  min={128}
                  max={24576}
                  onChange={(event) =>
                    handleThinkingBudgetChange(
                      Math.max(
                        128,
                        Math.min(24576, Number(event.target.value) || 128),
                      ),
                    )
                  }
                />
                <span>{t("thinking.tokens-unit")}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="traits-input">{t("traits.title")}</Label>
            <div className="relative">
              <Textarea
                id="traits-input"
                className="min-h-[100px] pr-20"
                value={localTraits}
                onChange={(event) => handleTraitsChange(event.target.value)}
                placeholder={t("traits.placeholder")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={clearTraits}
                disabled={!localTraits}
              >
                {t("clear-input")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("traits.desc")}</p>
          </div>

          {activeSource?.provider === "openai" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poll-interval">
                  {t("openai.poll-interval.title")}
                </Label>
                <Input
                  id="poll-interval"
                  type="number"
                  min={100}
                  step={100}
                  value={localPollInterval}
                  onChange={(event) => setLocalPollInterval(event.target.value)}
                  onBlur={handlePollIntervalBlur}
                />
                <p className="text-xs text-muted-foreground">
                  {t("openai.poll-interval.desc")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-timeout">
                  {t("openai.poll-timeout.title")}
                </Label>
                <Input
                  id="poll-timeout"
                  type="number"
                  min={1000}
                  step={1000}
                  value={localMaxPoll}
                  onChange={(event) => setLocalMaxPoll(event.target.value)}
                  onBlur={handleMaxPollBlur}
                />
                <p className="text-xs text-muted-foreground">
                  {t("openai.poll-timeout.desc")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("advanced.title")}</CardTitle>
          <CardDescription>{t("advanced.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="image-binarizing"
              checked={imageBinarizing}
              onCheckedChange={(state) => setImageBinarizing(state as boolean)}
            />
            <Label htmlFor="image-binarizing">
              {t("advanced.image-post-processing.binarizing")}
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="show-donate-btn"
              checked={showDonateBtn}
              onCheckedChange={(state) => setShowDonateBtn(state as boolean)}
            />
            <Label htmlFor="show-donate-btn">
              {t("advanced.ui.show-donate-btn")}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleBack}>
        {t("back")} <Kbd>ESC</Kbd>
      </Button>

      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sources.add.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-provider">{t("sources.add.provider")}</Label>
              <select
                id="new-provider"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={newProvider}
                onChange={(event) =>
                  setNewProvider(event.target.value as AiProvider)
                }
              >
                <option value="gemini">{t("sources.providers.gemini")}</option>
                <option value="openai">{t("sources.providers.openai")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">{t("sources.add.name")}</Label>
              <Input
                id="new-name"
                value={newSourceName}
                onChange={(event) => setNewSourceName(event.target.value)}
                placeholder={t("sources.add.name-placeholder")}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleAddDialogChange(false)}
            >
              {t("sources.add.cancel")}
            </Button>
            <Button onClick={handleAddSource}>
              {t("sources.add.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
