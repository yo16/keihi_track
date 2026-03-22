"use client";

/**
 * 経費一覧コンポーネント
 * デスクトップではテーブル表示、モバイルではカード表示に切り替え
 */
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
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
import type { Expense } from "@/types/database";

/** 申請者情報（APIレスポンスに含まれる） */
interface Applicant {
  user_id: string;
  display_name: string;
}

/** 経費一覧の各行データ（Expense + 申請者情報） */
export type ExpenseListRow = Expense & {
  applicant?: Applicant;
};

interface ExpenseListProps {
  /** 経費データの配列 */
  expenses: ExpenseListRow[];
  /** 次のページが存在するか */
  hasMore: boolean;
  /** 次のページを読み込むコールバック */
  onLoadMore: () => void;
  /** ローディング状態 */
  isLoadingMore?: boolean;
}

/** 経費一覧（テーブル + カードのレスポンシブ表示） */
export function ExpenseList({
  expenses,
  hasMore,
  onLoadMore,
  isLoadingMore = false,
}: ExpenseListProps) {
  const router = useRouter();
  /** 行クリックで詳細ページへ遷移 */
  const handleRowClick = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
  };

  if (expenses.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        経費申請はまだありません
      </p>
    );
  }

  return (
    <div>
      {/* デスクトップ向けテーブル表示（md以上） */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申請者</TableHead>
              <TableHead>使用日</TableHead>
              <TableHead>用途</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>ステータス</TableHead>
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
                {/* 申請者名 */}
                <TableCell>{expense.applicant?.display_name ?? "-"}</TableCell>
                <TableCell>{formatDate(expense.usage_date)}</TableCell>
                <TableCell>{expense.purpose}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={expense.status} />
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
              {/* 上段: 用途とステータス */}
              <div className="flex items-center justify-between">
                <span className="font-medium truncate mr-2">
                  {expense.purpose}
                </span>
                <StatusBadge status={expense.status} />
              </div>
              {/* 申請者名 */}
              {expense.applicant?.display_name && (
                <div className="text-sm text-muted-foreground">
                  申請者: {expense.applicant.display_name}
                </div>
              )}
              {/* 下段: 金額、使用日、申請日時 */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formatCurrency(expense.amount)}
                </span>
                <span>{formatDate(expense.usage_date)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                申請日: {formatDateTime(expense.created_at)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ページネーション */}
      <Pagination
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        isLoading={isLoadingMore}
      />
    </div>
  );
}
