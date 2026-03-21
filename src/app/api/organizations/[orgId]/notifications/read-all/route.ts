/**
 * PATCH /api/organizations/[orgId]/notifications/read-all - 全通知を既読にする
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { markAllAsRead } from "@/lib/db/notifications";

/** PATCH: 全ての未読通知を既読にする */
export const PATCH = withErrorHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. 組織メンバーチェック、orgIdを取得
    const member = await getMemberOrFail(supabase, user.id);
    const orgId = member.org_id;

    // 3. DB操作: 全通知を既読に更新
    const result = await markAllAsRead(supabase, orgId, user.id);

    // 4. レスポンス返却
    return NextResponse.json({ data: result });
  }
);
