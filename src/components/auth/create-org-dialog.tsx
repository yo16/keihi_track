"use client";

/**
 * 新規組織作成ダイアログ
 * サーバーサイドでユーザー作成+組織作成を行い、
 * その後クライアントでログインしてダッシュボードへ遷移する
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import {
  createOrganizationWithSignupSchema,
  type CreateOrganizationWithSignupInput,
} from "@/lib/validators/organization";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrganizationWithSignupInput>({
    resolver: zodResolver(createOrganizationWithSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      display_name: "",
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      reset();
      setServerError(null);
    }
  };

  const onSubmit = async (data: CreateOrganizationWithSignupInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      // 1. サーバーサイドでユーザー作成+組織作成（Admin API使用）
      const response = await fetch("/api/organizations/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setServerError(
          errorData.error?.message || "組織の作成に失敗しました"
        );
        return;
      }

      // 2. クライアントでログイン（セッションCookieを取得）
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setServerError("組織は作成されましたが、ログインに失敗しました。トップページからログインしてください。");
        return;
      }

      // 3. ダッシュボードへ遷移
      router.push("/dashboard");
    } catch {
      setServerError("組織作成処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="link" className="text-sm">
            新規組織を作成
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規組織を作成</DialogTitle>
          <DialogDescription>
            アカウントと組織を同時に作成します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-email">メールアドレス</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="example@example.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-password">パスワード</Label>
            <Input
              id="signup-password"
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">組織名</Label>
            <Input
              id="org-name"
              type="text"
              placeholder="組織名を入力"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-display-name">あなたの表示名</Label>
            <Input
              id="org-display-name"
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

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "作成中..." : "アカウントと組織を作成"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
