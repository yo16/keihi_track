import { test, expect } from "@playwright/test";

/**
 * メンバー追加フォーム - ロール選択の表示テスト
 *
 * テスト用の環境変数が設定されている場合のみ実行する。
 * 必要な環境変数:
 *   - E2E_ADMIN_EMAIL: 管理者権限を持つテストユーザーのメールアドレス
 *   - E2E_ADMIN_PASSWORD: テストユーザーのパスワード
 */

// 環境変数が未設定の場合はテスト全体をスキップ
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("メンバー追加フォーム - ロール選択", () => {
  test.skip(
    !email || !password,
    "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD が未設定のためスキップ"
  );

  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto("/");
    await page.getByLabel("メールアドレス").fill(email!);
    await page.getByLabel("パスワード").fill(password!);
    await page.getByRole("button", { name: "ログイン" }).click();

    // ダッシュボードに遷移することを確認
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("ロール選択後に日本語ラベルが表示されること", async ({ page }) => {
    // 管理画面（メンバー一覧）に遷移
    await page.goto("/dashboard");
    // メンバー追加ボタンをクリック
    await page.getByRole("button", { name: /メンバー/ }).click();

    // メンバー追加ダイアログが表示されること
    await expect(page.getByText("メンバー追加")).toBeVisible();

    // ロール選択のトリガーをクリック
    const roleTrigger = page.locator("#member-role");
    await roleTrigger.click();

    // 「承認者（approver）」を選択
    await page.getByText("承認者（approver）").click();

    // 選択後にトリガー内に日本語ラベルが表示されること
    await expect(roleTrigger).toContainText("承認者（approver）");

    // 再度トリガーをクリックして「使用者（user）」を選択
    await roleTrigger.click();
    await page.getByText("使用者（user）").click();

    // 選択後にトリガー内に日本語ラベルが表示されること
    await expect(roleTrigger).toContainText("使用者（user）");
  });
});
