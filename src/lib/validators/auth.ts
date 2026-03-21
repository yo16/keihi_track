/**
 * 認証関連のバリデーションスキーマ
 */
import { z } from "zod";

/** パスワード変更スキーマ: 8文字以上、確認用パスワードと一致 */
export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "パスワードが一致しません",
    path: ["password_confirm"],
  });

/** スキーマから推論される型 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** ログインスキーマ: メールアドレス + パスワード（orgIdなし） */
export const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});

/** スキーマから推論される型 */
export type LoginInput = z.infer<typeof loginSchema>;
