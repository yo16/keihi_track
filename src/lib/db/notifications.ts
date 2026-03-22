/**
 * 通知テーブルのDB操作関数
 */
import { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/error";
import type { Notification } from "@/types/database";
import type { PaginatedResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// カーソルユーティリティ（created_at + id の複合カーソル）
// ---------------------------------------------------------------------------

/** カーソルをBase64エンコードする */
function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64");
}

/** Base64カーソルをデコードする */
function decodeCursor(cursor: string): { createdAt: string; id: string } {
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf("|");
  if (separatorIndex === -1) {
    throw new ApiError(400, "VALIDATION_ERROR", "不正なカーソル形式です");
  }
  return {
    createdAt: decoded.slice(0, separatorIndex),
    id: decoded.slice(separatorIndex + 1),
  };
}

// ---------------------------------------------------------------------------
// 通知一覧取得
// ---------------------------------------------------------------------------

/**
 * 通知一覧を取得する（カーソルベースページネーション対応）
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 対象ユーザーID
 * @param limit - 取得件数（デフォルト20、最大100）
 * @param cursor - ページネーションカーソル
 * @returns ページネーション付き通知一覧
 */
export async function getNotifications(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  limit: number = 20,
  cursor?: string
): Promise<PaginatedResponse<Notification>> {
  // limitの上限を100に制限
  const effectiveLimit = Math.min(limit, 100);

  // 通知を新しい順で取得するクエリを構築
  let query = supabase
    .from("notifications")
    .select("id, org_id, user_id, expense_id, type, message, is_read, created_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  // カーソルベースページネーション
  if (cursor) {
    const { createdAt, id } = decodeCursor(cursor);
    // created_at DESC, id DESC の順序でカーソルより前のレコードを取得
    query = query.or(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`
    );
  }

  // limit + 1件取得してhas_moreを判定
  query = query.limit(effectiveLimit + 1);

  const { data: rows, error } = await query;

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `通知一覧の取得に失敗しました: ${error.message}`
    );
  }

  if (!rows) {
    return { data: [], pagination: { next_cursor: null, has_more: false } };
  }

  // has_moreの判定
  const hasMore = rows.length > effectiveLimit;
  const resultRows = hasMore ? rows.slice(0, effectiveLimit) : rows;

  // Notification型にマッピング
  const data: Notification[] = resultRows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    org_id: row.org_id as string,
    user_id: row.user_id as string,
    expense_id: row.expense_id as string | null,
    type: row.type as Notification["type"],
    message: row.message as string,
    is_read: row.is_read as boolean,
    created_at: row.created_at as string,
  }));

  // 次のカーソルを生成
  const lastItem = data[data.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? encodeCursor(lastItem.created_at, lastItem.id)
      : null;

  return {
    data,
    pagination: {
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  };
}

// ---------------------------------------------------------------------------
// 未読通知件数取得
// ---------------------------------------------------------------------------

/**
 * 未読通知の件数を取得する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 対象ユーザーID
 * @returns 未読件数
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<{ count: number }> {
  // countオプションでヘッダーから件数を取得（データ本体は不要）
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `未読通知件数の取得に失敗しました: ${error.message}`
    );
  }

  return { count: count ?? 0 };
}

// ---------------------------------------------------------------------------
// 通知を既読にする
// ---------------------------------------------------------------------------

/**
 * 指定の通知を既読にする
 * 自分宛の通知のみ更新可能（user_id条件付き）
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param notificationId - 通知ID
 * @param userId - 操作者のユーザーID
 * @returns 更新後の通知
 */
export async function markAsRead(
  supabase: SupabaseClient,
  orgId: string,
  notificationId: string,
  userId: string
): Promise<Notification> {
  // 自分宛の通知のみ既読に更新する
  const { data: notification, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .select("id, org_id, user_id, expense_id, type, message, is_read, created_at")
    .single();

  if (error) {
    // 対象レコードが見つからない場合
    if (error.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "通知が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `通知の既読更新に失敗しました: ${error.message}`
    );
  }

  return notification as Notification;
}

// ---------------------------------------------------------------------------
// 全通知を既読にする
// ---------------------------------------------------------------------------

/**
 * ユーザーの未読通知を全て既読にする
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 操作者のユーザーID
 * @returns 更新された件数
 */
export async function markAllAsRead(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<{ updated_count: number }> {
  // 未読の通知を全て既読に更新し、更新行を返却して件数を取得
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `通知の一括既読更新に失敗しました: ${error.message}`
    );
  }

  return { updated_count: data?.length ?? 0 };
}
