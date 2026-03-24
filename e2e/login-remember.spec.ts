import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";

/**
 * ログイン情報記憶機能のE2Eテスト
 */

const { email, password } = TEST_USERS.user;

test.describe("ログイン情報を記憶する", () => {
  test("チェックONでログイン後、再訪問時にメールアドレスが入力済みになること", async ({
    page,
  }) => {
    await page.goto("/");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("checkbox", { name: "ログイン情報を記憶する" }).click();
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });

    await page.goto("/");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue(email);

    const checkbox = page.getByRole("checkbox", { name: "ログイン情報を記憶する" });
    await expect(checkbox).toHaveAttribute("data-checked", "");
  });

  test("チェックOFFでログイン後、再訪問時にメールアドレスが空であること", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });

    await page.goto("/");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue("");
  });

  test("パスワードは記憶されないこと", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("checkbox", { name: "ログイン情報を記憶する" }).click();
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });

    await page.goto("/");
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveValue("");

    const cookies = await page.context().cookies();
    const passwordCookies = cookies.filter(
      (c) => c.value === password || c.name.includes("password")
    );
    expect(passwordCookies).toHaveLength(0);
  });

  test("チェックONの後にOFFでログインするとCookieが削除されること", async ({
    page,
  }) => {
    await page.goto("/");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("checkbox", { name: "ログイン情報を記憶する" }).click();
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });

    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toHaveValue(email);

    const checkbox = page.getByRole("checkbox", { name: "ログイン情報を記憶する" });
    await checkbox.click();
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });

    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toHaveValue("");

    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(
      (c) => c.name === "keihi_remember_email"
    );
    expect(rememberCookie).toBeUndefined();
  });
});
