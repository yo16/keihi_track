"use client";

/**
 * メンバー作成フォーム
 * Dialog内に配置し、メールアドレス・初期パスワード・表示名・ロール選択を入力する
 * React Hook Form + createMemberSchema でバリデーション
 * 作成成功後は InviteTextDialog を表示する
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMemberSchema,
  type CreateMemberInput,
} from "@/lib/validators/member";
import { useAuthContext } from "@/lib/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { InviteTextDialog } from "@/components/admin/invite-text";
import type { CreateMemberResponse } from "@/types/member";

interface MemberFormDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** メンバー作成成功時のコールバック */
  onCreated: () => void;
}

export function MemberFormDialog({
  open,
  onOpenChange,
  onCreated,
}: MemberFormDialogProps) {
  const { orgId } = useAuthContext();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 招待テキストダイアログの状態
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitationText, setInvitationText] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      role: "user",
    },
  });

  /** メンバー作成APIを呼び出す */
  const onSubmit = async (data: CreateMemberInput) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message =
          errorData?.error?.message || "メンバーの作成に失敗しました";
        setServerError(message);
        return;
      }

      const result = (await response.json()) as { data: CreateMemberResponse };

      // フォームをリセットしてダイアログを閉じる
      reset();
      onOpenChange(false);

      // 招待テキストダイアログを表示
      setInvitationText(result.data.invitation_text);
      setInviteDialogOpen(true);

      // 一覧を更新
      onCreated();
    } catch {
      setServerError("メンバーの作成中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** ダイアログが閉じるときにフォームをリセットする */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      {/* メンバー作成ダイアログ */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>メンバー追加</DialogTitle>
            <DialogDescription>
              新しいメンバーの情報を入力してください。
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* メールアドレス入力 */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-email">メールアドレス</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="example@email.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* 初期パスワード入力 */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-password">初期パスワード</Label>
              <Input
                id="member-password"
                type="text"
                placeholder="8文字以上"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 表示名入力 */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-display-name">表示名</Label>
              <Input
                id="member-display-name"
                type="text"
                placeholder="表示名を入力"
                {...register("display_name")}
                aria-invalid={!!errors.display_name}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">
                  {errors.display_name.message}
                </p>
              )}
            </div>

            {/* ロール選択 */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-role">ロール</Label>
              <Select
                defaultValue="user"
                onValueChange={(value: string | null) => {
                  if (value === "user" || value === "approver") {
                    setValue("role", value);
                  }
                }}
              >
                <SelectTrigger className="w-full" id="member-role">
                  <SelectValue placeholder="ロールを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">使用者（user）</SelectItem>
                  <SelectItem value="approver">承認者（approver）</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* サーバーエラー表示 */}
            {serverError && (
              <p className="text-xs text-destructive">{serverError}</p>
            )}

            {/* 送信ボタン */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "作成中..." : "メンバーを追加"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 招待テキスト表示ダイアログ */}
      <InviteTextDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        invitationText={invitationText}
      />
    </>
  );
}
