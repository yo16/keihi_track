import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

/**
 * メンバー追加フォーム - ロール選択の表示テスト
 */

const { email, password } = TEST_USERS.admin;

test.describe("メンバー追加フォーム - ロール選択", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, email, password);
  });

  test("ロール選択後に日本語ラベルが表示されること", async ({ page }) => {
    // admin はダッシュボードから /admin/members にリダイレクトされる
    await page.waitForURL(/\/admin\/members/, { timeout: 10000 });
    await page.getByRole("button", { name: /メンバー/ }).click();
    await expect(page.getByRole("heading", { name: "メンバー追加" })).toBeVisible();

    const roleTrigger = page.locator("#member-role");
    await roleTrigger.click();
    await page.getByText("承認者（approver）").click();
    await expect(roleTrigger).toContainText("承認者（approver）");

    await roleTrigger.click();
    await page.getByText("使用者（user）").click();
    await expect(roleTrigger).toContainText("使用者（user）");
  });
});
