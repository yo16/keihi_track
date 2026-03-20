"use client";

/**
 * 招待パスワード設定フォーム
 * 招待リンクからリダイレクトされたユーザーが初回パスワードを設定する
 * React Hook Form + Zod バリデーション（changePasswordSchema を流用）
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface SetPasswordFormProps {
  orgId: string;
}

export function SetPasswordForm({ orgId }: SetPasswordFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      password_confirm: "",
    },
  });

  // パスワード設定処理
  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // セッションが存在するか確認（招待リンクで自動設定されている想定）
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setServerError(
          "セッションが無効です。招待リンクを再度クリックしてください。"
        );
        return;
      }

      // Supabase Auth でパスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setServerError(
          `パスワードの設定に失敗しました: ${updateError.message}`
        );
        return;
      }

      // 成功後、ログインページへリダイレクト（メッセージ付き）
      router.push(
        `/${orgId}/login?message=${encodeURIComponent("パスワードが設定されました。ログインしてください。")}`
      );
    } catch {
      setServerError("パスワード設定処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>パスワード設定</CardTitle>
        <CardDescription>
          新しいパスワードを設定してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* 新しいパスワード入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="set-password">新しいパスワード</Label>
            <Input
              id="set-password"
              type="password"
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

          {/* パスワード確認入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="set-password-confirm">パスワード確認</Label>
            <Input
              id="set-password-confirm"
              type="password"
              placeholder="もう一度入力"
              {...register("password_confirm")}
              aria-invalid={!!errors.password_confirm}
            />
            {errors.password_confirm && (
              <p className="text-xs text-destructive">
                {errors.password_confirm.message}
              </p>
            )}
          </div>

          {/* サーバーエラー表示 */}
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          {/* 送信ボタン */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "設定中..." : "パスワードを設定"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
