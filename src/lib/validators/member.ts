/**
 * メンバー関連のバリデーションスキーマ
 */
import { z } from "zod";

/** メンバー作成スキーマ: admin以外のロールのみ指定可能
 * 招待メール方式のため、パスワードは不要 */
export const createMemberSchema = z.object({
  email: z
    .string()
    .email({ message: "有効なメールアドレスを入力してください" }),
  display_name: z
    .string()
    .min(1, { message: "表示名を入力してください" }),
  role: z.enum(["approver", "user"], {
    message: "ロールはapproverまたはuserを指定してください",
  }),
});

/** ロール変更スキーマ: 全ロール指定可能 */
export const changeRoleSchema = z.object({
  role: z.enum(["admin", "approver", "user"], {
    message: "ロールはadmin、approver、userのいずれかを指定してください",
  }),
});

/** スキーマから推論される型 */
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
