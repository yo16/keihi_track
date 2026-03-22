"use client";

/**
 * CSV出力ボタンコンポーネント
 * 選択された経費IDのデータをCSVファイルとしてダウンロードする
 */
import { useState } from "react";
import { generateCsv, downloadCsv } from "@/lib/utils/csv-export";
import type { CsvExpenseRow } from "@/lib/utils/csv-export";
import { Button } from "@/components/ui/button";

interface CsvExportButtonProps {
  /** 選択された経費IDの配列 */
  selectedIds: string[];
}

/** CSV出力ボタン（選択件数表示付き） */
export function CsvExportButton({ selectedIds }: CsvExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selectedIds.length;

  /** CSV出力処理 */
  const handleExport = async () => {
    if (count === 0) return;

    setIsExporting(true);
    setError(null);

    try {
      // CSV用データをAPIから取得
      const response = await fetch(
        "/api/expenses/csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "CSV出力に失敗しました");
      }

      const result = await response.json();
      const data = result.data as CsvExpenseRow[];

      // CSV文字列を生成してダウンロード
      const csvString = generateCsv(data);
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      downloadCsv(csvString, `経費レポート_${timestamp}.csv`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "CSV出力に失敗しました";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleExport}
        disabled={count === 0 || isExporting}
        variant="outline"
      >
        {isExporting ? "出力中..." : `CSV出力（${count}件）`}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
