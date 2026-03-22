/**
 * E2Eテスト用の認証ヘルパー
 * Supabase Authを使ったログイン操作をまとめたユーティリティ
 */
import { Page } from "@playwright/test";

/**
 * 指定のメールアドレス・パスワードでログインし、ダッシュボードに遷移するまで待つ
 * @param page - Playwrightのページオブジェクト
 * @param email - ログインするユーザーのメールアドレス
 * @param password - ログインするユーザーのパスワード
 */
export async function login(page: Page, email: string, password: string) {
  // トップページ（ログイン画面）にアクセス
  await page.goto("/");

  // メールアドレスとパスワードを入力
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // ログインボタンをクリック
  await page.click('button[type="submit"]');

  // ダッシュボードへの遷移完了を待つ
  await page.waitForURL("/dashboard", { timeout: 15000 });
}
