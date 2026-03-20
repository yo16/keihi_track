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

/** スキーマから推論される型 */
export type CreateOrganizationInput = z.infer<
  typeof createOrganizationSchema
>;
