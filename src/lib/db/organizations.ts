/**
 * 組織テーブルのDB操作関数
 */
import { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/error";
import type { Organization } from "@/types/database";

/**
 * 組織を新規作成する
 * admin clientを使用してRLSをバイパスし、組織の作成と作成者のメンバー登録を行う
 * @param name - 組織名
 * @param displayName - 作成者の組織内表示名
 * @param userId - 作成者のユーザーID（auth.users.id）
 * @returns 作成された組織
 */
export async function createOrganization(
  name: string,
  displayName: string,
  userId: string
): Promise<Organization> {
  const adminClient = createAdminClient();

  // 組織をINSERT
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name })
    .select("id, name, created_at, updated_at")
    .single();

  if (orgError) {
    throw new ApiError(500, "DB_ERROR", `組織の作成に失敗しました: ${orgError.message}`);
  }

  // 作成者をadminメンバーとしてINSERT
  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: userId,
      role: "admin",
      display_name: displayName,
    });

  if (memberError) {
    // メンバー登録に失敗した場合、作成した組織を削除してロールバック
    await adminClient.from("organizations").delete().eq("id", org.id);
    throw new ApiError(500, "DB_ERROR", `メンバーの登録に失敗しました: ${memberError.message}`);
  }

  return org as Organization;
}

/**
 * 組織をIDで取得する
 * @param supabase - サーバー用Supabaseクライアント（呼び出し元が渡す）
 * @param orgId - 組織ID
 * @returns 組織情報
 * @throws ApiError(404) 組織が見つからない場合
 */
export async function getOrganization(
  supabase: SupabaseClient,
  orgId: string
): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at, updated_at")
    .eq("id", orgId)
    .single();

  if (error) {
    // PGRST116: 結果が0行の場合のエラーコード
    if (error.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "組織が見つかりません");
    }
    throw new ApiError(500, "DB_ERROR", `組織の取得に失敗しました: ${error.message}`);
  }

  return data as Organization;
}
