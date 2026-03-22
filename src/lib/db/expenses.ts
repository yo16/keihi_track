/**
 * 経費テーブルのDB操作関数
 */
import { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/error";
import type { Expense, ExpenseStatus, Role } from "@/types/database";
import type { PaginatedResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** 経費作成時の入力データ */
export interface CreateExpenseData {
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  receipt_thumbnail_url: string;
  comment?: string | null;
}

/** 経費一覧のフィルター条件 */
export interface ExpenseFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  cursor?: string;
}

/** 経費一覧の1行（申請者情報付き） */
export interface ExpenseListItem {
  id: string;
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_thumbnail_url: string;
  comment: string | null;
  status: ExpenseStatus;
  applicant: {
    user_id: string;
    display_name: string;
  };
  created_at: string;
}

/** 経費詳細（各種人名付き） */
export interface ExpenseDetail {
  id: string;
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  receipt_thumbnail_url: string;
  comment: string | null;
  status: ExpenseStatus;
  applicant: {
    user_id: string;
    display_name: string;
  };
  approved_by: { user_id: string; display_name: string } | null;
  approved_at: string | null;
  rejected_by: { user_id: string; display_name: string } | null;
  rejected_at: string | null;
  rejection_comment: string | null;
  created_at: string;
  updated_at: string;
}

/** CSV出力用のフラットなオブジェクト */
export interface ExpenseCsvRow {
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  comment: string | null;
  applicant_name: string;
  created_at: string;
  approver_name: string | null;
  approved_at: string | null;
  rejector_name: string | null;
  rejected_at: string | null;
}

/** 再申請時の入力データ */
export interface ResubmitExpenseData {
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  receipt_thumbnail_url: string;
  comment?: string | null;
}

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
// ステータスログ書き込み（admin client使用）
// ---------------------------------------------------------------------------

/** expense_status_logsにステータス変更履歴を記録する */
async function insertStatusLog(
  expenseId: string,
  changedBy: string,
  oldStatus: string | null,
  newStatus: string,
  comment?: string | null
): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("expense_status_logs").insert({
    expense_id: expenseId,
    changed_by: changedBy,
    old_status: oldStatus,
    new_status: newStatus,
    comment: comment ?? null,
  });
  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `ステータスログの記録に失敗しました: ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// 経費作成
// ---------------------------------------------------------------------------

/**
 * 経費を新規作成する
 * expensesにINSERT後、expense_status_logsに初回記録を挿入する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - 申請者のユーザーID
 * @param data - 経費データ
 * @returns 作成された経費
 */
export async function createExpense(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  data: CreateExpenseData
): Promise<Expense> {
  // expensesテーブルにINSERT（ステータスはpending）
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      org_id: orgId,
      applicant_user_id: userId,
      amount: data.amount,
      purpose: data.purpose,
      usage_date: data.usage_date,
      receipt_url: data.receipt_url,
      receipt_thumbnail_url: data.receipt_thumbnail_url,
      comment: data.comment ?? null,
      status: "pending",
    })
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の作成に失敗しました: ${error.message}`
    );
  }

  // expense_status_logsに初回記録を挿入（admin clientを使用）
  await insertStatusLog(expense.id, userId, null, "pending");

  return expense as Expense;
}

// ---------------------------------------------------------------------------
// 経費一覧取得
// ---------------------------------------------------------------------------

/**
 * 経費一覧を取得する（ロール別フィルタリング、ページネーション対応）
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param userId - リクエストユーザーのID
 * @param role - リクエストユーザーのロール
 * @param filters - フィルター条件
 * @returns ページネーション付き経費一覧
 */
