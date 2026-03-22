/**
 * フォーマットユーティリティ
 */

/**
 * 金額を日本円表示にフォーマットする
 * 例: 1500 -> "¥1,500"
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/**
 * 日付をYYYY/MM/DD形式にフォーマットする
 * 例: "2024-01-15T00:00:00Z" -> "2024/01/15"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * 日時をYYYY/MM/DD HH:mm形式にフォーマットする
 * 例: "2024-01-15T14:30:00Z" -> "2024/01/15 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}
