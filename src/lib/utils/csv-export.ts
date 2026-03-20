/**
 * CSV生成・ダウンロードユーティリティ
 * BOM付きUTF-8でExcelでの文字化けを防止する
 */

/** CSV出力用の経費データ行型 */
export interface CsvExpenseRow {
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  comment: string | null;
  applicant_name: string;
  created_at: string;
  approver_name: string | null;
  approved_at: string | null;
  rejector_name: string | null;
  rejected_at: string | null;
}

/** CSVヘッダー定義 */
const CSV_HEADERS = [
  "金額",
  "用途",
  "使用日",
  "レシート写真URL",
  "コメント",
  "申請者",
  "申請日時",
  "承認者",
  "承認日時",
  "却下者",
  "却下日時",
] as const;

/**
 * CSVのセル値をエスケープする
 * ダブルクォート、カンマ、改行を含む場合はダブルクォートで囲む
 */
function escapeCsvValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // ダブルクォート、カンマ、改行を含む場合はエスケープ
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 経費データ配列からCSV文字列を生成する
 * BOM付きUTF-8形式
 */
export function generateCsv(data: CsvExpenseRow[]): string {
  // ヘッダー行
  const headerLine = CSV_HEADERS.join(",");

  // データ行を生成
  const dataLines = data.map((row) => {
    const values = [
      escapeCsvValue(row.amount),
      escapeCsvValue(row.purpose),
      escapeCsvValue(row.usage_date),
      escapeCsvValue(row.receipt_url),
      escapeCsvValue(row.comment),
      escapeCsvValue(row.applicant_name),
      escapeCsvValue(row.created_at),
      escapeCsvValue(row.approver_name),
      escapeCsvValue(row.approved_at),
      escapeCsvValue(row.rejector_name),
      escapeCsvValue(row.rejected_at),
    ];
    return values.join(",");
  });

  // BOM + ヘッダー + データ行を結合
  const BOM = "\uFEFF";
  return BOM + [headerLine, ...dataLines].join("\r\n");
}

/**
 * CSV文字列をBlobとしてダウンロードする
 */
export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // ダウンロードリンクを動的に作成
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // クリーンアップ
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
