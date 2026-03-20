"use client";

/**
 * 組織専用ログインフォーム
 * メールアドレス + パスワードのみ入力（組織IDはURLパラメータから取得）
 * React Hook Form + Zodバリデーション
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { orgLoginSchema, type OrgLoginInput } from "@/lib/validators/login";
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

interface OrgLoginFormProps {
  orgId: string;
  orgName: string;
}

export function OrgLoginForm({ orgId, orgName }: OrgLoginFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgLoginInput>({
    resolver: zodResolver(orgLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ログイン処理
  const onSubmit = async (data: OrgLoginInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Supabase Authでサインイン
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setServerError("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      // 組織メンバー情報を取得してパスワード変更要否を確認
      const meResponse = await fetch(`/api/organizations/${orgId}/me`);

      if (!meResponse.ok) {
        setServerError("組織情報の取得に失敗しました");
        return;
      }

      const meData = await meResponse.json();

      // パスワード変更が必要な場合はパスワード変更画面へリダイレクト
      if (meData.data?.require_password_change) {
        router.push(`/${orgId}/change-password`);
      } else {
        router.push(`/${orgId}/dashboard`);
      }
    } catch {
      setServerError("ログイン処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{orgName}</CardTitle>
        <CardDescription>組織にログイン</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* メールアドレス入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* パスワード入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* サーバーエラー表示 */}
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          {/* ログインボタン */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
