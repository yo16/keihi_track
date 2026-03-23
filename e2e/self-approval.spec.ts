import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/test-config";
import { login } from "./helpers/auth";

/**
 * 自己承認ルールのE2Eテスト
 * 承認権限者が1人の場合 → 自己承認可能
 * 承認権限者が2人以上の場合 → 自己承認不可
 *
 * 注意: globalSetupで admin(admin) + approver(approver) + user(user) が作成済み
 * admin も承認権限を持つため、承認権限者は admin + approver の2人
 * → 2人目テストは approver でログインして自己承認不可を確認
 */

test.describe("自己承認ルール", () => {
  test.skip("承認権限者が2人以上の場合、自分の申請を承認できないこと", async ({ page }) => {
    // TODO: レシートアップロード（Supabase Storage）が必要なため、別途対応
    // approver でログイン（admin も承認権限者なので計2人）
    await login(page, TEST_USERS.approver.email, TEST_USERS.approver.password);

    // 経費申請
    await page.goto("/expenses/new");
    await page.getByLabel("金額").fill("2000");
    await page.getByLabel("用途").fill("E2Eテスト: 自己承認拒否テスト用経費");
    const today = new Date().toISOString().split("T")[0];
    await page.getByLabel("使用日").fill(today);

    const receiptInput = page.locator('input[type="file"]');
    if (await receiptInput.isVisible()) {
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      await receiptInput.setInputFiles({
        name: "receipt.png",
        mimeType: "image/png",
        buffer,
      });
    }

    const submitButton = page.getByRole("button", { name: /申請/ });
    await submitButton.click();
    await expect(page).toHaveURL(/\/expenses\/[a-f0-9-]+/, { timeout: 15000 });

    // 承認ボタンをクリック
    const approveButton = page.getByRole("button", { name: /承認/ });
    if (await approveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveButton.click();

      const confirmButton = page.getByRole("button", { name: /確認|はい|OK/ });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // エラーメッセージが表示されること
      await expect(
        page.getByText(/自分の申請は承認できません/)
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
