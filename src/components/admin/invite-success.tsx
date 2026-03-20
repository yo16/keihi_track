"use client";

/**
 * 招待成功ダイアログコンポーネント
 * メンバー招待メール送信後に成功メッセージを表示し、
 * 組織専用ログインURLのコピー機能を提供する
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

interface InviteSuccessDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 招待メールが送信されたかどうか */
  invitationSent: boolean;
  /** 組織専用ログインURL */
  loginUrl: string;
}

export function InviteSuccessDialog({
  open,
  onOpenChange,
  invitationSent,
  loginUrl,
}: InviteSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  /** クリップボードにログインURLをコピーする */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      // 2秒後にコピー状態をリセット
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard APIが使えない環境のフォールバック
      console.error("クリップボードへのコピーに失敗しました");
    }
  }, [loginUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>メンバー追加完了</DialogTitle>
          <DialogDescription>
            {invitationSent
              ? "招待メールを送信しました。メンバーがメールを確認してアカウントを有効化するまでお待ちください。"
              : "メンバーを組織に追加しました。"}
          </DialogDescription>
        </DialogHeader>

        {/* ログインURL表示エリア */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">組織専用ログインURL:</p>
          <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-sm font-mono">
            {loginUrl}
          </pre>
        </div>

        <DialogFooter>
          <Button onClick={handleCopy} variant={copied ? "secondary" : "default"}>
            {copied ? "コピーしました" : "URLをコピー"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
