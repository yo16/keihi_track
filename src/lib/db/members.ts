/**
 * 組織メンバーテーブルのDB操作関数
 */
import { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/error";
import type { OrganizationMember } from "@/types/database";

/** メンバー情報にemailを付加した型 */
export interface MemberWithEmail extends OrganizationMember {
  email: string;
}

/** createMemberの戻り値型 */
export interface CreateMemberResult {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  invitation_sent: boolean;
}

/**
 * 組織のメンバー一覧を取得する
 * auth.usersからemailを取得するためadmin clientを併用する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param includeDeleted - 論理削除済みメンバーを含めるか（デフォルト: false）
 * @returns メンバー一覧（email付き）
 */
export async function getMembers(
  supabase: SupabaseClient,
  orgId: string,
  includeDeleted: boolean = false
): Promise<MemberWithEmail[]> {
  // organization_membersからメンバー一覧を取得
  let query = supabase
    .from("organization_members")
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .eq("org_id", orgId);

  // 論理削除済みを除外
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data: members, error } = await query;

  if (error) {
    throw new ApiError(500, "DB_ERROR", `メンバー一覧の取得に失敗しました: ${error.message}`);
  }

  if (!members || members.length === 0) {
    return [];
  }

  // admin clientを使ってauth.usersからemailを取得
  const adminClient = createAdminClient();
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();

  if (usersError) {
    throw new ApiError(500, "DB_ERROR", `ユーザー情報の取得に失敗しました: ${usersError.message}`);
  }

  // user_idをキーにemailのマップを作成
  const emailMap = new Map<string, string>();
  for (const user of usersData.users) {
    emailMap.set(user.id, user.email ?? "");
  }

  // メンバー情報にemailを付加して返す
  return members.map((member) => ({
    ...(member as OrganizationMember),
    email: emailMap.get(member.user_id) ?? "",
  }));
}

/**
 * 組織の特定メンバーを取得する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - ユーザーID
 * @returns メンバー情報。見つからない場合はnull
 */
export async function getMember(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<OrganizationMember | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "DB_ERROR", `メンバーの取得に失敗しました: ${error.message}`);
  }

  return data as OrganizationMember | null;
}

/**
 * 組織にメンバーを追加する
 * admin clientを使用（service_role必須: 招待メール送信とRLSバイパス）
 * 新規ユーザーにはinviteUserByEmailで招待メールを送信する
 * 既存ユーザー（他組織に所属済み）はorganization_membersへの追加のみ
 * @param orgId - 組織ID
 * @param email - メールアドレス
 * @param displayName - 組織内表示名
 * @param role - ロール（approver または user）
 * @returns メンバー情報と招待メール送信結果
 */
