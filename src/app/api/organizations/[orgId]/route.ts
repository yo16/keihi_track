/**
 * GET /api/organizations/[orgId] - 組織情報を取得する
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { getOrganization } from "@/lib/db/organizations";

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

    // 2. 組織メンバーチェック（所属していなければ403）
    await getMemberOrFail(supabase, orgId, user.id);

    // 3. DB操作: 組織情報を取得
    const org = await getOrganization(supabase, orgId);

    // 4. レスポンス返却
    return NextResponse.json({ data: org });
  }
);
