import { test, expect } from "@playwright/test";

/**
 * 経費申請一覧の表示テスト
 * 環境変数 E2E_USER_EMAIL / E2E_USER_PASSWORD が未設定の場合はスキップ
 */

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

/** ログイン処理を実行するヘルパー */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("メールアドレス").fill(email!);
  await page.getByLabel("パスワード").fill(password!);
  await page.getByRole("button", { name: "ログイン" }).click();
  // 経費申請一覧ページへ遷移するまで待機
  await page.waitForURL("**/expenses**", { timeout: 15000 });
}

test.describe("経費申請一覧 - 申請者列の表示", () => {
  // 環境変数が未設定なら全テストをスキップ
  test.beforeEach(() => {
    if (!email || !password) {
      test.skip();
    }
  });

  test("デスクトップ表示でテーブルヘッダーに「申請者」列が存在すること", async ({
    page,
  }) => {
    await login(page);

    // デスクトップ幅を確保
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/expenses");

    // テーブルヘッダーに「申請者」が表示されていること
    const header = page.locator("th", { hasText: "申請者" });
    await expect(header).toBeVisible();
  });

  test("デスクトップ表示でテーブルヘッダーの列順が正しいこと", async ({
    page,
  }) => {
    await login(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/expenses");

    // 全てのテーブルヘッダーのテキストを取得
    const headers = page.locator("thead th");
    const headerTexts = await headers.allTextContents();

    // 「申請者」が「使用日」の前に配置されていること
    const applicantIndex = headerTexts.indexOf("申請者");
    const usageDateIndex = headerTexts.indexOf("使用日");
    expect(applicantIndex).toBeGreaterThanOrEqual(0);
    expect(usageDateIndex).toBeGreaterThan(applicantIndex);
  });

  test("モバイル表示で申請者名がカード内に表示されること", async ({
    page,
  }) => {
    await login(page);

    // モバイル幅に設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/expenses");

    // 経費データが存在する場合、「申請者:」テキストが表示されること
    // データがない場合は「経費申請はまだありません」が表示される
    const emptyMessage = page.getByText("経費申請はまだありません");
    const applicantLabel = page.getByText("申請者:", { exact: false });

    // どちらかが表示されていること（データの有無に依存）
    const isEmpty = await emptyMessage.isVisible().catch(() => false);
    if (!isEmpty) {
      await expect(applicantLabel.first()).toBeVisible();
    }
  });
});
