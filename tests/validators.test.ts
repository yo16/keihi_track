/**
 * バリデーションスキーマのテスト
 * 全Zodスキーマが正しいデータをパースし、不正データでエラーを返すことを確認する
 */
import {
  createExpenseSchema,
  resubmitExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
} from "../src/lib/validators/expense";
import { createMemberSchema, changeRoleSchema } from "../src/lib/validators/member";
import { createOrganizationSchema } from "../src/lib/validators/organization";
import { changePasswordSchema, loginSchema } from "../src/lib/validators/auth";

// ── 経費バリデーション ──

describe("createExpenseSchema", () => {
  const validData = {
    amount: 1500,
    purpose: "交通費",
    usage_date: "2024-01-15",
    receipt_url: "https://example.com/receipt.png",
    receipt_thumbnail_url: "https://example.com/receipt_thumb.png",
  };

  it("正常なデータをパースできること", () => {
    const result = createExpenseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("commentがoptionalであること", () => {
    const withComment = { ...validData, comment: "備考" };
    const result = createExpenseSchema.safeParse(withComment);
    expect(result.success).toBe(true);
  });

  it("amountが0の場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({ ...validData, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("amountが負の場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({ ...validData, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("amountが小数の場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({ ...validData, amount: 1.5 });
    expect(result.success).toBe(false);
  });

  it("purposeが空文字の場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({ ...validData, purpose: "" });
    expect(result.success).toBe(false);
  });

  it("usage_dateが不正な形式の場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({
      ...validData,
      usage_date: "2024/01/15",
    });
    expect(result.success).toBe(false);
  });

  it("receipt_urlが不正なURLの場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({
      ...validData,
      receipt_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("receipt_thumbnail_urlが不正なURLの場合エラーになること", () => {
    const result = createExpenseSchema.safeParse({
      ...validData,
      receipt_thumbnail_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("resubmitExpenseSchema", () => {
  it("createExpenseSchemaと同じスキーマであること", () => {
    expect(resubmitExpenseSchema).toBe(createExpenseSchema);
  });
});

describe("approveExpenseSchema", () => {
  it("コメント付きデータをパースできること", () => {
    const result = approveExpenseSchema.safeParse({ comment: "交際費として仕分け" });
    expect(result.success).toBe(true);
  });

  it("コメントなしでもパースできること（任意）", () => {
    const result = approveExpenseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("空文字のコメントでもパースできること", () => {
    const result = approveExpenseSchema.safeParse({ comment: "" });
    expect(result.success).toBe(true);
  });
});

describe("rejectExpenseSchema", () => {
  it("コメント付きデータをパースできること", () => {
    const result = rejectExpenseSchema.safeParse({ comment: "不備があります" });
    expect(result.success).toBe(true);
  });

  it("コメントが空の場合エラーになること", () => {
    const result = rejectExpenseSchema.safeParse({ comment: "" });
    expect(result.success).toBe(false);
  });

  it("コメントが未指定の場合エラーになること", () => {
    const result = rejectExpenseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── メンバーバリデーション ──

describe("createMemberSchema", () => {
  const validData = {
    email: "user@example.com",
    display_name: "テストユーザー",
    role: "user" as const,
  };

  it("正常なデータをパースできること", () => {
    const result = createMemberSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("roleがapproverでもパースできること", () => {
    const result = createMemberSchema.safeParse({
      ...validData,
      role: "approver",
    });
    expect(result.success).toBe(true);
  });

  it("roleがadminの場合エラーになること", () => {
    const result = createMemberSchema.safeParse({
      ...validData,
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("emailが不正な形式の場合エラーになること", () => {
    const result = createMemberSchema.safeParse({
      ...validData,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("passwordフィールドがスキーマに含まれないこと", () => {
    // passwordを付けてもパースは成功するが、結果にpasswordは含まれない
    const dataWithPassword = { ...validData, password: "password123" };
    const result = createMemberSchema.safeParse(dataWithPassword);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("password" in result.data).toBe(false);
    }
  });

  it("display_nameが空文字の場合エラーになること", () => {
    const result = createMemberSchema.safeParse({
      ...validData,
      display_name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("changeRoleSchema", () => {
  it("adminをパースできること", () => {
    const result = changeRoleSchema.safeParse({ role: "admin" });
    expect(result.success).toBe(true);
  });

  it("approverをパースできること", () => {
    const result = changeRoleSchema.safeParse({ role: "approver" });
    expect(result.success).toBe(true);
  });

  it("userをパースできること", () => {
    const result = changeRoleSchema.safeParse({ role: "user" });
    expect(result.success).toBe(true);
  });

  it("不正なロールの場合エラーになること", () => {
    const result = changeRoleSchema.safeParse({ role: "superadmin" });
    expect(result.success).toBe(false);
  });
});

// ── 組織バリデーション ──

describe("createOrganizationSchema", () => {
  it("正常なデータをパースできること", () => {
    const result = createOrganizationSchema.safeParse({
      name: "test-org",
      display_name: "テスト組織",
    });
    expect(result.success).toBe(true);
  });

  it("nameが空文字の場合エラーになること", () => {
    const result = createOrganizationSchema.safeParse({
      name: "",
      display_name: "テスト組織",
    });
    expect(result.success).toBe(false);
  });

  it("display_nameが空文字の場合エラーになること", () => {
    const result = createOrganizationSchema.safeParse({
      name: "test-org",
      display_name: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── 認証バリデーション ──

describe("loginSchema", () => {
  const validData = {
    email: "user@example.com",
    password: "password123",
  };

  it("正常なデータをパースできること", () => {
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
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

  it("emailが未指定の場合エラーになること", () => {
    const result = loginSchema.safeParse({ password: "password123" });
    expect(result.success).toBe(false);
  });

  it("passwordが未指定の場合エラーになること", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("orgIdフィールドが不要であること", () => {
    // orgIdを付けてもパースは成功するが、結果にorgIdは含まれない
    const dataWithOrgId = { ...validData, orgId: "test-org" };
    const result = loginSchema.safeParse(dataWithOrgId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("orgId" in result.data).toBe(false);
    }
  });
});

describe("changePasswordSchema", () => {
  it("正常なデータをパースできること", () => {
    const result = changePasswordSchema.safeParse({
      password: "newpassword123",
      password_confirm: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("パスワードが8文字未満の場合エラーになること", () => {
    const result = changePasswordSchema.safeParse({
      password: "short",
      password_confirm: "short",
    });
    expect(result.success).toBe(false);
  });

  it("パスワードが一致しない場合エラーになること", () => {
    const result = changePasswordSchema.safeParse({
      password: "password123",
      password_confirm: "different123",
    });
    expect(result.success).toBe(false);
  });
});
