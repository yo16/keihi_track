/**
 * 承認コメント機能のE2Eテスト
 * 承認者が承認時にコメントを入力でき、経費詳細ページに表示されることを検証する
 *
 * 前提: globalSetupで user が申請した pending 状態の経費が存在すること
 */
import * as fs from "fs";
import { test, expect } from "@playwright/test";
import { TEST_USERS, SETUP_STATE_FILE } from "./helpers/test-config";
import type { SetupState } from "./helpers/test-config";
import { login } from "./helpers/auth";

const approver = TEST_USERS.approver;

/** globalSetupで作成された共有状態を読み込む */
function loadSetupState(): SetupState | null {
  if (!fs.existsSync(SETUP_STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(SETUP_STATE_FILE, "utf-8"));
}

test.describe("承認コメント機能", () => {
  test("承認ダイアログにコメント入力欄が表示されること", async ({ page }) => {
    const state = loadSetupState();
    test.skip(!state?.expenseId, "テスト用経費データが未作成");

    await login(page, approver.email, approver.password);
    await page.goto(`/expenses/${state!.expenseId}`);

    // 経費詳細ページの読み込みを待つ
    await expect(page.getByText("E2Eテスト用経費")).toBeVisible({ timeout: 10000 });

    // 承認ボタンをクリック（exact: true でユーザーメニューと区別）
    const approveButton = page.getByRole("button", { name: "承認", exact: true });
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // 承認ダイアログが表示される
    await expect(page.getByText("経費の承認")).toBeVisible();
    await expect(page.getByText("コメント（任意）")).toBeVisible();

    // コメント入力欄が存在する
    const commentTextarea = page.locator("#approval-comment");
    await expect(commentTextarea).toBeVisible();
  });

  test("承認コメント付きで承認し、詳細ページに表示されること", async ({ page }) => {
    const state = loadSetupState();
    test.skip(!state?.expenseId, "テスト用経費データが未作成");

    await login(page, approver.email, approver.password);
    await page.goto(`/expenses/${state!.expenseId}`);

    // 経費詳細ページの読み込みを待つ
    await expect(page.getByText("E2Eテスト用経費")).toBeVisible({ timeout: 10000 });

    // 承認ボタンをクリック（exact: true でユーザーメニューと区別）
    await page.getByRole("button", { name: "承認", exact: true }).click();

    // ダイアログでコメントを入力して承認
    await expect(page.getByText("経費の承認")).toBeVisible();
    await page.locator("#approval-comment").fill("交際費として仕分け");
    await page.getByRole("button", { name: "承認する" }).click();

    // ページがリロードされるのを待つ
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // 承認情報セクションが表示される
    await expect(page.getByText("承認情報")).toBeVisible({ timeout: 10000 });

    // 承認コメントが表示される
    await expect(page.getByText("承認コメント: 交際費として仕分け")).toBeVisible();
  });
});
