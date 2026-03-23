"use client";

/**
 * アカウント設定ページ
 * 表示名の変更とパスワードの変更を提供する
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import {
  updateDisplayNameSchema,
  type UpdateDisplayNameInput,
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validators/auth";
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

export default function AccountPage() {
  const router = useRouter();
  const { displayName } = useAuthContext();

  // --- 表示名変更 ---
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  const nameForm = useForm<UpdateDisplayNameInput>({
    resolver: zodResolver(updateDisplayNameSchema),
    defaultValues: {
      display_name: displayName,
    },
  });

  const onNameSubmit = async (data: UpdateDisplayNameInput) => {
    setNameError(null);
    setNameSuccess(null);
    setNameLoading(true);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setNameError(errorData.error?.message || "表示名の変更に失敗しました");
        return;
      }

      setNameSuccess("表示名を変更しました。反映にはページの再読み込みが必要です。");
    } catch {
      setNameError("表示名の変更中にエラーが発生しました");
    } finally {
      setNameLoading(false);
    }
  };

  // --- パスワード変更 ---
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const pwForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      password_confirm: "",
    },
  });

  const onPwSubmit = async (data: ChangePasswordInput) => {
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(true);

    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setPwError(errorData.error?.message || "パスワードの変更に失敗しました");
        return;
      }

      setPwSuccess("パスワードを変更しました");
      pwForm.reset();
    } catch {
      setPwError("パスワードの変更中にエラーが発生しました");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">アカウント設定</h1>

      {/* 表示名変更 */}
      <Card>
        <CardHeader>
          <CardTitle>表示名</CardTitle>
          <CardDescription>組織内で表示される名前を変更します</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={nameForm.handleSubmit(onNameSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display_name">表示名</Label>
              <Input
                id="display_name"
                type="text"
                placeholder="表示名を入力"
                {...nameForm.register("display_name")}
                aria-invalid={!!nameForm.formState.errors.display_name}
              />
              {nameForm.formState.errors.display_name && (
                <p className="text-xs text-destructive">
                  {nameForm.formState.errors.display_name.message}
                </p>
              )}
            </div>

            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
            {nameSuccess && (
              <p className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
                {nameSuccess}
              </p>
            )}

            <Button type="submit" disabled={nameLoading} className="w-fit">
              {nameLoading ? "変更中..." : "表示名を変更"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* パスワード変更 */}
      <Card>
        <CardHeader>
          <CardTitle>パスワード</CardTitle>
          <CardDescription>ログインパスワードを変更します</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={pwForm.handleSubmit(onPwSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8文字以上"
                {...pwForm.register("password")}
                aria-invalid={!!pwForm.formState.errors.password}
              />
              {pwForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">パスワード確認</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="もう一度入力"
                {...pwForm.register("password_confirm")}
                aria-invalid={!!pwForm.formState.errors.password_confirm}
              />
              {pwForm.formState.errors.password_confirm && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.password_confirm.message}
                </p>
              )}
            </div>

            {pwError && (
              <p className="text-xs text-destructive">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
                {pwSuccess}
              </p>
            )}

            <Button type="submit" disabled={pwLoading} className="w-fit">
              {pwLoading ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
