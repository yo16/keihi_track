/**
 * 認可ガードのテスト
 */
import { requireRole, requireSelf, requireNotSelf } from "../src/lib/auth/guard";
import { ApiError } from "../src/lib/api/error";
import type { OrganizationMember } from "../src/types/database";

/** テスト用のメンバーデータを生成するヘルパー */
function createMember(
  role: "admin" | "approver" | "user"
): OrganizationMember {
  return {
    org_id: "org-1",
    user_id: "user-1",
    role,
    display_name: "テストユーザー",
    deleted_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

// ── requireRole ──

describe("requireRole", () => {
  it("adminがadminを要求された場合、エラーにならないこと", () => {
    expect(() => requireRole(createMember("admin"), "admin")).not.toThrow();
  });

  it("adminがapproverを要求された場合、エラーにならないこと", () => {
    expect(() => requireRole(createMember("admin"), "approver")).not.toThrow();
  });

  it("adminがuserを要求された場合、エラーにならないこと", () => {
    expect(() => requireRole(createMember("admin"), "user")).not.toThrow();
  });

  it("approverがapproverを要求された場合、エラーにならないこと", () => {
    expect(() =>
      requireRole(createMember("approver"), "approver")
    ).not.toThrow();
  });

  it("approverがadminを要求された場合、ApiErrorがスローされること", () => {
    expect(() => requireRole(createMember("approver"), "admin")).toThrow(
      ApiError
    );
  });

  it("userがapproverを要求された場合、ApiErrorがスローされること", () => {
    expect(() => requireRole(createMember("user"), "approver")).toThrow(
      ApiError
    );
  });

  it("userがadminを要求された場合、ApiErrorがスローされること", () => {
    expect(() => requireRole(createMember("user"), "admin")).toThrow(ApiError);
  });

  it("スローされるエラーのステータスコードが403であること", () => {
    try {
      requireRole(createMember("user"), "admin");
      fail("エラーがスローされるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).statusCode).toBe(403);
    }
  });
});

// ── requireSelf ──

describe("requireSelf", () => {
  it("同一ユーザーの場合、エラーにならないこと", () => {
    expect(() => requireSelf("user-1", "user-1")).not.toThrow();
  });

  it("異なるユーザーの場合、ApiErrorがスローされること", () => {
    expect(() => requireSelf("user-1", "user-2")).toThrow(ApiError);
  });
});

// ── requireNotSelf ──

describe("requireNotSelf", () => {
  it("異なるユーザーの場合、エラーにならないこと", () => {
    expect(() => requireNotSelf("user-1", "user-2")).not.toThrow();
  });

  it("同一ユーザーの場合、ApiErrorがスローされること", () => {
    expect(() => requireNotSelf("user-1", "user-1")).toThrow(ApiError);
  });
});
