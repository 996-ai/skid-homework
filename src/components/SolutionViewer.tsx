import "katex/dist/katex.min.css";
import { useRef, useState, type ComponentProps } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import type { OrderedSolution } from "./areas/SolutionsArea";
import { useProblemsStore } from "@/store/problems-store";
import { toast } from "sonner";
import { useGeminiStore } from "@/store/gemini-store";
import { uint8ToBase64 } from "@/utils/encoding";
import { parseImproveResponse, type ImproveResponse } from "@/ai/response";
import { IMPROVE_SYSTEM_PROMPT } from "@/ai/prompts";
import { renderImproveXml } from "@/ai/request";
import { Loader2 } from "lucide-react";
import { Kbd } from "./ui/kbd";

export type SolutionViewerProps = {
  entry: OrderedSolution;
  goPrevImage: () => void;
  goNextImage: () => void;
  goNextProblem: () => void;
  goPrevProblem: () => void;
  needFocus: () => void;

  updateSolution: (solution: ImproveResponse) => void;
} & ComponentProps<"section">;

export default function SolutionViewer({
  className,
  entry,
  goNextImage,
  goPrevImage,
  goNextProblem,
  goPrevProblem,
  updateSolution,
  needFocus,
  ...props
}: SolutionViewerProps) {
  const getGemini = useGeminiStore((s) => s.getGemini);
  // const geminiTraits = useGeminiStore((s) => s.traits);
  const geminiModel = useGeminiStore((s) => s.geminiModel);
  const { selectedProblem, setItemStreamingText, clearItemStreamingText } = useProblemsStore((s) => s);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [improveSolutionPrompt, setImproveSolutionPrompt] = useState("");

  const [isImproving, setImproving] = useState(false);

  const viewerRef = useRef<HTMLElement | null>(null);

  const problemCount = entry.solutions.problems.length;
  const safeIndex = Math.min(
    Math.max(0, selectedProblem),
    Math.max(0, problemCount - 1),
  );

  const activeProblem =
    problemCount > 0 ? entry.solutions.problems[safeIndex] : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied", { description: "Answer copied to clipboard." });
    } catch {
      toast("Copy failed", { description: "Please copy manually." });
    }
  };

  const handleImproveSolution = async () => {
    if (!activeProblem) return;
    const ai = getGemini();
    if (!ai) {
      toast("You're almost there", {
        description: "You need to set your API key in settings to use the AI.",
      });
      return;
    }

    // apply system prompt
    ai.setSystemPrompt(IMPROVE_SYSTEM_PROMPT);

    const buf = await entry.item.file.arrayBuffer();
    const bytes = new Uint8Array(buf);

    const prompt = renderImproveXml({
      user_suggestion: improveSolutionPrompt,
      answer: activeProblem.answer,
      explanation: activeProblem.explanation,
      problem: activeProblem.problem,
    });

    try {
      toast("Processing", {
        description:
          "Improving your solution with AI...Please wait for a while...",
      });
      setImproving(true);
      const resText = await ai?.sendMedia(
        uint8ToBase64(bytes),
        entry.item.mimeType,
        prompt,
        geminiModel,
        (text) => setItemStreamingText(entry.item.id, text),
      );
      // console.log(resText);

      const res = parseImproveResponse(resText);

      // console.log(res);
      if (!res) {
        toast("Failed to improve your solution", {
          description:
            "Failed to parse response, see the developer tools for more details.",
        });
        return;
      }
      updateSolution(res);
      clearItemStreamingText(entry.item.id);
    } catch (e) {
      toast("Failed to improve your solution", {
        description: `Something went wrong: ${e}`,
      });
      clearItemStreamingText(entry.item.id);
      return;
    } finally {
      setImproving(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (dialogOpen) {
      // handle Ctrl+Enter to submit the prompt
      if (e.ctrlKey && e.key === "Enter") {
        setDialogOpen(false);
        handleImproveSolution();
      }
      return;
    } else {
      // handle navigation

      // Tab/Shift+Tab for image navigation.
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) goPrevImage();
        else goNextImage();
        needFocus();
        return;
      }
      // Space/Shift+Space for problem navigation.
      if (e.code === "Space") {
        e.preventDefault();
        if (e.shiftKey) goPrevProblem();
        else goNextProblem();
        viewerRef.current?.focus();
      }
      if (e.key === "/") {
        e.preventDefault();
        setDialogOpen(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        if (!activeProblem) return;
        e.preventDefault();
        copyToClipboard(activeProblem.answer);
      }
    }
  };

  return (
    <section
      ref={viewerRef}
      tabIndex={0}
      className={cn("md:col-span-2", className)}
      onKeyDown={onKeyDown}
      {...props}
    >
      <div className="rounded-xl border border-slate-700 p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
          Problem{" "}
          <label className="font-extrabold text-amber-500">
            {selectedProblem + 1}
          </label>{" "}
          of {entry.solutions.problems.length}
        </div>

        {/* Markdown renderer for problem, answer, and explanation. */}
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { output: "html" }]]}
        >
          {activeProblem?.problem ?? ""}
        </Markdown>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-300">
              Answer
            </div>
            <div className="rounded-lg bg-slate-900/60 p-3 text-sm">
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { output: "html" }]]}
              >
                {activeProblem?.answer ?? ""}
              </Markdown>
            </div>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(activeProblem?.answer ?? "")}
              >
                Copy answer <Kbd>Ctrl+⇧+C</Kbd>
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-slate-300">
              Explanation
            </div>
            <div className="rounded-lg bg-slate-900/40 p-3 text-sm leading-relaxed">
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { output: "html" }]]}
              >
                {activeProblem?.explanation ?? ""}
              </Markdown>
            </div>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(state) => setDialogOpen(state)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isImproving}>
                {" "}
                {isImproving && <Loader2 className="animate-spin" />} Improve
                the Solution <Kbd>/</Kbd>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Improve the Solution</DialogTitle>
                <DialogDescription>
                  Generate a more detailed solution using the current solution
                  and your prompt
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-2">
                <Textarea
                  value={improveSolutionPrompt}
                  onChange={(e) => setImproveSolutionPrompt(e.target.value)}
                  className="h-40"
                  placeholder="Make it more detailed..."
                />
              </div>

              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button
                    variant="secondary"
                    disabled={!improveSolutionPrompt}
                    onClick={handleImproveSolution}
                  >
                    Submit <Kbd>Ctrl+Enter</Kbd>
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Navigation controls for problems and images. */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Source image:&nbsp;
              <a
                href={entry.item.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted"
              >
                open preview
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrevProblem}
                disabled={selectedProblem === 0}
              >
                Prev <Kbd>⇧+␣</Kbd>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNextProblem}
                disabled={
                  selectedProblem >= entry.solutions.problems.length - 1
                }
              >
                Next <Kbd>␣</Kbd>
              </Button>
              <Button variant="outline" size="sm" onClick={goPrevImage}>
                ⟵ Image <Kbd>⇧+TAB</Kbd>
              </Button>
              <Button variant="outline" size="sm" onClick={goNextImage}>
                Image ⟶ <Kbd>TAB</Kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
