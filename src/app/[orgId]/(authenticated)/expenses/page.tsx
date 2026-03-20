"use client";

/**
 * 経費申請一覧ページ
 * 自分の申請一覧をExpenseListコンポーネントで表示する
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/types/database";

export default function ExpensesPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 経費一覧を取得する */
  const fetchExpenses = useCallback(
    async (cursor?: string | null) => {
      try {
        // APIエンドポイントの構築
        const params = new URLSearchParams();
        if (cursor) {
          params.set("cursor", cursor);
        }
        const query = params.toString();
        const url = `/api/organizations/${orgId}/expenses${query ? `?${query}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("経費一覧の取得に失敗しました");
        }

        const result = await response.json();
        return {
          data: result.data as Expense[],
          pagination: result.pagination as {
            next_cursor: string | null;
            has_more: boolean;
          },
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "経費一覧の取得に失敗しました";
        throw new Error(message);
      }
    },
    [orgId]
  );

  // 初回ロード
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchExpenses();
        setExpenses(result.data);
        setHasMore(result.pagination.has_more);
        setNextCursor(result.pagination.next_cursor);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "経費一覧の取得に失敗しました";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchExpenses]);

  /** 次のページを読み込む */
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchExpenses(nextCursor);
      setExpenses((prev) => [...prev, ...result.data]);
      setHasMore(result.pagination.has_more);
      setNextCursor(result.pagination.next_cursor);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "経費一覧の取得に失敗しました";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">経費申請一覧</h1>
        <Button onClick={() => router.push(`/${orgId}/expenses/new`)}>
          新規申請
        </Button>
      </div>

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ローディング表示 */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      ) : (
        <ExpenseList
          expenses={expenses}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
        />
      )}
    </div>
  );
}
