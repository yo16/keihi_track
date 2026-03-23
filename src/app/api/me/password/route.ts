/**
 * PATCH /api/me/password - 自分のパスワードを変更する
 * 認証チェック + Supabase Auth の updateUser でパスワード更新
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { changePasswordSchema } from "@/lib/validators/auth";

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

  // 2. バリデーション
  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, "VALIDATION_ERROR", message);
  }

  // 3. パスワード更新
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    throw new ApiError(500, "AUTH_ERROR", `パスワードの変更に失敗しました: ${updateError.message}`);
  }

  // 4. レスポンス返却
  return NextResponse.json({
    data: { message: "パスワードを変更しました" },
  });
});
