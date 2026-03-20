/**
 * POST /api/organizations/signup - サインアップ + 組織作成を一括で行う
 * 新規システムで最初の組織を作成する際に使用する。
 * Admin APIでユーザー作成（メール確認スキップ）→ 組織作成 → セッション発行
 */
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { createOrganization } from "@/lib/db/organizations";
import { createOrganizationWithSignupSchema } from "@/lib/validators/organization";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = createOrganizationWithSignupSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, "VALIDATION_ERROR", message);
  }

  const { email, password, name, display_name } = parsed.data;
  const adminClient = createAdminClient();

  // 1. 既存ユーザーチェック
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email === email
  );

  let userId: string;

  if (existingUser) {
    // 既存ユーザーの場合: パスワード検証のためにサインインを試みる
    // Admin APIではパスワード検証できないため、通常のサインインで確認
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      throw new ApiError(
        400,
        "AUTH_ERROR",
        "このメールアドレスは既に登録されています。パスワードが正しいか確認してください。"
      );
    }
    userId = existingUser.id;
  } else {
    // 2. 新規ユーザー作成（メール確認スキップ）
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      throw new ApiError(
        500,
        "AUTH_ERROR",
        createError?.message || "ユーザーの作成に失敗しました"
      );
    }
    userId = newUser.user.id;
  }

  // 3. 組織作成（作成者をadminとして登録）
  const org = await createOrganization(name, display_name, userId);

  // 4. レスポンス（クライアント側でログインさせるため、emailとorgIdを返す）
  return NextResponse.json(
    {
      data: {
        organization: org,
        email,
        // クライアント側でsignInWithPasswordを呼ぶために必要
        requires_login: true,
      },
    },
    { status: 201 }
  );
});
