/**
 * フォーマットユーティリティのテスト
 */
import { formatCurrency, formatDate, formatDateTime } from "../src/lib/utils/format";

// ── formatCurrency ──

describe("formatCurrency", () => {
  it("金額をカンマ区切りの円表示にフォーマットすること", () => {
    expect(formatCurrency(1500)).toBe("¥1,500");
  });

  it("0円をフォーマットできること", () => {
    expect(formatCurrency(0)).toBe("¥0");
  });

  it("大きい金額をフォーマットできること", () => {
    expect(formatCurrency(1000000)).toBe("¥1,000,000");
  });

  it("負の金額をフォーマットできること", () => {
    expect(formatCurrency(-500)).toBe("-¥500");
  });
});

// ── formatDate ──

describe("formatDate", () => {
  it("日付文字列をYYYY/MM/DD形式にフォーマットすること", () => {
    // UTCの日付で時差の影響を受けないようにローカル時間で作成
    const date = new Date(2024, 0, 15); // 2024-01-15 ローカル時間
    expect(formatDate(date)).toBe("2024/01/15");
  });

  it("Dateオブジェクトを受け取れること", () => {
    const date = new Date(2024, 11, 31); // 2024-12-31 ローカル時間
    expect(formatDate(date)).toBe("2024/12/31");
  });

  it("月と日がゼロ埋めされること", () => {
    const date = new Date(2024, 0, 5); // 2024-01-05 ローカル時間
    expect(formatDate(date)).toBe("2024/01/05");
  });
});

// ── formatDateTime ──

describe("formatDateTime", () => {
  it("日時をYYYY/MM/DD HH:mm形式にフォーマットすること", () => {
    const date = new Date(2024, 0, 15, 14, 30); // 2024-01-15 14:30 ローカル時間
    expect(formatDateTime(date)).toBe("2024/01/15 14:30");
  });

  it("時刻がゼロ埋めされること", () => {
    const date = new Date(2024, 0, 5, 9, 5); // 2024-01-05 09:05 ローカル時間
    expect(formatDateTime(date)).toBe("2024/01/05 09:05");
  });
});
