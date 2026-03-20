/**
 * ログインバリデーションスキーマのテスト
 * loginSchema, orgLoginSchema が正しいデータをパースし、不正データでエラーを返すことを確認する
 */
import { loginSchema, orgLoginSchema } from "../src/lib/validators/login";

// ── 汎用ログインスキーマ ──

describe("loginSchema", () => {
  const validData = {
    orgId: "test-org",
    email: "user@example.com",
    password: "password123",
  };

  it("正常なデータをパースできること", () => {
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("orgIdが空文字の場合エラーになること", () => {
    const result = loginSchema.safeParse({ ...validData, orgId: "" });
    expect(result.success).toBe(false);
  });

  it("emailが空文字の場合エラーになること", () => {
    const result = loginSchema.safeParse({ ...validData, email: "" });
    expect(result.success).toBe(false);
  });

  it("emailが不正な形式の場合エラーになること", () => {
    const result = loginSchema.safeParse({ ...validData, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("passwordが空文字の場合エラーになること", () => {
    const result = loginSchema.safeParse({ ...validData, password: "" });
    expect(result.success).toBe(false);
  });

  it("orgIdが未指定の場合エラーになること", () => {
    const { orgId: _, ...withoutOrgId } = validData;
    const result = loginSchema.safeParse(withoutOrgId);
    expect(result.success).toBe(false);
  });

  it("emailが未指定の場合エラーになること", () => {
    const { email: _, ...withoutEmail } = validData;
    const result = loginSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });

  it("passwordが未指定の場合エラーになること", () => {
    const { password: _, ...withoutPassword } = validData;
    const result = loginSchema.safeParse(withoutPassword);
    expect(result.success).toBe(false);
  });
});

// ── 組織専用ログインスキーマ ──

describe("orgLoginSchema", () => {
  const validData = {
    email: "user@example.com",
    password: "password123",
  };

  it("正常なデータをパースできること", () => {
    const result = orgLoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("emailが空文字の場合エラーになること", () => {
    const result = orgLoginSchema.safeParse({ ...validData, email: "" });
    expect(result.success).toBe(false);
  });

  it("emailが不正な形式の場合エラーになること", () => {
    const result = orgLoginSchema.safeParse({
      ...validData,
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("passwordが空文字の場合エラーになること", () => {
    const result = orgLoginSchema.safeParse({ ...validData, password: "" });
    expect(result.success).toBe(false);
  });

  it("emailが未指定の場合エラーになること", () => {
    const result = orgLoginSchema.safeParse({ password: "password123" });
    expect(result.success).toBe(false);
  });

  it("passwordが未指定の場合エラーになること", () => {
    const result = orgLoginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});
