"use client";

/**
 * 招待成功ダイアログコンポーネント
 * メンバー招待メール送信後に成功メッセージを表示する
 */

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
  /** 招待先メールアドレス */
  email: string;
}

export function InviteSuccessDialog({
  open,
  onOpenChange,
  invitationSent,
  email,
}: InviteSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>メンバー追加完了</DialogTitle>
          <DialogDescription>
            {invitationSent
              ? `招待メールを ${email} に送信しました。メールを確認してアカウントを有効化するようお伝えください。`
              : "メンバーを組織に追加しました。"}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
