"use client";

/**
 * 経費レポートページ
 * 承認者向け: フィルター + チェックボックス選択 + CSV出力
 */
import { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import type { ExpenseFilterValues } from "@/components/expenses/expense-filters";
import { CsvExportButton } from "@/components/expenses/csv-export-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpenseStatus } from "@/types/database";

/** APIレスポンスの経費データ型（申請者情報付き） */
interface ReportExpense {
  id: string;
  amount: number;
  purpose: string;
  usage_date: string;
  status: ExpenseStatus;
  applicant?: {
    user_id: string;
    display_name: string;
  };
  created_at: string;
}

export default function ReportsPage() {
  const { orgId } = useAuthContext();
  const [expenses, setExpenses] = useState<ReportExpense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFilterValues>({
    dateFrom: "",
    dateTo: "",
    statuses: ["pending", "approved", "rejected"],
  });

  /** 経費一覧をAPI経由で取得 */
  const fetchExpenses = useCallback(
    async (filterValues: ExpenseFilterValues, cursor?: string | null) => {
      const params = new URLSearchParams();

      // ステータスフィルター
      if (filterValues.statuses.length > 0) {
        params.set("status", filterValues.statuses.join(","));
      }
      // 日付フィルター
      if (filterValues.dateFrom) {
        params.set("date_from", filterValues.dateFrom);
      }
      if (filterValues.dateTo) {
        params.set("date_to", filterValues.dateTo);
      }
      // カーソル
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
        data: result.data as ReportExpense[],
        pagination: result.pagination as {
          next_cursor: string | null;
          has_more: boolean;
        },
      };
    },
    [orgId]
  );

  /** フィルター適用時に初回ロード */
  const loadExpenses = useCallback(
    async (filterValues: ExpenseFilterValues) => {
      setIsLoading(true);
      setError(null);
      // フィルター変更時にチェック状態をリセット
      setSelectedIds(new Set());

      try {
        const result = await fetchExpenses(filterValues);
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
    },
    [fetchExpenses]
  );

  // 初回ロード
  useEffect(() => {
    loadExpenses(filters);
    // filtersの初期値で一度だけ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadExpenses]);

  /** フィルター適用ハンドラ */
  const handleFilterApply = (newFilters: ExpenseFilterValues) => {
    setFilters(newFilters);
    loadExpenses(newFilters);
  };

  /** 次のページを読み込む */
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchExpenses(filters, nextCursor);
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

  /** 個別チェックボックスの切り替え */
  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  /** 全選択/全解除の切り替え */
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 全件選択されているかの判定
  const allSelected = expenses.length > 0 && selectedIds.size === expenses.length;
  // 一部選択されているかの判定（indeterminate状態用）
  const someSelected = selectedIds.size > 0 && selectedIds.size < expenses.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">経費レポート</h1>

      {/* フィルターエリア */}
      <ExpenseFilters onApply={handleFilterApply} initialValues={filters} />

      {/* CSV出力ボタン */}
      <CsvExportButton selectedIds={Array.from(selectedIds)} />

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ローディング状態 */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          条件に一致する経費はありません
        </p>
      ) : (
        <>
          {/* デスクトップ向けテーブル表示（md以上） */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {/* 全選択チェックボックス */}
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={(checked: boolean) =>
                        handleToggleAll(checked)
                      }
                    />
                  </TableHead>
                  <TableHead>申請者名</TableHead>
                  <TableHead>使用日</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={(checked: boolean) =>
                          handleToggleSelect(expense.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {expense.applicant?.display_name ?? "-"}
                    </TableCell>
                    <TableCell>{formatDate(expense.usage_date)}</TableCell>
                    <TableCell>{expense.purpose}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={expense.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* モバイル向けカード表示（md未満） */}
          <div className="block md:hidden space-y-3">
            {/* モバイル全選択 */}
            <label className="flex items-center gap-2 text-sm px-1">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={(checked) =>
                  handleToggleAll(checked === true)
                }
              />
              全選択 / 全解除
            </label>

            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(expense.id)}
                      onCheckedChange={(checked) =>
                        handleToggleSelect(expense.id, checked === true)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {expense.applicant?.display_name ?? "-"}
                    </span>
                    <StatusBadge status={expense.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate mr-2">
                      {expense.purpose}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    使用日: {formatDate(expense.usage_date)} / 申請:{" "}
                    {formatDateTime(expense.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ページネーション */}
          <Pagination
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            isLoading={isLoadingMore}
          />
        </>
      )}
    </div>
  );
}
