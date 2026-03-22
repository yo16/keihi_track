import { test, expect } from "@playwright/test";

/**
 * スモークテスト
 * トップページの基本的な表示を確認する
 */
test.describe("トップページ スモークテスト", () => {
  test("トップページにアクセスできること", async ({ page }) => {
    // トップページへアクセス
    const response = await page.goto("/");

    // HTTPステータス200で返ること
    expect(response?.status()).toBe(200);
  });

  test("ログインフォームが表示されること", async ({ page }) => {
    await page.goto("/");

    // 「ケイトラ」タイトルが表示されること
    await expect(page.getByText("ケイトラ")).toBeVisible();

    // メールアドレス入力欄が表示されること
    await expect(page.getByLabel("メールアドレス")).toBeVisible();

    // パスワード入力欄が表示されること
    await expect(page.getByLabel("パスワード")).toBeVisible();

    // ログインボタンが表示されること
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("「新規組織を作成」リンクが表示されること", async ({ page }) => {
    await page.goto("/");

    // 「新規組織を作成」ボタン/リンクが表示されること
    await expect(page.getByText("新規組織を作成")).toBeVisible();
  });
});
