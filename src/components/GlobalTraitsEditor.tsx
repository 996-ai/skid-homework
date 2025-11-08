import { useSettingsStore } from "@/store/settings-store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { TextInputDialog } from "./dialogs/TextInputDialog";

export default function GlobalTraitsEditor() {
  const { t } = useTranslation("commons");
  const { traits, setTraits } = useSettingsStore((s) => s);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <TextInputDialog
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
      initialValue={traits}
      trigger={
        <Button variant="outline" className="w-full">
          {t("actions.global-traits.title")} <Kbd>Unknown</Kbd>
        </Button>
      }
      title="Edit Global Traits"
      description="The prompt will be append into the query when you skid your homework to personalize the response."
      placeholder="You're a smart assistant that helps the user with the homework."
      submitText="Update"
      isSubmitting={false}
      onSubmit={(v) => setTraits(v)}
    />
  );
}
