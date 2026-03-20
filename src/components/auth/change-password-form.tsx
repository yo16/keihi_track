"use client";

/**
 * パスワード変更フォーム
 * 新パスワード + 確認入力。password と password_confirm の一致チェック。
 * React Hook Form + Zodバリデーション
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

interface ChangePasswordFormProps {
  orgId: string;
}

export function ChangePasswordForm({ orgId }: ChangePasswordFormProps) {
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

  // パスワード変更処理
  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Supabase Authでパスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setServerError("パスワードの更新に失敗しました");
        return;
      }

      // パスワード変更完了フラグを更新
      const patchResponse = await fetch(
        `/api/organizations/${orgId}/me/password-changed`,
        { method: "PATCH" }
      );

      if (!patchResponse.ok) {
        setServerError("パスワード変更の記録に失敗しました");
        return;
      }

      // ダッシュボードへリダイレクト
      router.push(`/${orgId}/dashboard`);
    } catch {
      setServerError("パスワード変更処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>パスワード変更</CardTitle>
        <CardDescription>新しいパスワードを設定してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 新しいパスワード入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="8文字以上で入力"
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
            <Label htmlFor="password_confirm">パスワード確認</Label>
            <Input
              id="password_confirm"
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

          {/* 変更ボタン */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "変更中..." : "パスワードを変更"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