export async function getExpenses(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  role: Role,
  filters: ExpenseFilters = {}
): Promise<PaginatedResponse<ExpenseListItem>> {
  // デフォルト値の設定
  const statusFilter =
    filters.status && filters.status.length > 0
      ? filters.status
      : ["pending", "approved", "rejected"];
  const limit = Math.min(filters.limit ?? 20, 100);

  // 経費とapplicantのdisplay_nameをJOIN取得するクエリ構築
  let query = supabase
    .from("expenses")
    .select(
      "id, amount, purpose, usage_date, receipt_thumbnail_url, comment, status, applicant_user_id, created_at, organization_members(display_name)"
    )
    .eq("org_id", orgId)
    .in("status", statusFilter)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  // ロール別フィルター: userは自分の申請のみ
  if (role === "user") {
    query = query.eq("applicant_user_id", userId);
  }

  // 日付フィルター
  if (filters.date_from) {
    query = query.gte("usage_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("usage_date", filters.date_to);
  }

  // カーソルベースページネーション
  if (filters.cursor) {
    const { createdAt, id } = decodeCursor(filters.cursor);
    // created_at DESC, id DESC の順序でカーソルより前のレコードを取得
    query = query.or(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`
    );
  }

  // limit + 1件取得してhas_moreを判定
  query = query.limit(limit + 1);

  const { data: rows, error } = await query;

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費一覧の取得に失敗しました: ${error.message}`
    );
  }

  if (!rows) {
    return { data: [], pagination: { next_cursor: null, has_more: false } };
  }

  // has_moreの判定
  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  // レスポンス形式に整形
  const data: ExpenseListItem[] = resultRows.map((row: Record<string, unknown>) => {
    // JOINされたorganization_membersからdisplay_nameを取得
    const memberData = row.organization_members as
      | { display_name: string }
      | { display_name: string }[]
      | null;
    const displayName = Array.isArray(memberData)
      ? memberData[0]?.display_name ?? ""
      : memberData?.display_name ?? "";

    return {
      id: row.id as string,
      amount: row.amount as number,
      purpose: row.purpose as string,
      usage_date: row.usage_date as string,
      receipt_thumbnail_url: row.receipt_thumbnail_url as string,
      comment: row.comment as string | null,
      status: row.status as ExpenseStatus,
      applicant: {
        user_id: row.applicant_user_id as string,
        display_name: displayName,
      },
      created_at: row.created_at as string,
    };
  });

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
// 経費詳細取得
// ---------------------------------------------------------------------------

/**
 * 経費詳細を1件取得する
 * applicant, approved_by, rejected_byのdisplay_nameを結合して返す
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @returns 経費詳細
 * @throws ApiError(404) 経費が見つからない場合
 */
export async function getExpense(
  supabase: SupabaseClient,
  orgId: string,
  expenseId: string
): Promise<ExpenseDetail> {
  // 経費レコードを取得
  const { data: expense, error } = await supabase
    .from("expenses")
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "経費が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取得に失敗しました: ${error.message}`
    );
  }

  // 関連するユーザーIDを収集してdisplay_nameをまとめて取得
  const userIds = [expense.applicant_user_id];
  if (expense.approved_by) userIds.push(expense.approved_by);
  if (expense.rejected_by) userIds.push(expense.rejected_by);

  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id, display_name")
    .eq("org_id", orgId)
    .in("user_id", userIds);

  if (membersError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `メンバー情報の取得に失敗しました: ${membersError.message}`
    );
  }

  // user_id -> display_name のマップを作成
  const nameMap = new Map<string, string>();
  if (members) {
    for (const m of members) {
      nameMap.set(m.user_id, m.display_name);
    }
  }

  return {
    id: expense.id,
    amount: expense.amount,
    purpose: expense.purpose,
    usage_date: expense.usage_date,
    receipt_url: expense.receipt_url,
    receipt_thumbnail_url: expense.receipt_thumbnail_url,
    comment: expense.comment,
    status: expense.status as ExpenseStatus,
    applicant: {
      user_id: expense.applicant_user_id,
      display_name: nameMap.get(expense.applicant_user_id) ?? "",
    },
    approved_by: expense.approved_by
      ? {
          user_id: expense.approved_by,
          display_name: nameMap.get(expense.approved_by) ?? "",
        }
      : null,
    approved_at: expense.approved_at,
    rejected_by: expense.rejected_by
      ? {
          user_id: expense.rejected_by,
          display_name: nameMap.get(expense.rejected_by) ?? "",
        }
      : null,
    rejected_at: expense.rejected_at,
    rejection_comment: expense.rejection_comment,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
  };
}

// ---------------------------------------------------------------------------
// 経費承認
// ---------------------------------------------------------------------------

/**
 * 経費を承認する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param approverId - 承認者のユーザーID
 * @returns 更新後の経費
 */
