import { useSettingsStore } from "@/store/settings-store";
import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { TextInputDialog } from "./dialogs/TextInputDialog";
import { cn } from "@/lib/utils";
import { useShortcut } from "@/hooks/use-shortcut";
import { ShortcutHint } from "./ShortcutHint";

export type GlobalTraitsEditorProps = {} & ComponentProps<"button">;

export default function GlobalTraitsEditor({
  className,
  ...props
}: GlobalTraitsEditorProps) {
  const { t } = useTranslation("commons", {
    keyPrefix: "actions.global-traits",
  });
  const { traits, setTraits } = useSettingsStore((s) => s);
  const [dialogOpen, setDialogOpen] = useState(false);

  const triggerShortcut = useShortcut(
    "openGlobalTraitsEditor",
    (event) => {
      event.preventDefault();
      setDialogOpen(true);
    },
    [setDialogOpen],
  );

  return (
    <TextInputDialog
      allowEmpty={true}
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
      initialValue={traits}
      trigger={
        <Button
          variant="secondary"
          className={cn("w-full", className)}
          {...props}
        >
          {t("trigger")} <ShortcutHint shortcut={triggerShortcut} />
        </Button>
      }
      title={t("title")}
      description={t("desc")}
      placeholder={t("placeholder")}
      submitText={t("submit-btn")}
      isSubmitting={false}
      onSubmit={(v) => setTraits(v)}
    />
  );
}
