"use client";

/**
 * 新規組織作成ダイアログ
 * 組織名 + 表示名を入力して POST /api/organizations で組織を作成する
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/lib/validators/organization";
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
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      display_name: "",
    },
  });

  // ダイアログを開いたときにフォームをリセット
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      reset();
      setServerError(null);
    }
  };

  // 組織作成処理
  const onSubmit = async (data: CreateOrganizationInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations", {
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

      const result = await response.json();
      const orgId = result.data?.id;

      // 作成した組織のダッシュボードへリダイレクト
      if (orgId) {
        router.push(`/${orgId}/dashboard`);
      }
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
            組織名と表示名を入力してください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 組織名入力 */}
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

          {/* 表示名入力 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-display-name">表示名</Label>
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

          {/* サーバーエラー表示 */}
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          {/* 作成ボタン */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "作成中..." : "組織を作成"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
