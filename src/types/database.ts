/**
 * DBテーブルに対応する型定義
 */

/** ロール型: 組織内のユーザー権限 */
export type Role = "admin" | "approver" | "user";

/** 経費ステータス型 */
export type ExpenseStatus = "pending" | "approved" | "rejected" | "deleted";

/** 通知タイプ型 */
export type NotificationType =
  | "new_expense"
  | "approved"
  | "rejected"
  | "resubmitted";

/** 組織テーブル */
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/** 組織メンバーテーブル */
export interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 経費テーブル */
export interface Expense {
  id: string;
  org_id: string;
  applicant_user_id: string;
  amount: number;
  purpose: string;
  usage_date: string;
  receipt_url: string;
  receipt_thumbnail_url: string;
  comment: string | null;
  status: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_comment: string | null;
  approval_comment: string | null;
  created_at: string;
  updated_at: string;
}

/** 経費ステータス変更ログテーブル */
export interface ExpenseStatusLog {
  id: string;
  expense_id: string;
  changed_by: string;
  old_status: string | null;
  new_status: string;
  comment: string | null;
  created_at: string;
}

/** 通知テーブル */
export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  expense_id: string | null;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}
