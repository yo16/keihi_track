/**
 * 経費レポートページのE2Eテスト
 * 承認者ロールでログインし、経費データが正しく表示されることを検証する
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

const { email, password } = TEST_USERS.approver;

test.describe("経費レポートページ", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, email, password);
  });

  test("レポートページにアクセスして経費データが表示されること", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "経費レポート" })).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });
    await expect(page.getByText("条件に一致する経費はありません")).toBeHidden();

    const tableRows = page.locator("table tbody tr");
    const cards = page.locator('[class*="space-y-3"] > div');
    const tableRowCount = await tableRows.count();
    const cardCount = await cards.count();
    expect(tableRowCount > 0 || cardCount > 0).toBe(true);
  });

  test("フィルター操作ができること", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "経費レポート" })).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });

    const applyButton = page.getByRole("button", { name: /適用|フィルター/ });
    await expect(applyButton).toBeVisible();
  });

  test("CSV出力ボタンが表示されること", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "経費レポート" })).toBeVisible();
    await expect(page.getByText("読み込み中...")).toBeHidden({ timeout: 10000 });

    const csvButton = page.getByRole("button", { name: /CSV/ });
    await expect(csvButton).toBeVisible();
  });
});
