"use client";

/**
 * 招待テキスト表示コンポーネント
 * メンバー作成後のAPIレスポンスに含まれる招待テキストを表示し、
 * クリップボードへのコピー機能を提供する
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InviteTextDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 表示する招待テキスト */
  invitationText: string;
}

export function InviteTextDialog({
  open,
  onOpenChange,
  invitationText,
}: InviteTextDialogProps) {
  const [copied, setCopied] = useState(false);

  /** クリップボードにテキストをコピーする */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(invitationText);
      setCopied(true);
      // 2秒後にコピー状態をリセット
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard APIが使えない環境のフォールバック
      console.error("クリップボードへのコピーに失敗しました");
    }
  }, [invitationText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>招待テキスト</DialogTitle>
          <DialogDescription>
            以下のテキストをコピーして、招待するメンバーに共有してください。
          </DialogDescription>
        </DialogHeader>

        {/* 招待テキスト表示エリア */}
        <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-sm font-mono">
          {invitationText}
        </pre>

        <DialogFooter>
          <Button onClick={handleCopy} variant={copied ? "secondary" : "default"}>
            {copied ? "コピーしました" : "コピー"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
