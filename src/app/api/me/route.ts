/**
 * GET /api/me - 自分のメンバー情報を取得する
 * PATCH /api/me - 自分の表示名を変更する
 * 認証チェック + getMemberOrFailでorgIdを自動特定
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { updateDisplayName } from "@/lib/db/members";
import { updateDisplayNameSchema } from "@/lib/validators/auth";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 1. 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
  }

  // 2. 組織メンバーチェック（userIdのみで検索、orgIdは戻り値から取得）
  const member = await getMemberOrFail(supabase, user.id);

  // 3. レスポンス返却（必要なフィールドのみ返す）
  return NextResponse.json({
    data: {
      user_id: member.user_id,
      org_id: member.org_id,
      display_name: member.display_name,
      role: member.role,
    },
  });
});

/** PATCH: 自分の表示名を変更 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  // 1. 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
  }

  // 2. 組織メンバーチェック
  const member = await getMemberOrFail(supabase, user.id);

  // 3. バリデーション
  const body = await request.json();
  const parsed = updateDisplayNameSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, "VALIDATION_ERROR", message);
  }

  // 4. 表示名を更新
  const updated = await updateDisplayName(
    supabase,
    member.org_id,
    user.id,
    parsed.data.display_name
  );

  // 5. レスポンス返却
  return NextResponse.json({
    data: {
      user_id: updated.user_id,
      display_name: updated.display_name,
    },
  });
});
