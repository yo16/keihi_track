/**
 * 組織関連のバリデーションスキーマ
 */
import { z } from "zod";

/** 組織作成スキーマ: 組織名と表示名が必須 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, { message: "組織名を入力してください" }),
  display_name: z
    .string()
    .min(1, { message: "表示名を入力してください" }),
});

/** 組織作成（サインアップ込み）スキーマ: 作成パスワード+メール+パスワード+組織名+表示名 */
export const createOrganizationWithSignupSchema = z.object({
  creation_password: z
    .string()
    .min(1, { message: "作成パスワードを入力してください" }),
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "有効なメールアドレスを入力してください" }),
  password: z
    .string()
    .min(8, { message: "パスワードは8文字以上で入力してください" }),
  name: z
    .string()
    .min(1, { message: "組織名を入力してください" }),
  display_name: z
    .string()
    .min(1, { message: "表示名を入力してください" }),
});

/** スキーマから推論される型 */
export type CreateOrganizationInput = z.infer<
  typeof createOrganizationSchema
>;

export type CreateOrganizationWithSignupInput = z.infer<
  typeof createOrganizationWithSignupSchema
>;
