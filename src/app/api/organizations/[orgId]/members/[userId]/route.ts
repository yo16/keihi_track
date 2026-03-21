/**
 * PATCH /api/organizations/[orgId]/members/[userId] - ロールを変更する
 * DELETE /api/organizations/[orgId]/members/[userId] - メンバーを論理削除する
 * 認証 + adminチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import {
  getMemberOrFail,
  requireRole,
  requireNotSelf,
} from "@/lib/auth/guard";
import { changeRole, deleteMember } from "@/lib/db/members";
import { changeRoleSchema } from "@/lib/validators/member";

/** PATCH: メンバーのロールを変更 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { userId } = await context.params;

    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. 組織メンバー + adminロールチェック、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    requireRole(currentMember, "admin");
    const orgId = currentMember.org_id;

    // 3. 自分自身のロール変更は不可
    requireNotSelf(user.id, userId);

    // 4. リクエストバリデーション
    const body = await request.json();
    const parsed = changeRoleSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new ApiError(400, "VALIDATION_ERROR", message);
    }

    // 5. DB操作: ロールを変更
    const updated = await changeRole(supabase, orgId, userId, parsed.data.role);

    // 6. レスポンス返却
    return NextResponse.json({
      data: {
        user_id: updated.user_id,
        display_name: updated.display_name,
        role: updated.role,
      },
    });
  }
);

/** DELETE: メンバーを論理削除 */
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { userId } = await context.params;

    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. 組織メンバー + adminロールチェック、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    requireRole(currentMember, "admin");
    const orgId = currentMember.org_id;

    // 3. DB操作: メンバーを論理削除
    const deleted = await deleteMember(supabase, orgId, userId);

    // 4. レスポンス返却
    return NextResponse.json({
      data: {
        user_id: deleted.user_id,
        deleted_at: deleted.deleted_at,
      },
    });
  }
);
