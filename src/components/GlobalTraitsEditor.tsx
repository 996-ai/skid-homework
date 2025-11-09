import { useSettingsStore } from "@/store/settings-store";
import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { TextInputDialog } from "./dialogs/TextInputDialog";
import { cn } from "@/lib/utils";

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

  return (
    <TextInputDialog
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
      initialValue={traits}
      trigger={
        <Button
          variant="secondary"
          className={cn("w-full", className)}
          {...props}
        >
          {t("trigger")} <Kbd>Unknown</Kbd>
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
