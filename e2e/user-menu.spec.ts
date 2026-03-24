import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

/**
 * ユーザーメニューのE2Eテスト
 * DropdownMenuが正常に開き、メニュー項目が表示されることを確認
 */

test.describe("ユーザーメニュー", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
  });

  test("ユーザーメニューがエラーなく開き、項目が表示されること", async ({ page }) => {
    // ユーザーアイコンをクリック
    const userTrigger = page.locator('[data-slot="dropdown-menu-trigger"]');
    await userTrigger.click();

    // メニュー項目が表示されること
    await expect(page.getByText("アカウント設定")).toBeVisible();
    await expect(page.getByText("ログアウト")).toBeVisible();
  });

  test("アカウント設定をクリックすると設定ページに遷移すること", async ({ page }) => {
    const userTrigger = page.locator('[data-slot="dropdown-menu-trigger"]');
    await userTrigger.click();

    await page.getByText("アカウント設定").click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText("アカウント設定")).toBeVisible();
  });
});
