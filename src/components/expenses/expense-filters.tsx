"use client";

/**
 * 経費フィルターコンポーネント
 * 日付（from/to）とステータスでフィルタリングする
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ExpenseStatus } from "@/types/database";

/** フィルター値の型 */
export interface ExpenseFilterValues {
  dateFrom: string;
  dateTo: string;
  statuses: ExpenseStatus[];
}

interface ExpenseFiltersProps {
  /** フィルター適用コールバック */
  onApply: (filters: ExpenseFilterValues) => void;
  /** 初期値 */
  initialValues?: Partial<ExpenseFilterValues>;
}

/** ステータスの選択肢定義 */
const STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: "pending", label: "申請中" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "却下" },
  { value: "deleted", label: "削除" },
];

/** 経費フィルターUI */
export function ExpenseFilters({ onApply, initialValues }: ExpenseFiltersProps) {
  const [dateFrom, setDateFrom] = useState(initialValues?.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialValues?.dateTo ?? "");
  const [statuses, setStatuses] = useState<ExpenseStatus[]>(
    initialValues?.statuses ?? ["pending", "approved", "rejected"]
  );

  /** ステータスチェックボックスの切り替え */
  const handleStatusToggle = (status: ExpenseStatus, checked: boolean) => {
    if (checked) {
      setStatuses((prev) => [...prev, status]);
    } else {
      setStatuses((prev) => prev.filter((s) => s !== status));
    }
  };

  /** フィルター適用 */
  const handleApply = () => {
    onApply({ dateFrom, dateTo, statuses });
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="text-sm font-medium">フィルター</h3>

      {/* 日付フィルター */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="date-from">使用日（開始）</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date-to">使用日（終了）</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* ステータスフィルター */}
      <div className="space-y-2">
        <Label>ステータス</Label>
        <div className="flex flex-wrap gap-4">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={statuses.includes(option.value)}
                onCheckedChange={(checked: boolean) =>
                  handleStatusToggle(option.value, checked)
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* フィルター適用ボタン */}
      <Button onClick={handleApply} size="sm">
        フィルター適用
      </Button>
    </div>
  );
}
