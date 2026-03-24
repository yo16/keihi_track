import { test, expect } from "@playwright/test";

/**
 * 組織作成パスワードゲートのE2Eテスト
 * 作成パスワード入力欄の表示と、不正パスワードでの拒否を確認
 * 注意: 実際に組織を作成するとテストデータが汚れるため、バリデーションのみテスト
 */

test.describe("組織作成パスワードゲート", () => {
  test("新規組織作成ダイアログに作成パスワード入力欄が表示されること", async ({ page }) => {
    await page.goto("/");
    await page.getByText("新規組織を作成").click();

    // ダイアログが開くこと
    await expect(page.getByText("アカウントと組織を同時に作成します")).toBeVisible();

    // 作成パスワード入力欄が表示されること
    await expect(page.getByLabel("作成パスワード")).toBeVisible();
  });

  test("作成パスワードが空の場合にバリデーションエラーが表示されること", async ({ page }) => {
    await page.goto("/");
    await page.getByText("新規組織を作成").click();

    // 作成パスワードを空のまま他のフィールドを入力
    await page.locator("#signup-email").fill("gate-test@example.com");
    await page.locator("#signup-password").fill("TestPass1234");
    await page.locator("#org-name").fill("テスト組織");
    await page.locator("#org-display-name").fill("テスト太郎");

    // 送信
    await page.getByRole("button", { name: "アカウントと組織を作成" }).click();

    // バリデーションエラーが表示されること
    await expect(page.getByText("作成パスワードを入力してください")).toBeVisible();
  });
});
