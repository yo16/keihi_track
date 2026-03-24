import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

/**
 * 経費申請一覧の表示テスト
 */

const { email, password } = TEST_USERS.user;

test.describe("経費申請一覧 - 申請者列の表示", () => {
  test("デスクトップ表示でテーブルヘッダーに「申請者」列が存在すること", async ({
    page,
  }) => {
    await login(page, email, password);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/expenses");

    const header = page.locator("th", { hasText: "申請者" });
    await expect(header).toBeVisible();
  });

  test("デスクトップ表示でテーブルヘッダーの列順が正しいこと", async ({
    page,
  }) => {
    await login(page, email, password);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/expenses");

    // テーブルが表示されるまで待つ（データがない場合はスキップ）
    const table = page.locator("table");
    if (!(await table.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const headers = page.locator("thead th");
    const headerTexts = await headers.allTextContents();

    const applicantIndex = headerTexts.findIndex((t) => t.includes("申請者"));
    const usageDateIndex = headerTexts.findIndex((t) => t.includes("使用日"));
    expect(applicantIndex).toBeGreaterThanOrEqual(0);
    expect(usageDateIndex).toBeGreaterThan(applicantIndex);
  });

  test("モバイル表示で申請者名がカード内に表示されること", async ({
    page,
  }) => {
    await login(page, email, password);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/expenses");

    const emptyMessage = page.getByText("経費申請はまだありません");
    const applicantLabel = page.getByText("申請者:", { exact: false });

    const isEmpty = await emptyMessage.isVisible().catch(() => false);
    if (!isEmpty) {
      await expect(applicantLabel.first()).toBeVisible();
    }
  });
});
