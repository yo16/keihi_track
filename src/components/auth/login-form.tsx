"use client";

/**
 * ログインフォーム
 * メールアドレス + パスワードの2項目入力（orgIdフィールドなし）
 * ログイン成功後、GET /api/me でorgId+ロール取得後 /dashboard へリダイレクト
 * React Hook Form + Zodバリデーション、shadcn/ui Card内に配置
 * 「ログイン情報を記憶する」チェックでメールアドレスをCookieに保存
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// --- Cookie操作ヘルパー ---

/** Cookieに値を保存する（有効期限はdays日後） */
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** Cookie値を取得する（存在しなければnull） */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Cookieを削除する */
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/** メールアドレス記憶Cookie名 */
const COOKIE_REMEMBER_EMAIL = "keihi_remember_email";
/** チェック状態記憶Cookie名 */
const COOKIE_REMEMBER_CHECKED = "keihi_remember_checked";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // クエリパラメータからメッセージを取得（パスワード設定完了時など）
  const message = searchParams.get("message");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ページ読み込み時にCookieからメールアドレスとチェック状態を復元
  useEffect(() => {
    const savedEmail = getCookie(COOKIE_REMEMBER_EMAIL);
    const savedChecked = getCookie(COOKIE_REMEMBER_CHECKED);

    if (savedChecked === "true") {
      setRememberMe(true);
    }
    if (savedEmail) {
      setValue("email", savedEmail);
    }
  }, [setValue]);

  // ログイン処理
  const onSubmit = async (data: LoginInput) => {
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

      // ログイン情報の記憶: チェックONならCookie保存、OFFなら削除
      if (rememberMe) {
        setCookie(COOKIE_REMEMBER_EMAIL, data.email, 30);
        setCookie(COOKIE_REMEMBER_CHECKED, "true", 30);
      } else {
        deleteCookie(COOKIE_REMEMBER_EMAIL);
        deleteCookie(COOKIE_REMEMBER_CHECKED);
      }

      // ログイン成功後、/api/me でorgId+ロール確認してダッシュボードへ遷移
      const meResponse = await fetch("/api/me");
      if (!meResponse.ok) {
        setServerError("ユーザー情報の取得に失敗しました。組織に所属していない可能性があります。");
        return;
      }

      // ダッシュボードへ遷移
      router.push("/dashboard");
    } catch {
      setServerError("ログイン処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ケイトラ</CardTitle>
        <CardDescription>経費管理システムにログイン</CardDescription>
      </CardHeader>
      <CardContent>
        {/* メッセージ表示（パスワード設定完了時など） */}
        {message && (
          <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded mb-4">
            {message}
          </p>
        )}

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

          {/* ログイン情報を記憶するチェックボックス */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
              ログイン情報を記憶する
            </Label>
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
