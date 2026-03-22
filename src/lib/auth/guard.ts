/**
 * 認可ガード
 * APIルートでメンバーの所属確認やロールチェックを行う
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/error";
import type { OrganizationMember, Role } from "@/types/database";

/** ロール階層の定義: 数値が大きいほど権限が高い */
const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  approver: 2,
  user: 1,
};

/**
 * 組織メンバーを取得する
 * user_idのみで検索（UNIQUE制約により1件のみヒット）
 * 未所属または削除済みの場合は403エラーをスローする
 * 戻り値にorg_idが含まれるため、呼び出し元でorgIdを特定できる
 */
export async function getMemberOrFail(
  supabase: SupabaseClient,
  userId: string
): Promise<OrganizationMember> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new ApiError(403, "FORBIDDEN", "この組織へのアクセス権がありません");
  }

  return data as OrganizationMember;
}

/**
 * ロール階層チェック
 * メンバーのロールが要求されたロール以上でない場合は403エラーをスローする
 */
export function requireRole(member: OrganizationMember, minRole: Role): void {
  const memberLevel = ROLE_HIERARCHY[member.role];
  const requiredLevel = ROLE_HIERARCHY[minRole];

  if (memberLevel < requiredLevel) {
    throw new ApiError(403, "FORBIDDEN", "この操作を行う権限がありません");
  }
}

/**
 * 本人確認
 * 操作対象が本人でない場合は403エラーをスローする
 */
export function requireSelf(userId: string, targetUserId: string): void {
  if (userId !== targetUserId) {
    throw new ApiError(403, "FORBIDDEN", "本人のみ実行できる操作です");
  }
}

/**
 * 他者確認
 * 操作対象が本人の場合は403エラーをスローする
 */
export function requireNotSelf(userId: string, targetUserId: string): void {
  if (userId === targetUserId) {
    throw new ApiError(403, "FORBIDDEN", "自分自身に対しては実行できません");
  }
}
