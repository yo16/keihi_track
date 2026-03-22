"use client";

/**
 * ロール変更ダイアログ
 * 対象ユーザーの表示名・現在のロールを表示し、
 * 新しいロールを選択して変更を適用する
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Role } from "@/types/database";
import type { MemberResponse } from "@/types/member";

/** ロール表示用ラベル */
const ROLE_LABELS: Record<Role, string> = {
  admin: "管理者（admin）",
  approver: "承認者（approver）",
  user: "使用者（user）",
};

interface RoleChangeDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** ロール変更対象のメンバー */
  member: MemberResponse | null;
  /** ロール変更成功時のコールバック */
  onChanged: () => void;
}

export function RoleChangeDialog({
  open,
  onOpenChange,
  member,
  onChanged,
}: RoleChangeDialogProps) {
  const [newRole, setNewRole] = useState<Role | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** ロール変更APIを呼び出す */
  const handleSubmit = async () => {
    if (!member || !newRole) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/members/${member.user_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const message =
          errorData?.error?.message || "ロールの変更に失敗しました";
        setServerError(message);
        return;
      }

      // 成功時: ダイアログを閉じて一覧を更新
      onOpenChange(false);
      setNewRole(null);
      setServerError(null);
      onChanged();
    } catch {
      setServerError("ロールの変更中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** ダイアログが閉じるときに状態をリセットする */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewRole(null);
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ロール変更</DialogTitle>
          <DialogDescription>
            {member.display_name} のロールを変更します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 現在のロール表示 */}
          <div className="flex flex-col gap-1.5">
            <Label>現在のロール</Label>
            <p className="text-sm text-muted-foreground">
              {ROLE_LABELS[member.role]}
            </p>
          </div>

          {/* 新しいロール選択 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-role">新しいロール</Label>
            <Select
              defaultValue={member.role}
              onValueChange={(value: string | null) => {
                if (
                  value === "admin" ||
                  value === "approver" ||
                  value === "user"
                ) {
                  setNewRole(value);
                }
              }}
            >
              <SelectTrigger className="w-full" id="new-role">
                <SelectValue placeholder="ロールを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理者（admin）</SelectItem>
                <SelectItem value="approver">承認者（approver）</SelectItem>
                <SelectItem value="user">使用者（user）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* エラー表示 */}
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newRole || newRole === member.role}
          >
            {isSubmitting ? "変更中..." : "変更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
