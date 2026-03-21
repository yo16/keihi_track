"use client";

/**
 * 承認待ち一覧ページ
 * 承認者向け: 申請中の経費のうち、自分以外の申請を一覧表示する
 * 行クリックで経費詳細ページ（承認/却下操作あり）へ遷移する
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

/** APIレスポンスの経費データ型（申請者情報付き） */
interface ExpenseWithApplicant {
  id: string;
  amount: number;
  purpose: string;
  usage_date: string;
  status: string;
  applicant_user_id?: string;
  applicant?: {
    user_id: string;
    display_name: string;
  };
  created_at: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const { userId } = useAuthContext();
  const [expenses, setExpenses] = useState<ExpenseWithApplicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 申請中の経費一覧を取得 */
  const fetchPendingExpenses = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/expenses?status=pending"
      );

      if (!response.ok) {
        throw new Error("承認待ち一覧の取得に失敗しました");
      }

      const result = await response.json();
      return result.data as ExpenseWithApplicant[];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "承認待ち一覧の取得に失敗しました";
      throw new Error(message);
    }
  }, []);

  // データ取得
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPendingExpenses();
        // 自分の申請を除外するフロントフィルター
        const filtered = data.filter((expense) => {
          const applicantId =
            expense.applicant?.user_id ?? expense.applicant_user_id;
          return applicantId !== userId;
        });
        setExpenses(filtered);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "承認待ち一覧の取得に失敗しました";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchPendingExpenses, userId]);

  /** 行クリックで経費詳細ページへ遷移 */
  const handleRowClick = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">承認待ち一覧</h1>

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ローディング状態 */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          承認待ちの経費申請はありません
        </p>
      ) : (
        <>
          {/* デスクトップ向けテーブル表示（md以上） */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請者名</TableHead>
                  <TableHead>使用日</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>申請日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(expense.id)}
                  >
                    <TableCell>
                      {expense.applicant?.display_name ?? "-"}
                    </TableCell>
                    <TableCell>{formatDate(expense.usage_date)}</TableCell>
                    <TableCell>{expense.purpose}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>{formatDateTime(expense.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* モバイル向けカード表示（md未満） */}
          <div className="block md:hidden space-y-3">
            {expenses.map((expense) => (
              <Card
                key={expense.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(expense.id)}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {expense.applicant?.display_name ?? "-"}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className="font-medium truncate">{expense.purpose}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(expense.usage_date)}</span>
                    <span>申請: {formatDateTime(expense.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
