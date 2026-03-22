"use client";

/**
 * レシート画像アップロードコンポーネント
 * ファイル選択（カメラ対応）+ サムネイル生成 + プレビュー表示
 * Supabase Storageへのアップロードは行わない（expense_id未確定のため）
 */
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { resizeImage } from "@/lib/utils/image-resize";

/** アップロード結果の型 */
export interface ReceiptUploadResult {
  originalFile: File;
  thumbnailBlob: Blob;
}

interface ReceiptUploadProps {
  /** ファイル選択時のコールバック */
  onChange: (result: ReceiptUploadResult | null) => void;
  /** 初期プレビューURL（再申請時に使用） */
  initialPreviewUrl?: string;
}

/** サムネイルの最大サイズ（長辺のピクセル数） */
const THUMBNAIL_MAX_SIZE = 300;

/** レシート画像アップロード + サムネイル生成コンポーネント */
export function ReceiptUpload({ onChange, initialPreviewUrl }: ReceiptUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPreviewUrl ?? null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** ファイル選択ハンドラ */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        setPreviewUrl(initialPreviewUrl ?? null);
        onChange(null);
        return;
      }

      setIsProcessing(true);
      try {
        // Canvas APIでサムネイル生成
        const thumbnailBlob = await resizeImage(file, THUMBNAIL_MAX_SIZE);

        // サムネイルのプレビューURL生成
        const url = URL.createObjectURL(thumbnailBlob);
        setPreviewUrl((prev) => {
          // 前のプレビューURLを解放（初期URLは解放しない）
          if (prev && prev !== initialPreviewUrl) {
            URL.revokeObjectURL(prev);
          }
          return url;
        });

        // 親コンポーネントにファイルとサムネイルを通知
        onChange({ originalFile: file, thumbnailBlob });
      } catch (error) {
        console.error("画像処理に失敗しました:", error);
        setPreviewUrl(null);
        onChange(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange, initialPreviewUrl]
  );

  /** ファイル選択ボタンクリックハンドラ */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-2">
      {/* 非表示のファイル入力（カメラ対応） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ファイル選択ボタン */}
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isProcessing}
      >
        {isProcessing
          ? "処理中..."
          : previewUrl
            ? "レシート画像を変更"
            : "レシート画像を選択"}
      </Button>

      {/* サムネイルプレビュー */}
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="レシートプレビュー"
            className="max-w-[200px] max-h-[200px] rounded-md border object-cover"
          />
        </div>
      )}
    </div>
  );
}
