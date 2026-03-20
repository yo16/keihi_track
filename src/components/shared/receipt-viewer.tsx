"use client";

/**
 * レシート画像ビューアコンポーネント
 * サムネイル表示 + クリックでオリジナル画像をモーダル表示
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReceiptViewerProps {
  /** サムネイル画像のURL */
  thumbnailUrl: string;
  /** オリジナル画像のURL */
  originalUrl: string;
}

/** レシート画像ビューア（サムネイル + モーダル拡大表示） */
export function ReceiptViewer({ thumbnailUrl, originalUrl }: ReceiptViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* サムネイル画像（クリックでモーダル表示） */}
      <DialogTrigger>
        <img
          src={thumbnailUrl}
          alt="レシート"
          className="max-w-[200px] max-h-[200px] rounded-md border object-cover cursor-pointer hover:opacity-80 transition-opacity"
        />
      </DialogTrigger>

      {/* オリジナル画像のモーダル表示 */}
      <DialogContent className="max-w-[90vw] max-h-[90vh] sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>レシート画像</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center overflow-auto">
          <img
            src={originalUrl}
            alt="レシート（オリジナル）"
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
