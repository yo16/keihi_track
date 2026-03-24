/**
 * E2Eテスト用の認証ヘルパー
 * Supabase Authを使ったログイン操作をまとめたユーティリティ
 */
import { Page, expect } from "@playwright/test";

/**
 * 指定のメールアドレス・パスワードでログインし、ダッシュボードに遷移するまで待つ
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  // ダッシュボードからロール別ページにリダイレクトされるのを待つ
  await page.waitForURL(/\/(expenses|approvals|admin|dashboard)/, { timeout: 15000 });
}

/**
 * ログイン後、指定のURLに遷移するまで待つ
 */
export async function loginAndNavigate(
  page: Page,
  email: string,
  password: string,
  targetUrl: string
) {
  await login(page, email, password);
  await page.goto(targetUrl);
}
