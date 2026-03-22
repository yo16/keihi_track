/**
 * メンバーAPI関連の型定義
 */
import type { Role } from "./database";

/** GET /api/organizations/:orgId/members のレスポンス要素 */
export interface MemberResponse {
  user_id: string;
  display_name: string;
  email: string;
  role: Role;
  deleted_at: string | null;
  created_at: string;
}

/** POST /api/organizations/:orgId/members のレスポンス */
export interface CreateMemberResponse {
  user_id: string;
  display_name: string;
  email: string;
  role: Role;
  invitation_sent: boolean;
}

/** PATCH /api/organizations/:orgId/members/:userId のレスポンス */
export interface ChangeRoleResponse {
  user_id: string;
  display_name: string;
  role: Role;
}

/** DELETE /api/organizations/:orgId/members/:userId のレスポンス */
export interface DeleteMemberResponse {
  user_id: string;
  deleted_at: string;
}
