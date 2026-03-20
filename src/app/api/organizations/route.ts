/**
 * POST /api/organizations - 組織を新規作成する
 * 認証チェックのみ（メンバーチェック不要、新規作成のため）
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { createOrganization } from "@/lib/db/organizations";
import { createOrganizationSchema } from "@/lib/validators/organization";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
  }

  // 2. リクエストバリデーション
  const body = await request.json();
  const parsed = createOrganizationSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, "VALIDATION_ERROR", message);
  }

  // 3. DB操作: 組織を作成（作成者をadminとして登録）
  const org = await createOrganization(
    parsed.data.name,
    parsed.data.display_name,
    user.id
  );

  // 4. レスポンス返却
  return NextResponse.json({ data: org }, { status: 201 });
});
