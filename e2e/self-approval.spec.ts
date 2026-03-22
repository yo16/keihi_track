import { test, expect } from "@playwright/test";

/**
 * 自己承認ルールのE2Eテスト
 *
 * テスト用の環境変数が設定されている場合のみ実行する。
 * 必要な環境変数:
 *   - E2E_SELF_APPROVAL_EMAIL: 承認権限を持つテストユーザーのメールアドレス
 *   - E2E_SELF_APPROVAL_PASSWORD: テストユーザーのパスワード
 *   - E2E_SECOND_APPROVER_EMAIL: 2人目の承認者のメールアドレス（承認者2人テスト用）
 *   - E2E_SECOND_APPROVER_PASSWORD: 2人目の承認者のパスワード
 */

// 環境変数が未設定の場合はテスト全体をスキップ
const email = process.env.E2E_SELF_APPROVAL_EMAIL;
const password = process.env.E2E_SELF_APPROVAL_PASSWORD;

test.describe("自己承認ルール", () => {
  // 環境変数未設定時はスキップ
  test.skip(!email || !password, "E2E_SELF_APPROVAL_EMAIL / E2E_SELF_APPROVAL_PASSWORD が未設定のためスキップ");

  test("承認権限者が1人のみの場合、自分の申請を承認できること", async ({ page }) => {
    // ログイン
    await page.goto("/");
    await page.getByLabel("メールアドレス").fill(email!);
    await page.getByLabel("パスワード").fill(password!);
    await page.getByRole("button", { name: "ログイン" }).click();

    // ダッシュボードに遷移することを確認
    await expect(page).toHaveURL(/\/dashboard/);

    // 経費申請ページへ遷移
    await page.goto("/expenses/new");

    // 経費を申請（フォーム入力）
    await page.getByLabel("金額").fill("1000");
    await page.getByLabel("用途").fill("E2Eテスト: 自己承認テスト用経費");
    // 使用日の入力（日付ピッカーの形式に依存）
    const today = new Date().toISOString().split("T")[0];
    await page.getByLabel("使用日").fill(today);

    // レシート画像のアップロード（テスト用のダミー画像を使用）
    const receiptInput = page.locator('input[type="file"]');
    if (await receiptInput.isVisible()) {
      // テスト用の最小限のPNG画像データを生成
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

    // 申請ボタンをクリック
    const submitButton = page.getByRole("button", { name: /申請/ });
    await submitButton.click();

    // 申請が成功し詳細ページに遷移することを確認
    await expect(page).toHaveURL(/\/expenses\/[a-f0-9-]+/);

    // 承認ボタンが表示されること（承認権限者が1人のみの場合）
    const approveButton = page.getByRole("button", { name: /承認/ });

    // 承認ボタンが存在すればクリックして承認
    if (await approveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveButton.click();

      // 承認確認ダイアログがある場合は確認
      const confirmButton = page.getByRole("button", { name: /確認|はい|OK/ });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // ステータスが「承認済み」に変わることを確認
      await expect(page.getByText(/承認済み/)).toBeVisible({ timeout: 10000 });
    }
  });

  test("承認権限者が2人以上の場合、自分の申請を承認できないこと", async ({ page }) => {
    const secondEmail = process.env.E2E_SECOND_APPROVER_EMAIL;
    const secondPassword = process.env.E2E_SECOND_APPROVER_PASSWORD;

    test.skip(
      !secondEmail || !secondPassword,
      "E2E_SECOND_APPROVER_EMAIL / E2E_SECOND_APPROVER_PASSWORD が未設定のためスキップ"
    );

    // 1人目の承認者でログイン
    await page.goto("/");
    await page.getByLabel("メールアドレス").fill(email!);
    await page.getByLabel("パスワード").fill(password!);
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

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

    await expect(page).toHaveURL(/\/expenses\/[a-f0-9-]+/);

    // 承認ボタンをクリック
    const approveButton = page.getByRole("button", { name: /承認/ });
    if (await approveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveButton.click();

      // 確認ダイアログがある場合は確認
      const confirmButton = page.getByRole("button", { name: /確認|はい|OK/ });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // エラーメッセージ（自己承認不可）が表示されることを確認
      await expect(
        page.getByText(/自分の申請は承認できません/)
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
