/**
 * 経費関連のバリデーションスキーマ
 */
import { z } from "zod";

/** 経費作成スキーマ: 金額は正の整数、目的は必須、日付はYYYY-MM-DD形式 */
export const createExpenseSchema = z.object({
  amount: z
    .number()
    .int({ message: "金額は整数で入力してください" })
    .positive({ message: "金額は正の値で入力してください" }),
  purpose: z
    .string()
    .min(1, { message: "目的を入力してください" }),
  usage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "日付はYYYY-MM-DD形式で入力してください",
    }),
  receipt_url: z
    .string()
    .url({ message: "有効なURLを入力してください" }),
  receipt_thumbnail_url: z
    .string()
    .url({ message: "有効なURLを入力してください" }),
  comment: z.string().optional(),
});

/** 経費再申請スキーマ: 作成スキーマと同じ */
export const resubmitExpenseSchema = createExpenseSchema;

/** 経費承認スキーマ: コメント任意 */
export const approveExpenseSchema = z.object({
  comment: z.string().optional(),
});

/** 経費却下スキーマ: コメント必須 */
export const rejectExpenseSchema = z.object({
  comment: z
    .string()
    .min(1, { message: "却下理由を入力してください" }),
});

/** スキーマから推論される型 */
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ResubmitExpenseInput = z.infer<typeof resubmitExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
