/**
 * ログイン関連のバリデーションスキーマ
 */
import { z } from "zod";

/** 汎用ログインスキーマ: 組織ID + メールアドレス + パスワード */
export const loginSchema = z.object({
  orgId: z.string().min(1, { message: "組織IDを入力してください" }),
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "正しいメールアドレスを入力してください" }),
  password: z
    .string()
    .min(1, { message: "パスワードを入力してください" }),
});

/** スキーマから推論される型 */
export type LoginInput = z.infer<typeof loginSchema>;

/** 組織専用ログインスキーマ: メールアドレス + パスワード */
export const orgLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "正しいメールアドレスを入力してください" }),
  password: z
    .string()
    .min(1, { message: "パスワードを入力してください" }),
});

/** スキーマから推論される型 */
export type OrgLoginInput = z.infer<typeof orgLoginSchema>;
