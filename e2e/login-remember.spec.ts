import { test, expect } from "@playwright/test";

/**
 * ログイン情報記憶機能のE2Eテスト
 * 環境変数 E2E_USER_EMAIL / E2E_USER_PASSWORD が未設定の場合はスキップ
 */

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("ログイン情報を記憶する", () => {
  // 環境変数が未設定なら全テストをスキップ
  test.beforeEach(() => {
    if (!email || !password) {
      test.skip();
    }
  });

  test("チェックONでログイン後、再訪問時にメールアドレスが入力済みになること", async ({
    page,
  }) => {
    // ログインページにアクセス
    await page.goto("/");

    // メールアドレスとパスワードを入力
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);

    // 「ログイン情報を記憶する」チェックボックスをONにする
    await page.getByLabel("ログイン情報を記憶する").click();

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードへの遷移完了を待つ
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // ログインページに再度アクセス
    await page.goto("/");

    // メールアドレスが入力済みであること
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue(email!);

    // チェックボックスがON状態であること
    const checkbox = page.getByLabel("ログイン情報を記憶する");
    await expect(checkbox).toHaveAttribute("data-checked", "");
  });

  test("チェックOFFでログイン後、再訪問時にメールアドレスが空であること", async ({
    page,
  }) => {
    // まずCookieをクリアした状態でテスト
    await page.context().clearCookies();

    // ログインページにアクセス
    await page.goto("/");

    // メールアドレスとパスワードを入力（チェックボックスはOFFのまま）
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードへの遷移完了を待つ
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // ログインページに再度アクセス
    await page.goto("/");

    // メールアドレスが空であること
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue("");
  });

  test("パスワードは記憶されないこと", async ({ page }) => {
    // ログインページにアクセス
    await page.goto("/");

    // メールアドレスとパスワードを入力
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);

    // チェックボックスをONにしてログイン
    await page.getByLabel("ログイン情報を記憶する").click();
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // ログインページに再度アクセス
    await page.goto("/");

    // パスワードが空であること
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveValue("");

    // Cookieにパスワードが含まれていないこと
    const cookies = await page.context().cookies();
    const passwordCookies = cookies.filter(
      (c) => c.value === password || c.name.includes("password")
    );
    expect(passwordCookies).toHaveLength(0);
  });

  test("チェックONの後にOFFでログインするとCookieが削除されること", async ({
    page,
  }) => {
    // まずチェックONでログイン
    await page.goto("/");
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.getByLabel("ログイン情報を記憶する").click();
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // 再度ログインページへ（ログアウト想定）
    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toHaveValue(email!);

    // 今度はチェックOFFでログイン（チェックボックスを外す）
    const checkbox = page.getByLabel("ログイン情報を記憶する");
    await checkbox.click(); // ONからOFFに切り替え
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // 再度ログインページへ
    await page.goto("/");

    // メールアドレスが空であること
    await expect(page.locator('input[type="email"]')).toHaveValue("");

    // Cookie keihi_remember_email が存在しないこと
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(
      (c) => c.name === "keihi_remember_email"
    );
    expect(rememberCookie).toBeUndefined();
  });
});
