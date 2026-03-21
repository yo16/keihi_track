"use client";

/**
 * 経費詳細コンポーネント
 * 経費の全項目表示 + レシート画像 + アクションボタン
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiptViewer } from "@/components/shared/receipt-viewer";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ApprovalActions } from "@/components/expenses/approval-actions";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/types/database";

interface ExpenseDetailProps {
  /** 経費データ */
  expense: Expense;
}

/** 経費詳細表示コンポーネント */
export function ExpenseDetail({ expense }: ExpenseDetailProps) {
  const router = useRouter();
  const { userId, role } = useAuthContext();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // アクション表示条件の判定
  const isOwner = expense.applicant_user_id === userId;
  const canWithdraw = isOwner && expense.status === "pending";
  const canResubmit = isOwner && expense.status === "rejected";
  // 承認者（approver/admin）かつ申請中かつ他人の申請の場合に承認/却下ボタンを表示
  const canApprove =
    !isOwner &&
    expense.status === "pending" &&
    (role === "approver" || role === "admin");

  /** 取り下げ処理 */
  const handleWithdraw = async () => {
    if (!confirm("この経費申請を取り下げますか？")) {
      return;
    }

    setIsWithdrawing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/expenses/${expense.id}/withdraw`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "取り下げに失敗しました");
      }

      // 成功時: 一覧へ戻る
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "取り下げに失敗しました";
      setError(message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 再申請フォーム表示時
  if (showResubmitForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">再申請</h2>
          <Button
            variant="outline"
            onClick={() => setShowResubmitForm(false)}
          >
            キャンセル
          </Button>
        </div>
        <ExpenseForm
          mode="resubmit"
          initialData={{
            expenseId: expense.id,
            amount: expense.amount,
            purpose: expense.purpose,
            usage_date: expense.usage_date,
            comment: expense.comment,
            receipt_thumbnail_url: expense.receipt_thumbnail_url,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ステータス表示 */}
      <div className="flex items-center gap-3">
        <StatusBadge status={expense.status} />
      </div>

      {/* 基本情報 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 金額 */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">金額</p>
          <p className="text-lg font-semibold">
            {formatCurrency(expense.amount)}
          </p>
        </div>

        {/* 用途 */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">用途</p>
          <p className="text-base">{expense.purpose}</p>
        </div>

        {/* 使用日 */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">使用日</p>
          <p className="text-base">{formatDate(expense.usage_date)}</p>
        </div>

        {/* 申請日時 */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">申請日時</p>
          <p className="text-base">{formatDateTime(expense.created_at)}</p>
        </div>
      </div>

      {/* コメント */}
      {expense.comment && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">コメント</p>
          <p className="text-base whitespace-pre-wrap">{expense.comment}</p>
        </div>
      )}

      {/* レシート画像 */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">レシート</p>
        <ReceiptViewer
          thumbnailUrl={expense.receipt_thumbnail_url}
          originalUrl={expense.receipt_url}
        />
      </div>

      {/* 承認情報（承認済みの場合） */}
      {expense.status === "approved" && expense.approved_at && (
        <div className="rounded-md border bg-green-50 p-4 space-y-1">
          <p className="text-sm font-medium text-green-800">承認情報</p>
          <p className="text-sm text-green-700">
            承認日時: {formatDateTime(expense.approved_at)}
          </p>
        </div>
      )}

      {/* 却下情報（却下の場合） */}
      {expense.status === "rejected" && (
        <div className="rounded-md border bg-red-50 p-4 space-y-1">
          <p className="text-sm font-medium text-red-800">却下情報</p>
          {expense.rejected_at && (
            <p className="text-sm text-red-700">
              却下日時: {formatDateTime(expense.rejected_at)}
            </p>
          )}
          {expense.rejection_comment && (
            <p className="text-sm text-red-700">
              却下理由: {expense.rejection_comment}
            </p>
          )}
        </div>
      )}

      {/* エラーメッセージ */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 承認/却下アクション（承認者 + 申請中 + 他人の申請） */}
      {canApprove && (
        <ApprovalActions expenseId={expense.id} />
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 pt-2">
        {/* 取り下げボタン（使用者 + 申請中 + 自分の申請） */}
        {canWithdraw && (
          <Button
            variant="destructive"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? "処理中..." : "取り下げ"}
          </Button>
        )}

        {/* 再申請ボタン（使用者 + 却下 + 自分の申請） */}
        {canResubmit && (
          <Button onClick={() => setShowResubmitForm(true)}>再申請</Button>
        )}

        {/* 一覧へ戻るボタン */}
        <Button
          variant="outline"
          onClick={() => router.push("/expenses")}
        >
          一覧へ戻る
        </Button>
      </div>
    </div>
  );
}
