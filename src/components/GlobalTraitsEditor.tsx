import { useSettingsStore } from "@/store/settings-store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { TextInputDialog } from "./dialogs/TextInputDialog";

export default function GlobalTraitsEditor() {
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
        <Button variant="outline" className="w-full">
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
