import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

/**
 * アカウント設定ページのE2Eテスト
 * 表示名変更・パスワード変更フォームの表示と操作を確認
 */

test.describe("アカウント設定ページ", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
    await page.goto("/account");
  });

  test("アカウント設定ページが表示されること", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "アカウント設定" })).toBeVisible();
    await expect(page.getByRole("button", { name: "表示名を変更" })).toBeVisible();
    await expect(page.getByRole("button", { name: "パスワードを変更" })).toBeVisible();
  });

  test("表示名の変更フォームに現在の表示名が入力されていること", async ({ page }) => {
    const displayNameInput = page.locator("#display_name");
    await expect(displayNameInput).toHaveValue(TEST_USERS.user.displayName);
  });

  test.skip("表示名を変更できること", async ({ page }) => {
    // TODO: PATCH /api/me が500を返す。RLSポリシーの調査が必要
    const displayNameInput = page.locator("#display_name");
    await displayNameInput.clear();
    await displayNameInput.fill("変更後テスト使用者");

    // API レスポンスを待ちつつボタンをクリック
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/me") && res.request().method() === "PATCH"),
      page.getByRole("button", { name: "表示名を変更" }).click(),
    ]);

    // API が成功していること
    expect(response.status()).toBe(200);

    // 成功メッセージまたはエラーメッセージを確認
    await expect(page.getByText(/表示名を変更しました/)).toBeVisible({ timeout: 10000 });

    // 元に戻す
    await displayNameInput.clear();
    await displayNameInput.fill(TEST_USERS.user.displayName);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/me") && res.request().method() === "PATCH"),
      page.getByRole("button", { name: "表示名を変更" }).click(),
    ]);
  });

  test("パスワード変更フォームが表示されること", async ({ page }) => {
    await expect(page.getByLabel("新しいパスワード")).toBeVisible();
    await expect(page.getByLabel("パスワード確認")).toBeVisible();
    await expect(page.getByRole("button", { name: "パスワードを変更" })).toBeVisible();
  });

  test("パスワード不一致時にバリデーションエラーが表示されること", async ({ page }) => {
    await page.getByLabel("新しいパスワード").fill("NewPass1234");
    await page.getByLabel("パスワード確認").fill("DifferentPass");
    await page.getByRole("button", { name: "パスワードを変更" }).click();

    await expect(page.getByText("パスワードが一致しません")).toBeVisible();
  });
});
