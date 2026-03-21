"use client";

/**
 * 経費詳細ページ
 * 指定された経費IDの詳細をExpenseDetailコンポーネントで表示する
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { ExpenseDetail } from "@/components/expenses/expense-detail";
import type { Expense } from "@/types/database";

export default function ExpenseDetailPage() {
  const params = useParams();
  const { orgId } = useAuthContext();
  const expenseId = params.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 経費詳細を取得
  useEffect(() => {
    const fetchExpense = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/organizations/${orgId}/expenses/${expenseId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("経費データが見つかりませんでした");
          }
          throw new Error("経費詳細の取得に失敗しました");
        }

        const result = await response.json();
        setExpense(result.data as Expense);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "経費詳細の取得に失敗しました";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpense();
  }, [orgId, expenseId]);

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">経費詳細</h1>
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (error || !expense) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">経費詳細</h1>
        <p className="text-center text-destructive py-8">
          {error || "経費データが見つかりませんでした"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">経費詳細</h1>
      <ExpenseDetail expense={expense} />
    </div>
  );
}
