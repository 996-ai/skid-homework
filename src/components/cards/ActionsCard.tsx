import type { FileItem } from "@/store/problems-store";
import { useCallback } from "react";
import ActionsArea from "../areas/ActionsArea";
import InfoArea from "../UploadsInfo";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import UploadArea from "../areas/UploadArea";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useShortcut } from "@/hooks/use-shortcut";
import { ShortcutHint } from "../ShortcutHint";

export type ActionsCardProps = {
  items: FileItem[];
  appendFiles: (files: File[] | FileList, source: FileItem["source"]) => void;
  totalBytes: number;
  clearAll: () => void;
  startScan: () => Promise<void>;
  allowPdfUploads: boolean;
  layout?: "default" | "mobile";
  className?: string;
};

export default function ActionsCard({
  items,
  appendFiles,
  totalBytes,
  clearAll,
  startScan,
  allowPdfUploads,
  layout = "default",
  className,
}: ActionsCardProps) {
  const { t } = useTranslation("commons", { keyPrefix: "actions" });
  const navigate = useNavigate();

  const handleSettingsBtnClick = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  const handleChatBtnClick = useCallback(() => {
    navigate("/chat");
  }, [navigate]);

  const settingsShortcut = useShortcut(
    "openSettings",
    () => handleSettingsBtnClick(),
    [handleSettingsBtnClick],
  );

  const chatShortcut = useShortcut("openChat", () => handleChatBtnClick(), [
    handleChatBtnClick,
  ]);

  return (
    <Card
      className={cn(
        "md:col-span-1 border-white/10 backdrop-blur",
        layout === "mobile" &&
          "border border-white/20 bg-background/70 shadow-lg backdrop-blur-lg",
        className,
      )}
    >
      <CardHeader
        className={cn(layout === "mobile" ? "px-5 pb-2 pt-5" : undefined)}
      >
        <CardTitle
          className={cn(
            "text-base",
            layout === "mobile" && "text-lg font-semibold",
          )}
        >
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn("space-y-4", layout === "mobile" && "px-5 pb-5 pt-1")}
      >
        <UploadArea appendFiles={appendFiles} allowPdf={allowPdfUploads} />

        <Separator className="my-2" />

        <InfoArea itemsLength={items.length} totalBytes={totalBytes} />

        <ActionsArea
          itemsLength={items.length}
          clearAll={clearAll}
          startScan={startScan}
          layout={layout}
        />

        <div
          className={cn(
            "flex gap-2 flex-wrap",
            layout === "mobile" && "flex-col",
          )}
        >
          <Button
            className={cn("flex-1", layout === "mobile" && "py-6 text-base")}
            size={layout === "mobile" ? "lg" : "default"}
            variant="secondary"
            onClick={handleSettingsBtnClick}
          >
            {t("settings")}{" "}
            {layout !== "mobile" && (
              <ShortcutHint shortcut={settingsShortcut} />
            )}
          </Button>
          <Button
            className={cn("flex-1", layout === "mobile" && "py-6 text-base")}
            size={layout === "mobile" ? "lg" : "default"}
            variant="secondary"
            onClick={handleChatBtnClick}
          >
            {t("chat")}
            {layout !== "mobile" && <ShortcutHint shortcut={chatShortcut} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
