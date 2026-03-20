/**
 * GET /api/organizations/[orgId]/me - 自分のメンバー情報を取得する
 * 認証チェックのみ（getMemberOrFailではなくDB関数のgetMemberを使用）
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMember } from "@/lib/db/members";

export const GET = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { orgId } = await context.params;

    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. DB操作: 自分のメンバー情報を取得（見つからない場合は404）
    const member = await getMember(supabase, orgId, user.id);

    if (!member) {
      throw new ApiError(404, "NOT_FOUND", "この組織のメンバーではありません");
    }

    // 3. レスポンス返却（必要なフィールドのみ返す）
    return NextResponse.json({
      data: {
        user_id: member.user_id,
        org_id: member.org_id,
        display_name: member.display_name,
        role: member.role,
      },
    });
  }
);
