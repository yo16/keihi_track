/**
 * E2Eテスト globalSetup
 * テスト用の組織・ユーザー・経費データを作成する
 * Supabase Admin API を使用し、メール送信なしで直接作成する
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { TEST_ORG, TEST_USERS, SETUP_STATE_FILE } from "./helpers/test-config";
import type { SetupState } from "./helpers/test-config";

/** dotenvを手動で読み込む（Playwrightのglobal setupではNext.jsの環境変数が使えないため） */
function loadEnv() {
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
}

export default async function globalSetup() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY が未設定です"
    );
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[globalSetup] テストデータの作成を開始...");

  // --- 1. 既存のテストデータを削除（前回の残り） ---
  await cleanupExistingData(adminClient);

  // --- 2. Admin ユーザーを作成 ---
  const { data: adminUser, error: adminErr } =
    await adminClient.auth.admin.createUser({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
      email_confirm: true,
    });
  if (adminErr) throw new Error(`Admin作成失敗: ${adminErr.message}`);
  const adminUserId = adminUser.user.id;
  console.log(`[globalSetup] Admin作成: ${adminUserId}`);

  // --- 3. 組織を作成し、Admin をメンバーとして登録 ---
  const { data: orgData, error: orgErr } = await adminClient
    .from("organizations")
    .insert({ name: TEST_ORG.name })
    .select("id")
    .single();
  if (orgErr) throw new Error(`組織作成失敗: ${orgErr.message}`);
  const orgId = orgData.id;
  console.log(`[globalSetup] 組織作成: ${orgId}`);

  // Admin をメンバーとして登録
  const { error: adminMemberErr } = await adminClient
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: adminUserId,
      role: "admin",
      display_name: TEST_USERS.admin.displayName,
    });
  if (adminMemberErr)
    throw new Error(`Adminメンバー登録失敗: ${adminMemberErr.message}`);

  // --- 4. Approver ユーザーを作成 ---
  const { data: approverUser, error: approverErr } =
    await adminClient.auth.admin.createUser({
      email: TEST_USERS.approver.email,
      password: TEST_USERS.approver.password,
      email_confirm: true,
    });
  if (approverErr) throw new Error(`Approver作成失敗: ${approverErr.message}`);
  const approverUserId = approverUser.user.id;

  const { error: approverMemberErr } = await adminClient
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: approverUserId,
      role: "approver",
      display_name: TEST_USERS.approver.displayName,
    });
  if (approverMemberErr)
    throw new Error(`Approverメンバー登録失敗: ${approverMemberErr.message}`);
  console.log(`[globalSetup] Approver作成: ${approverUserId}`);

  // --- 5. User ユーザーを作成 ---
  const { data: normalUser, error: userErr } =
    await adminClient.auth.admin.createUser({
      email: TEST_USERS.user.email,
      password: TEST_USERS.user.password,
      email_confirm: true,
    });
  if (userErr) throw new Error(`User作成失敗: ${userErr.message}`);
  const normalUserId = normalUser.user.id;

  const { error: userMemberErr } = await adminClient
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: normalUserId,
      role: "user",
      display_name: TEST_USERS.user.displayName,
    });
  if (userMemberErr)
    throw new Error(`Userメンバー登録失敗: ${userMemberErr.message}`);
  console.log(`[globalSetup] User作成: ${normalUserId}`);

  // --- 6. テスト用経費データを作成（一般ユーザーの申請） ---
  const { data: expenseData, error: expenseErr } = await adminClient
    .from("expenses")
    .insert({
      org_id: orgId,
      applicant_user_id: normalUserId,
      amount: 1500,
      purpose: "E2Eテスト用経費",
      usage_date: new Date().toISOString().split("T")[0],
      receipt_url: "https://example.com/test-receipt.png",
      receipt_thumbnail_url: "https://example.com/test-receipt-thumb.png",
      status: "pending",
    })
    .select("id")
    .single();
  if (expenseErr)
    console.warn(`[globalSetup] 経費作成スキップ: ${expenseErr.message}`);

  // --- 7. 共有状態をファイルに保存 ---
  const state: SetupState = {
    orgId,
    users: {
      admin: { userId: adminUserId },
      approver: { userId: approverUserId },
      user: { userId: normalUserId },
    },
    expenseId: expenseData?.id,
  };
  fs.writeFileSync(SETUP_STATE_FILE, JSON.stringify(state, null, 2));

  console.log("[globalSetup] テストデータの作成完了");
}

/**
 * 既存のテストデータを削除する（前回のテスト残り対策）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupExistingData(adminClient: any) {
  // テスト用メールアドレスのユーザーを検索して削除
  const emails = [
    TEST_USERS.admin.email,
    TEST_USERS.approver.email,
    TEST_USERS.user.email,
  ];

  const { data: usersData } = await adminClient.auth.admin.listUsers();
  if (!usersData?.users) return;

  for (const email of emails) {
    const user = usersData.users.find((u: { email?: string; id: string }) => u.email === email);
    if (!user) continue;

    // organization_members から該当ユーザーの org_id を取得
    const { data: memberData } = await adminClient
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberData?.org_id) {
      // 関連データを削除
      await adminClient.from("notifications").delete().eq("org_id", memberData.org_id);
      await adminClient.from("expense_status_logs").delete().match({});
      await adminClient.from("expenses").delete().eq("org_id", memberData.org_id);
      await adminClient.from("organization_members").delete().eq("org_id", memberData.org_id);
      await adminClient.from("organizations").delete().eq("id", memberData.org_id);
    }

    // Auth ユーザーを削除
    await adminClient.auth.admin.deleteUser(user.id);
  }
}
