/**
 * E2Eテスト globalTeardown
 * テスト用の組織・ユーザー・経費データを削除する
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { SETUP_STATE_FILE, TEST_USERS } from "./helpers/test-config";
import type { SetupState } from "./helpers/test-config";

export default async function globalTeardown() {
  // .env.local を読み込む
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.warn("[globalTeardown] 環境変数未設定のためスキップ");
    return;
  }

  // 共有状態ファイルを読み込む
  if (!fs.existsSync(SETUP_STATE_FILE)) {
    console.warn("[globalTeardown] 状態ファイルが見つかりません");
    return;
  }

  const state: SetupState = JSON.parse(
    fs.readFileSync(SETUP_STATE_FILE, "utf-8")
  );

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[globalTeardown] テストデータの削除を開始...");

  const { orgId, users } = state;

  // 1. 通知を削除
  await adminClient.from("notifications").delete().eq("org_id", orgId);

  // 2. 経費ステータスログを削除（expense_id 経由）
  const { data: expenses } = await adminClient
    .from("expenses")
    .select("id")
    .eq("org_id", orgId);
  if (expenses) {
    for (const expense of expenses) {
      await adminClient
        .from("expense_status_logs")
        .delete()
        .eq("expense_id", expense.id);
    }
  }

  // 3. 経費を削除
  await adminClient.from("expenses").delete().eq("org_id", orgId);

  // 4. 組織メンバーを削除
  await adminClient.from("organization_members").delete().eq("org_id", orgId);

  // 5. 組織を削除
  await adminClient.from("organizations").delete().eq("id", orgId);

  // 6. Auth ユーザーを削除
  const userIds = [users.admin.userId, users.approver.userId, users.user.userId];
  for (const userId of userIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.warn(`[globalTeardown] ユーザー削除失敗(${userId}): ${error.message}`);
    }
  }

  // 7. 状態ファイルを削除
  fs.unlinkSync(SETUP_STATE_FILE);

  console.log("[globalTeardown] テストデータの削除完了");
}
