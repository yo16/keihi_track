/**
 * GET /api/organizations/[orgId]/members - メンバー一覧を取得する
 * POST /api/organizations/[orgId]/members - メンバーを追加する
 * 認証 + adminチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail, requireRole } from "@/lib/auth/guard";
import { getMembers, createMember } from "@/lib/db/members";
import { createMemberSchema } from "@/lib/validators/member";

/** GET: メンバー一覧を取得 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
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

    // 2. 組織メンバー + adminロールチェック、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    requireRole(currentMember, "admin");
    const orgId = currentMember.org_id;

    // 3. クエリパラメータからinclude_deletedを取得
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("include_deleted") === "true";

    // 4. DB操作: メンバー一覧を取得
    const members = await getMembers(supabase, orgId, includeDeleted);

    // 5. レスポンス返却
    return NextResponse.json({ data: members });
  }
);

/** POST: メンバーを追加 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
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

    // 2. 組織メンバー + adminロールチェック、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    requireRole(currentMember, "admin");
    const orgId = currentMember.org_id;

    // 3. リクエストバリデーション
    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new ApiError(400, "VALIDATION_ERROR", message);
    }

    // 4. DB操作: メンバーを追加（招待メール送信）
    const result = await createMember(
      orgId,
      parsed.data.email,
      parsed.data.display_name,
      parsed.data.role
    );

    // 5. レスポンス返却
    return NextResponse.json({ data: result }, { status: 201 });
  }
);
