import { useGeminiStore } from "@/store/gemini-store";
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
import { useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { Slider } from "../ui/slider";
import { useEffect, useState } from "react";
import { GeminiAi, type GeminiModel } from "@/ai/gemini";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";
import { Kbd } from "../ui/kbd";

export default function SettingsPage() {
  // API Key state and actions
  const geminiKey = useGeminiStore((s) => s.geminiKey);
  const setGeminiKey = useGeminiStore((s) => s.setGeminiKey);
  const clearGeminiKey = useGeminiStore((s) => s.clearGeminiKey);
  const hasKey = useGeminiStore((s) => s.hasKey);

  // Custom Base URL state and actions
  const geminiBaseUrl = useGeminiStore((s) => s.geminiBaseUrl);
  const setGeminiBaseUrl = useGeminiStore((s) => s.setGeminiBaseUrl);
  const clearGeminiBaseUrl = useGeminiStore((s) => s.clearGeminiBaseUrl);

  // Model selection state and actions
  const geminiModel = useGeminiStore((s) => s.geminiModel);
  const setGeminiModel = useGeminiStore((s) => s.setGeminiModel);

  // AI traits (system prompt) state and actions
  const traits = useGeminiStore((s) => s.traits);
  const setTraits = useGeminiStore((s) => s.setTraits);
  const clearTraits = useGeminiStore((s) => s.clearTraits);

  // AI Thinking budget
  const thinkingBudget = useGeminiStore((s) => s.thinkingBudget);
  const setThinkBudget = useGeminiStore((s) => s.setThinkingBudget);

  // input box states
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiKey);
  const [localGeminiBaseUrl, setLocalGeminiBaseUrl] = useState(geminiBaseUrl);
  const [localGeminiModel, setLocalGeminiModel] = useState(geminiModel);

  useEffect(() => {
    setLocalGeminiKey(geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    setLocalGeminiBaseUrl(geminiBaseUrl);
  }, [geminiBaseUrl]);

  useEffect(() => {
    setLocalGeminiModel(geminiModel);
  }, [geminiModel]);

  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);

  useEffect(() => {
    if (!geminiKey) return;
    const gemini = new GeminiAi(geminiKey, geminiBaseUrl);
    gemini.getAvailableModels().then((models) => {
      setAvailableModels(models.map((it) => it));
    });
  }, [geminiKey, geminiBaseUrl]);

  const applyGeminiBaseUrl = () => {
    setGeminiBaseUrl(localGeminiBaseUrl ?? "");
  };

  const applyGeminiKey = () => {
    setGeminiKey(localGeminiKey ?? "");
  };

  const applyGeminiModel = () => {
    setGeminiModel(localGeminiModel ?? "");
  };

  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  useHotkeys("esc", handleBack);

  // --- Render Logic ---
  return (
    // Main container for the settings page with padding and max-width for better layout.
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">
        SkidHomework Settings
      </h1>

      <Button className="w-full" onClick={handleBack}>
        Back <Kbd>ESC</Kbd>
      </Button>
      {/* Card for API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>
            Enter your Google AI Studio API key to connect to Gemini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <div className="flex items-center space-x-2">
              {/* Input for the API key. type="password" obscures the value. */}
              <Input
                id="gemini-key"
                type="password"
                placeholder="Enter your API key here"
                // Use `geminiKey || ''` to ensure the input is always a controlled component.
                value={localGeminiKey || ""}
                onBlur={applyGeminiKey}
                onChange={(e) => setLocalGeminiKey(e.target.value)}
              />
              {/* Button to clear the API key, disabled if no key is present. */}
              <Button
                variant="outline"
                onClick={clearGeminiKey}
                disabled={!hasKey()}
              >
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasKey()
                ? "Your API key is set and stored securely."
                : "Your API key is not set."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card for Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>
            Choose the model and define the AI's behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="gemini-model">Model</Label>
            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelPopoverOpen}
                  className="w-full justify-between"
                >
                  {geminiModel
                    ? (availableModels.find(
                        (model) => model.name === geminiModel,
                      )?.displayName ??
                      (availableModels.length === 0
                        ? geminiModel
                        : `Unknown Model (${geminiModel})`))
                    : "Select model..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search model..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No model available</CommandEmpty>
                    <CommandGroup>
                      {availableModels.map((model) => (
                        <CommandItem
                          key={model.name}
                          value={model.name}
                          onSelect={(currentValue) => {
                            setGeminiModel(
                              currentValue === geminiModel ? "" : currentValue,
                            );
                            setModelPopoverOpen(false);
                          }}
                        >
                          {model.displayName}
                          <Check
                            className={cn(
                              "ml-auto",
                              geminiModel === model.name
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Custom Model Name Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-model">Or Enter Custom Model Name</Label>
            <Input
              id="custom-model"
              type="text"
              placeholder="e.g., models/gemini-2.5-pro"
              value={localGeminiModel || ""}
              onChange={(e) => setLocalGeminiModel(e.target.value)}
              onBlur={applyGeminiModel}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyGeminiModel();
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              If your model is not listed above, type the full model name here.
            </p>
          </div>

          {/* Thinking budget */}
          <div className="space-y-2">
            <Label>Thinking Budget</Label>
            <span className="text-sm text-muted-foreground">
              Default: 8192 Tokens
            </span>
            <div className="w-full flex items-center gap-2">
              {/* Slider container takes up all available space */}
              <div className="flex-1">
                <Slider
                  value={[thinkingBudget]}
                  onValueChange={(nums) => setThinkBudget(nums[0])}
                  min={128}
                  max={24576}
                  step={1}
                />
              </div>

              {/* Input and Label container, fixed width based on content */}
              <span className="w-fit text-nowrap flex flex-row items-center gap-1">
                <Input
                  className="w-24"
                  value={thinkingBudget}
                  min={128}
                  max={24576}
                  onChange={(e) => setThinkBudget(parseInt(e.target.value))}
                  type="number"
                />{" "}
                Tokens
              </span>
            </div>
          </div>

          {/* AI Traits / System Prompt Textarea */}
          <div className="space-y-2">
            <Label htmlFor="gemini-traits">System Prompt (Traits)</Label>
            <div className="relative">
              <Textarea
                id="gemini-traits"
                placeholder="e.g., You are a helpful assistant that speaks in a friendly and professional tone."
                // Use `traits || ''` to handle the optional string value.
                value={traits || ""}
                onChange={(e) => setTraits(e.target.value)}
                className="min-h-[100px] pr-20" // Add padding to the right for the clear button
              />
              {/* Position the clear button inside the textarea for a cleaner look. */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={clearTraits}
                disabled={!traits}
              >
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Define the AI's personality, role, or instructions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card for Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Optionally provide a custom base URL for API requests (e.g., for a
            proxy).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="base-url">Custom Base URL</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="base-url"
                type="text"
                placeholder="https://generativelanguage.googleapis.com"
                value={localGeminiBaseUrl || ""}
                onBlur={applyGeminiBaseUrl}
                onChange={(e) => setLocalGeminiBaseUrl(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={clearGeminiBaseUrl}
                disabled={!geminiBaseUrl}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Button className="w-full" onClick={handleBack}>
        Back <Kbd>ESC</Kbd>
      </Button>
    </div>
  );
}
