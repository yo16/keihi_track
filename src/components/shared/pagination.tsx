"use client";

/**
 * ページネーションコンポーネント
 * カーソルベースの「次のページ」ボタンを提供する
 */
import { Button } from "@/components/ui/button";

interface PaginationProps {
  /** 次のページが存在するか */
  hasMore: boolean;
  /** 次のページを読み込む際のコールバック */
  onLoadMore: () => void;
  /** ローディング状態 */
  isLoading?: boolean;
}

/** カーソルベースのページネーション（「次のページ」ボタン） */
export function Pagination({
  hasMore,
  onLoadMore,
  isLoading = false,
}: PaginationProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center py-4">
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
      >
        {isLoading ? "読み込み中..." : "次のページ"}
      </Button>
    </div>
  );
}
