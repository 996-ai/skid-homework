import { useSettingsStore } from "@/store/settings-store";
import { useRef, useState, type KeyboardEvent } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { MemoizedMarkdown } from "./MarkdownRenderer";

export default function GlobalTraitsEditor() {
  const { traits, setTraits } = useSettingsStore((s) => s);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const cur_start = useRef(0);
  const cur_end = useRef(0);
  const cur_dir = useRef<"forward" | "backward" | "none">("none");

  const focusEdit = () => {
    setEditing(true);
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      // focus the input
      input.focus();
      // move the pointer
      input.setSelectionRange(
        cur_start.current,
        cur_end.current,
        cur_dir.current,
      );
    }, 0);
  };

  const finishEdit = () => {
    const input = inputRef.current;
    if (!input) return;

    // save the pointer position
    cur_start.current = input.selectionStart;
    cur_end.current = input.selectionEnd;
    cur_dir.current = input.selectionDirection;
    setEditing(false);
  };

  const handleKeybindings = (e: KeyboardEvent) => {
    if (e.key == "Escape") {
      finishEdit();
    }
  };

  return (
    <div className="flex flex-col w-full gap-2 h-40">
      <Label>Global Traits:</Label>
      {editing ? (
        <Textarea
          ref={inputRef}
          onKeyDown={handleKeybindings}
          className="h-full"
          value={traits}
          onBlur={finishEdit}
          onChange={(e) => setTraits(e.target.value)}
        />
      ) : (
        <div
          className="h-full border rounded p-1 overflow-auto border-card-foreground"
          onClick={focusEdit}
        >
          {traits ? (
            <MemoizedMarkdown source={traits} />
          ) : (
            <div className="border rounded w-full h-full text-center">
              Click here to edit global traits
            </div>
          )}
        </div>
      )}
    </div>
  );
}
