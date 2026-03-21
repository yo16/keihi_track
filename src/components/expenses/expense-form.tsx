"use client";

/**
 * 経費申請フォームコンポーネント
 * 新規申請と再申請の両モードに対応する
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ReceiptUpload,
  type ReceiptUploadResult,
} from "@/components/shared/receipt-upload";

/** フォーム入力の型（receipt_url/receipt_thumbnail_urlはアップロード後に設定するため除外） */
const formSchema = z.object({
  amount: z
    .number({ message: "金額を入力してください" })
    .int({ message: "金額は整数で入力してください" })
    .positive({ message: "金額は正の値で入力してください" }),
  purpose: z.string().min(1, { message: "用途を入力してください" }),
  usage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "日付を入力してください",
    }),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** フォームのモード */
type ExpenseFormMode = "new" | "resubmit";

interface ExpenseFormProps {
  /** フォームモード */
  mode: ExpenseFormMode;
  /** 再申請時の元経費データ */
  initialData?: {
    expenseId: string;
    amount: number;
    purpose: string;
    usage_date: string;
    comment?: string | null;
    receipt_thumbnail_url?: string;
  };
}

/** 経費申請フォーム（新規申請・再申請共用） */
export function ExpenseForm({ mode, initialData }: ExpenseFormProps) {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const [receiptData, setReceiptData] = useState<ReceiptUploadResult | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React Hook Formの設定
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: initialData?.amount ?? undefined,
      purpose: initialData?.purpose ?? "",
      usage_date: initialData?.usage_date ?? "",
      comment: initialData?.comment ?? "",
    },
  });

  /** Supabase Storageに画像をアップロードする */
  const uploadReceipt = async (
    expenseId: string,
    originalFile: File,
    thumbnailBlob: Blob
  ): Promise<{ receiptUrl: string; thumbnailUrl: string }> => {
    const supabase = createClient();

    // ファイル拡張子の取得
    const ext = originalFile.name.split(".").pop() || "jpg";

    // オリジナル画像のアップロード
    const originalPath = `receipts/${orgId}/${expenseId}/original.${ext}`;
    const { error: originalError } = await supabase.storage
      .from("receipts")
      .upload(originalPath, originalFile, { upsert: true });

    if (originalError) {
      throw new Error(`オリジナル画像のアップロードに失敗しました: ${originalError.message}`);
    }

    // サムネイル画像のアップロード
    const thumbnailPath = `receipts/${orgId}/${expenseId}/thumbnail.jpg`;
    const { error: thumbnailError } = await supabase.storage
      .from("receipts")
      .upload(thumbnailPath, thumbnailBlob, { upsert: true });

    if (thumbnailError) {
      throw new Error(`サムネイル画像のアップロードに失敗しました: ${thumbnailError.message}`);
    }

    // 公開URLの取得
    const { data: originalUrlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(originalPath);
    const { data: thumbnailUrlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(thumbnailPath);

    return {
      receiptUrl: originalUrlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl,
    };
  };

  /** フォーム送信ハンドラ */
  const onSubmit = async (data: FormValues) => {
    // レシート画像の必須チェック（新規の場合は必須、再申請は差し替え無しでもOK）
    if (mode === "new" && !receiptData) {
      setSubmitError("レシート画像を選択してください");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // UUIDをクライアントで生成（新規の場合）
      const expenseId =
        mode === "new"
          ? crypto.randomUUID()
          : initialData?.expenseId ?? crypto.randomUUID();

      // レシート画像をアップロード（選択されている場合）
      let receiptUrl = "";
      let thumbnailUrl = "";

      if (receiptData) {
        const urls = await uploadReceipt(
          expenseId,
          receiptData.originalFile,
          receiptData.thumbnailBlob
        );
        receiptUrl = urls.receiptUrl;
        thumbnailUrl = urls.thumbnailUrl;
      }

      // APIリクエストボディの構築
      const requestBody = {
        ...(mode === "new" ? { id: expenseId } : {}),
        amount: data.amount,
        purpose: data.purpose,
        usage_date: data.usage_date,
        receipt_url: receiptUrl || undefined,
        receipt_thumbnail_url: thumbnailUrl || undefined,
        comment: data.comment || undefined,
      };

      // APIエンドポイントの決定
      // APIエンドポイントの決定（orgIdなしのフラットURL）
      const endpoint =
        mode === "new"
          ? "/api/expenses"
          : `/api/expenses/${initialData?.expenseId}/resubmit`;

      // API呼び出し
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error?.message || "申請に失敗しました"
        );
      }

      // 成功時: 一覧ページへリダイレクト
      router.push("/expenses");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "申請に失敗しました";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {/* 金額入力 */}
      <div className="space-y-2">
        <Label htmlFor="amount">金額（円）</Label>
        <Input
          id="amount"
          type="number"
          placeholder="1500"
          {...register("amount", { valueAsNumber: true })}
          aria-invalid={!!errors.amount}
        />
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      {/* 用途入力 */}
      <div className="space-y-2">
        <Label htmlFor="purpose">用途</Label>
        <Input
          id="purpose"
          type="text"
          placeholder="交通費、備品購入など"
          {...register("purpose")}
          aria-invalid={!!errors.purpose}
        />
        {errors.purpose && (
          <p className="text-sm text-destructive">{errors.purpose.message}</p>
        )}
      </div>

      {/* 使用日入力 */}
      <div className="space-y-2">
        <Label htmlFor="usage_date">使用日</Label>
        <Input
          id="usage_date"
          type="date"
          {...register("usage_date")}
          aria-invalid={!!errors.usage_date}
        />
        {errors.usage_date && (
          <p className="text-sm text-destructive">
            {errors.usage_date.message}
          </p>
        )}
      </div>

      {/* レシート画像アップロード */}
      <div className="space-y-2">
        <Label>レシート画像</Label>
        <ReceiptUpload
          onChange={setReceiptData}
          initialPreviewUrl={initialData?.receipt_thumbnail_url}
        />
        {mode === "new" && !receiptData && submitError?.includes("レシート") && (
          <p className="text-sm text-destructive">
            レシート画像を選択してください
          </p>
        )}
      </div>

      {/* コメント入力 */}
      <div className="space-y-2">
        <Label htmlFor="comment">コメント（任意）</Label>
        <Textarea
          id="comment"
          placeholder="補足事項があれば入力してください"
          {...register("comment")}
        />
      </div>

      {/* エラーメッセージ */}
      {submitError && !submitError.includes("レシート") && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      {/* 送信ボタン */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "送信中..."
          : mode === "new"
            ? "申請する"
            : "再申請する"}
      </Button>
    </form>
  );
}
