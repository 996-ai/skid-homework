import { TabsTrigger } from "@radix-ui/react-tabs";
import { Card, CardContent, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList } from "../ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useEffect, useMemo, useRef } from "react";
import {
  useProblemsStore,
  type FileItem,
  type Solution,
} from "@/store/problems-store";
import ProblemList from "../ProblemList";
import SolutionViewer from "../SolutionViewer";
import type { ImproveResponse } from "@/ai/response";
import { PhotoProvider, PhotoView } from "react-photo-view";

export interface OrderedSolution {
  item: FileItem;
  solutions: Solution;
}

export default function SolutionsArea() {
  const {
    imageItems: items,
    imageSolutions,
    selectedImage,
    selectedProblem,
    setSelectedImage,
    setSelectedProblem,
    updateProblem,
    isWorking,
  } = useProblemsStore((s) => s);
  const viewerRef = useRef<HTMLElement | null>(null);
  // Build a solutions list that matches the visual order of the uploaded items.
  const orderedSolutions: OrderedSolution[] = useMemo(() => {
    const byUrl = new Map(imageSolutions.map((s) => [s.imageUrl, s]));
    return items
      .filter((it) => byUrl.has(it.url)) // Only include items that have a solution entry.
      .map((it) => ({
        item: it,
        solutions: byUrl.get(it.url)!,
      }));
  }, [items, imageSolutions]); // Dependencies remain correct

  // Derive the index of the currently selected image.
  const currentImageIdx = useMemo(() => {
    if (!orderedSolutions.length) return -1;
    if (!selectedImage) return 0;
    const idx = orderedSolutions.findIndex((e) => e.item.url === selectedImage);
    return idx === -1 ? 0 : idx; // Default to the first image if not found.
  }, [orderedSolutions, selectedImage]);

  // Effect to keep the selectedImage state consistent if the data changes.
  useEffect(() => {
    if (!orderedSolutions.length) {
      if (selectedImage !== null) setSelectedImage(undefined);
      return;
    }
    const safeIdx = currentImageIdx === -1 ? 0 : currentImageIdx;
    const url = orderedSolutions[safeIdx].item.url;
    if (selectedImage !== url) setSelectedImage(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedSolutions.length, currentImageIdx]); // Depend on length and index

  // Navigation helpers for problems and images.
  const goNextProblem = () =>
    setSelectedProblem(
      Math.min(selectedProblem + 1, Math.max(0, problems.length - 1)),
    );
  const goPrevProblem = () =>
    setSelectedProblem(Math.max(selectedProblem - 1, 0));

  const goNextImage = () => {
    if (!orderedSolutions.length) return;
    const next = (currentImageIdx + 1) % orderedSolutions.length;
    setSelectedImage(orderedSolutions[next].item.url);
    setSelectedProblem(0); // Reset problem index when changing images.
  };
  const goPrevImage = () => {
    if (!orderedSolutions.length) return;
    const prev =
      (currentImageIdx - 1 + orderedSolutions.length) % orderedSolutions.length;
    setSelectedImage(orderedSolutions[prev].item.url);
    setSelectedProblem(0); // Reset problem index.
  };

  // Get the current solution bundle (image + its problems).
  const currentBundle =
    currentImageIdx >= 0 ? orderedSolutions[currentImageIdx] : null;
  const problems = currentBundle?.solutions.problems ?? [];

  // Effect to clamp the selectedProblem index to a valid range when data changes.
  useEffect(() => {
    if (!problems.length) {
      if (selectedProblem !== 0) setSelectedProblem(0);
      return;
    }
    const clamped = Math.min(selectedProblem, problems.length - 1);
    if (clamped !== selectedProblem) setSelectedProblem(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageIdx, problems.length]); // Re-run when image or problems change.

  const updateSolution = (
    entry: OrderedSolution,
    solutionIdx: number,
    res: ImproveResponse,
  ) => {
    updateProblem(
      entry.item.url,
      solutionIdx,
      res.improved_answer,
      res.improved_explanation,
    );
  };

  return (
    <>
      <Card className="rounded-2xl p-4 shadow">
        <CardTitle>Solutions</CardTitle>
        <CardContent>
          {/* Focusable region to capture keyboard shortcuts for navigation. */}
          <div
            tabIndex={0}
            className="outline-none"
            aria-label="Solutions keyboard focus region (Tab/Shift+Tab for problems, Space/Shift+Space for images)"
          >
            {/* Conditional rendering based on whether solutions are available. */}
            {!orderedSolutions.length ? (
              <div className="text-sm text-gray-400">
                {isWorking
                  ? "Analyzing... extracting problems and solutions from your images."
                  : 'No solutions yet. Add images and click "Let\'s Skid" to see results here.'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Tabs for switching between different photos' solutions. */}
                <Tabs
                  value={selectedImage ?? undefined}
                  onValueChange={(v) => {
                    setSelectedImage(v);
                    setSelectedProblem(0); // Reset problem index on tab change.
                  }}
                  className="w-full"
                >
                  <TabsList className="flex flex-wrap gap-2">
                    {orderedSolutions.map((entry, idx) => (
                      <TabsTrigger key={entry.item.id} value={entry.item.url}>
                        {entry.item.file.name || `File ${idx + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Content for each image tab. */}
                  {orderedSolutions.map((entry, idx) => {
                    return (
                      <TabsContent
                        key={entry.item.id}
                        value={entry.item.url}
                        className="mt-4"
                      >
                        {/* Collapsible preview of the current photo. */}
                        {entry.item.mimeType.startsWith("image/") && (
                          <Collapsible defaultOpen>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-slate-400">
                                Photo {idx + 1} • {entry.item.source}
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2"
                                >
                                  Toggle Preview
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="mt-2">
                              <div className="overflow-hidden rounded-xl border border-slate-700">
                                <PhotoProvider>
                                  <PhotoView src={entry.item.url}>
                                    <img
                                      src={entry.item.url}
                                      alt={`Preview ${entry.item.file.name || idx + 1}`}
                                      className="block max-h-96 w-full object-contain bg-black/20 cursor-pointer"
                                    />
                                  </PhotoView>
                                </PhotoProvider>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        <Separator className="my-4" />

                        {/* Display problems or a message if none were found. */}
                        {entry.solutions.problems.length === 0 ? (
                          <div className="text-sm text-slate-400">
                            {entry.solutions.success
                              ? "No problems detected for this image."
                              : "Failed to process this image. Please try again."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {/* Left: List of problems for the current image. */}
                            <ProblemList entry={entry} />

                            {/* Right: Detailed view of the selected problem. */}
                            <SolutionViewer
                              ref={viewerRef}
                              needFocus={() =>
                                setTimeout(() => viewerRef.current?.focus(), 0)
                              }
                              entry={entry}
                              goNextImage={goNextImage}
                              goPrevImage={goPrevImage}
                              goNextProblem={goNextProblem}
                              goPrevProblem={goPrevProblem}
                              updateSolution={(res) =>
                                updateSolution(entry, selectedProblem, res)
                              }
                            />
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
