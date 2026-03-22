/**
 * ステータスバッジコンポーネント
 * 経費のステータスに応じた色分けバッジを表示する
 */
import type { ExpenseStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";

/** ステータスごとの設定マッピング */
const statusConfig: Record<
  ExpenseStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pending: {
    label: "申請中",
    variant: "default",
    className: "bg-blue-600 text-white",
  },
  approved: {
    label: "承認済み",
    variant: "default",
    className: "bg-green-600 text-white",
  },
  rejected: {
    label: "却下",
    variant: "destructive",
  },
  deleted: {
    label: "削除",
    variant: "secondary",
  },
};

interface StatusBadgeProps {
  status: ExpenseStatus;
}

/** 経費ステータスに応じた色分けバッジ */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