export async function createMember(
  orgId: string,
  email: string,
  displayName: string,
  role: "approver" | "user"
): Promise<CreateMemberResult> {
  const adminClient = createAdminClient();

  // 1. auth.usersでemailを検索し、既存ユーザーかチェック
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    throw new ApiError(500, "DB_ERROR", `ユーザー検索に失敗しました: ${listError.message}`);
  }

  const existingUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;
  let invitationSent = false;

  if (existingUser) {
    // 既存ユーザーのIDを使用（招待メールは送信しない）
    userId = existingUser.id;
  } else {
    // 新規ユーザー: inviteUserByEmailで招待メールを送信
    // redirectToは固定パス /auth/callback にする
    // （Supabaseダッシュボードの Redirect URLs に登録が必要）
    // callback内でuser_metadataのorg_idを取得し、set-passwordページへ転送する
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${appUrl}/auth/callback`;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          org_id: orgId,
          display_name: displayName,
          role: role,
        },
      }
    );

    if (inviteError) {
      throw new ApiError(500, "DB_ERROR", `招待メールの送信に失敗しました: ${inviteError.message}`);
    }

    userId = inviteData.user.id;
    invitationSent = true;
  }

  // 既にアクティブメンバーとして登録済みかチェック（1ユーザー1組織制約）
  const { data: existingMember } = await adminClient
    .from("organization_members")
    .select("org_id, user_id, deleted_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingMember) {
    // 別の組織に所属している場合はエラー
    if (existingMember.org_id !== orgId) {
      throw new ApiError(409, "CONFLICT", "このメールアドレスは既に別の組織に所属しています");
    }
    // 同じ組織に既に所属している場合
    throw new ApiError(409, "CONFLICT", "既にこの組織のアクティブメンバーとして登録されています");
  }

  // organization_membersにINSERT
  // 論理削除済みのレコードが存在する場合はupsertで復活させる
  const { error: memberError } = await adminClient
    .from("organization_members")
    .upsert(
      {
        org_id: orgId,
        user_id: userId,
        role,
        display_name: displayName,
        deleted_at: null,
      },
      { onConflict: "org_id,user_id" }
    );

  if (memberError) {
    throw new ApiError(500, "DB_ERROR", `メンバーの登録に失敗しました: ${memberError.message}`);
  }

  return {
    user_id: userId,
    display_name: displayName,
    email,
    role,
    invitation_sent: invitationSent,
  };
}

/**
 * メンバーのロールを変更する
 * adminが0人にならないようチェックする
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 対象ユーザーID
 * @param newRole - 新しいロール
 * @returns 更新後のメンバー情報
 */
export async function changeRole(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  newRole: string
): Promise<OrganizationMember> {
  // 対象メンバーの現在のロールを取得
  const { data: currentMember, error: fetchError } = await supabase
    .from("organization_members")
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (fetchError) {
    throw new ApiError(404, "NOT_FOUND", "対象メンバーが見つかりません");
  }

  // 現在がadminで新ロールがadmin以外の場合、他にアクティブなadminがいるかチェック
  if (currentMember.role === "admin" && newRole !== "admin") {
    const { count, error: countError } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "admin")
      .is("deleted_at", null)
      .neq("user_id", userId);

    if (countError) {
      throw new ApiError(500, "DB_ERROR", `管理者数の確認に失敗しました: ${countError.message}`);
    }

    if ((count ?? 0) < 1) {
      throw new ApiError(409, "CONFLICT", "組織に最低1人の管理者が必要です");
    }
  }

  // ロールを更新
  const { data: updated, error: updateError } = await supabase
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .single();

  if (updateError) {
    throw new ApiError(500, "DB_ERROR", `ロールの更新に失敗しました: ${updateError.message}`);
  }

  return updated as OrganizationMember;
}

/**
 * メンバーを論理削除する
 * adminが0人にならないようチェックする
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 対象ユーザーID
 * @returns 削除後のメンバー情報（deleted_at付き）
 */
export async function deleteMember(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<OrganizationMember> {
  // 対象メンバーを取得
  const { data: targetMember, error: fetchError } = await supabase
    .from("organization_members")
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (fetchError) {
    throw new ApiError(404, "NOT_FOUND", "対象メンバーが見つかりません");
  }

  // 対象がadminの場合、他にアクティブなadminがいるかチェック
  if (targetMember.role === "admin") {
    const { count, error: countError } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "admin")
      .is("deleted_at", null)
      .neq("user_id", userId);

    if (countError) {
      throw new ApiError(500, "DB_ERROR", `管理者数の確認に失敗しました: ${countError.message}`);
    }

    if ((count ?? 0) < 1) {
      throw new ApiError(409, "CONFLICT", "組織に最低1人の管理者が必要です");
    }
  }

  // deleted_atを設定して論理削除
  const { data: deleted, error: deleteError } = await supabase
    .from("organization_members")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("org_id, user_id, role, display_name, deleted_at, created_at, updated_at")
    .single();

  if (deleteError) {
    throw new ApiError(500, "DB_ERROR", `メンバーの削除に失敗しました: ${deleteError.message}`);
  }

  return deleted as OrganizationMember;
}

