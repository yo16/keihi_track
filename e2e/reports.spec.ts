/**
 * 経費レポートページのE2Eテスト
 * 承認者ロールでログインし、経費データが正しく表示されることを検証する
 *
 * 前提条件:
 * - E2E_USER_EMAIL, E2E_USER_PASSWORD 環境変数にテスト用承認者のアカウント情報が設定されていること
 * - テスト用DBに経費データが存在すること
 */
import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

// 環境変数からテスト用ユーザー情報を取得
const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD;

// 環境変数が未設定の場合はテスト全体をスキップ
const shouldSkip = !E2E_USER_EMAIL || !E2E_USER_PASSWORD;

test.describe("経費レポートページ", () => {
  // 環境変数が設定されていない場合にスキップ
  test.skip(shouldSkip, "E2E_USER_EMAIL / E2E_USER_PASSWORD が未設定のためスキップ");

  test.beforeEach(async ({ page }) => {
    // テスト用承認者アカウントでログイン
    await login(page, E2E_USER_EMAIL!, E2E_USER_PASSWORD!);
  });

  test("レポートページにアクセスして経費データが表示されること", async ({ page }) => {
    // /reports ページに遷移
    await page.goto("/reports");

    // ページタイトル「経費レポート」が表示されること
    await expect(page.getByText("経費レポート")).toBeVisible();

    // ローディング表示が消えるまで待つ
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });

    // 「条件に一致する経費はありません」が表示されていない（= データが存在する）ことを確認
    await expect(page.getByText("条件に一致する経費はありません")).toBeHidden();

    // テーブル（デスクトップ）またはカード（モバイル）のいずれかで経費データが表示されていること
    // デスクトップサイズのテーブルに行が1つ以上存在するか、カードが1つ以上存在すること
    const tableRows = page.locator("table tbody tr");
    const cards = page.locator('[class*="space-y-3"] > div');

    // デスクトップ表示の場合はテーブル行、モバイル表示の場合はカードで検証
    const tableRowCount = await tableRows.count();
    const cardCount = await cards.count();
    const hasData = tableRowCount > 0 || cardCount > 0;
    expect(hasData).toBe(true);
  });

  test("フィルター操作ができること", async ({ page }) => {
    await page.goto("/reports");

    // ページ読み込みが完了するまで待つ
    await expect(page.getByText("経費レポート")).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });

    // フィルターエリアが表示されること
    // フィルター適用ボタンが存在すること
    const applyButton = page.getByRole("button", { name: /適用|フィルター/ });
    await expect(applyButton).toBeVisible();
  });

  test("CSV出力ボタンが表示されること", async ({ page }) => {
    await page.goto("/reports");

    // ページ読み込みが完了するまで待つ
    await expect(page.getByText("経費レポート")).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });

    // CSV出力ボタンが表示されること
    const csvButton = page.getByRole("button", { name: /CSV/ });
    await expect(csvButton).toBeVisible();
  });
});
