import { useSettingsStore } from "@/store/settings-store";
import { useRef } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useTranslation } from "react-i18next";

export default function GlobalTraitsEditor() {
  const { t } = useTranslation("commons");
  const { traits, setTraits } = useSettingsStore((s) => s);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="flex flex-col w-full gap-2 h-40">
      <Label>{t("actions.global-traits.title")}</Label>
      <Textarea
        ref={inputRef}
        className="h-full"
        value={traits}
        onChange={(e) => setTraits(e.target.value)}
      />
    </div>
  );
}