export async function approveExpense(
  supabase: SupabaseClient,
  orgId: string,
  expenseId: string,
  approverId: string
): Promise<Expense> {
  // 対象経費を取得してステータスと申請者を確認
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "経費が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取得に失敗しました: ${fetchError.message}`
    );
  }

  // ステータスがpendingであることを確認
  if (expense.status !== "pending") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "承認できるのはステータスが「申請中」の経費のみです"
    );
  }

  // 自分自身の申請は承認できない
  if (expense.applicant_user_id === approverId) {
    throw new ApiError(403, "FORBIDDEN", "自分の申請は承認できません");
  }

  // 経費を承認ステータスに更新
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("expenses")
    .update({
      status: "approved",
      approved_by: approverId,
      approved_at: now,
    })
    .eq("id", expenseId)
    .eq("org_id", orgId)
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .single();

  if (updateError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の承認に失敗しました: ${updateError.message}`
    );
  }

  // ステータスログに記録
  await insertStatusLog(expenseId, approverId, "pending", "approved");

  return updated as Expense;
}

// ---------------------------------------------------------------------------
// 経費却下
// ---------------------------------------------------------------------------

/**
 * 経費を却下する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param rejecterId - 却下者のユーザーID
 * @param comment - 却下理由
 * @returns 更新後の経費
 */
export async function rejectExpense(
  supabase: SupabaseClient,
  orgId: string,
  expenseId: string,
  rejecterId: string,
  comment: string
): Promise<Expense> {
  // 対象経費を取得してステータスと申請者を確認
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "経費が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取得に失敗しました: ${fetchError.message}`
    );
  }

  // ステータスがpendingであることを確認
  if (expense.status !== "pending") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "却下できるのはステータスが「申請中」の経費のみです"
    );
  }

  // 自分自身の申請は却下できない
  if (expense.applicant_user_id === rejecterId) {
    throw new ApiError(403, "FORBIDDEN", "自分の申請は却下できません");
  }

  // 経費を却下ステータスに更新
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("expenses")
    .update({
      status: "rejected",
      rejected_by: rejecterId,
      rejected_at: now,
      rejection_comment: comment,
    })
    .eq("id", expenseId)
    .eq("org_id", orgId)
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .single();

  if (updateError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の却下に失敗しました: ${updateError.message}`
    );
  }

  // ステータスログに記録（却下理由をコメントとして保存）
  await insertStatusLog(expenseId, rejecterId, "pending", "rejected", comment);

  return updated as Expense;
}

// ---------------------------------------------------------------------------
// 経費取り下げ
// ---------------------------------------------------------------------------

/**
 * 経費を取り下げる（論理削除）
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param userId - 操作者のユーザーID（申請者本人であること）
 * @returns 更新後の経費
 */
export async function withdrawExpense(
  supabase: SupabaseClient,
  orgId: string,
  expenseId: string,
  userId: string
): Promise<Expense> {
  // 対象経費を取得
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "経費が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取得に失敗しました: ${fetchError.message}`
    );
  }

  // ステータスがpendingであることを確認
  if (expense.status !== "pending") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "取り下げできるのはステータスが「申請中」の経費のみです"
    );
  }

  // 申請者本人であることを確認
  if (expense.applicant_user_id !== userId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "経費を取り下げできるのは申請者本人のみです"
    );
  }

  // ステータスをdeletedに更新
  const { data: updated, error: updateError } = await supabase
    .from("expenses")
    .update({ status: "deleted" })
    .eq("id", expenseId)
    .eq("org_id", orgId)
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .single();

  if (updateError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取り下げに失敗しました: ${updateError.message}`
    );
  }

  // ステータスログに記録
  await insertStatusLog(expenseId, userId, "pending", "deleted");

  return updated as Expense;
}

// ---------------------------------------------------------------------------
// 経費再申請
// ---------------------------------------------------------------------------

/**
 * 却下された経費を編集し再申請する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param userId - 操作者のユーザーID（申請者本人であること）
 * @param data - 更新する経費データ
 * @returns 更新後の経費
 */
export async function resubmitExpense(
  supabase: SupabaseClient,
  orgId: string,
  expenseId: string,
  userId: string,
  data: ResubmitExpenseData
): Promise<Expense> {
  // 対象経費を取得
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ApiError(404, "NOT_FOUND", "経費が見つかりません");
    }
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の取得に失敗しました: ${fetchError.message}`
    );
  }

  // ステータスがrejectedであることを確認
  if (expense.status !== "rejected") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "再申請できるのはステータスが「却下」の経費のみです"
    );
  }

  // 申請者本人であることを確認
  if (expense.applicant_user_id !== userId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "経費を再申請できるのは申請者本人のみです"
    );
  }

  // 経費内容を更新し、ステータスをpendingに戻す
  // 却下関連カラムをNULLにクリアする
  const { data: updated, error: updateError } = await supabase
    .from("expenses")
    .update({
      amount: data.amount,
      purpose: data.purpose,
      usage_date: data.usage_date,
      receipt_url: data.receipt_url,
      receipt_thumbnail_url: data.receipt_thumbnail_url,
      comment: data.comment ?? null,
      status: "pending",
      rejected_by: null,
      rejected_at: null,
      rejection_comment: null,
    })
    .eq("id", expenseId)
    .eq("org_id", orgId)
    .select(
      "id, org_id, applicant_user_id, amount, purpose, usage_date, receipt_url, receipt_thumbnail_url, comment, status, approved_by, approved_at, rejected_by, rejected_at, rejection_comment, created_at, updated_at"
    )
    .single();

  if (updateError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費の再申請に失敗しました: ${updateError.message}`
    );
  }

  // ステータスログに記録
  await insertStatusLog(expenseId, userId, "rejected", "pending");

  return updated as Expense;
}

// ---------------------------------------------------------------------------
// CSV出力用データ取得
// ---------------------------------------------------------------------------

/**
 * CSV出力用に経費データを取得する
 * @param supabase - サーバー用Supabaseクライアント
 * @param orgId - 組織ID
 * @param ids - 対象経費IDの配列
 * @returns CSV出力用のフラットなオブジェクト配列
 */
export async function getExpensesForCsv(
  supabase: SupabaseClient,
  orgId: string,
  ids: string[]
): Promise<ExpenseCsvRow[]> {
  if (ids.length === 0) {
    return [];
  }

  // 対象経費を取得
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select(
      "id, amount, purpose, usage_date, receipt_url, comment, applicant_user_id, approved_by, approved_at, rejected_by, rejected_at, created_at"
    )
    .eq("org_id", orgId)
    .in("id", ids);

  if (error) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `経費データの取得に失敗しました: ${error.message}`
    );
  }

  if (!expenses || expenses.length === 0) {
    return [];
  }

  // 関連ユーザーIDを収集
  const userIds = new Set<string>();
  for (const exp of expenses) {
    userIds.add(exp.applicant_user_id);
    if (exp.approved_by) userIds.add(exp.approved_by);
    if (exp.rejected_by) userIds.add(exp.rejected_by);
  }

  // organization_membersからdisplay_nameを取得
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id, display_name")
    .eq("org_id", orgId)
    .in("user_id", Array.from(userIds));

  if (membersError) {
    throw new ApiError(
      500,
      "DB_ERROR",
      `メンバー情報の取得に失敗しました: ${membersError.message}`
    );
  }

  // user_id -> display_name のマップを作成
  const nameMap = new Map<string, string>();
  if (members) {
    for (const m of members) {
      nameMap.set(m.user_id, m.display_name);
    }
  }

  // フラットなオブジェクト配列に整形して返す
  return expenses.map((exp) => ({
    amount: exp.amount as number,
    purpose: exp.purpose as string,
    usage_date: exp.usage_date as string,
    receipt_url: exp.receipt_url as string,
    comment: exp.comment as string | null,
    applicant_name: nameMap.get(exp.applicant_user_id) ?? "",
    created_at: exp.created_at as string,
    approver_name: exp.approved_by
      ? nameMap.get(exp.approved_by) ?? ""
      : null,
    approved_at: exp.approved_at as string | null,
    rejector_name: exp.rejected_by
      ? nameMap.get(exp.rejected_by) ?? ""
      : null,
    rejected_at: exp.rejected_at as string | null,
  }));
}
