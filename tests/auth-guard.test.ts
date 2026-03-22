/**
 * 認可ガードのテスト
 */
import {
  getMemberOrFail,
  requireRole,
  requireSelf,
  requireNotSelf,
} from "../src/lib/auth/guard";
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

// ── getMemberOrFail ──

describe("getMemberOrFail", () => {
  /** Supabaseクライアントのモックを生成するヘルパー */
  function createMockSupabase(data: OrganizationMember | null, error: unknown = null) {
    return {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data, error }),
            }),
          }),
        }),
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
  }

  it("userIdのみで検索し、メンバー情報を返すこと", async () => {
    const memberData = createMember("admin");
    const supabase = createMockSupabase(memberData);

    const result = await getMemberOrFail(supabase, "user-1");

    expect(result).toEqual(memberData);
    // org_idが戻り値に含まれることを検証
    expect(result.org_id).toBe("org-1");
  });

  it("戻り値にorg_idが含まれること", async () => {
    const memberData = createMember("user");
    const supabase = createMockSupabase(memberData);

    const result = await getMemberOrFail(supabase, "user-1");

    expect(result.org_id).toBe("org-1");
    expect(result.user_id).toBe("user-1");
    expect(result.role).toBe("user");
  });

  it("メンバーが見つからない場合、403エラーをスローすること", async () => {
    const supabase = createMockSupabase(null, { message: "not found" });

    await expect(getMemberOrFail(supabase, "unknown-user")).rejects.toThrow(
      ApiError
    );

    try {
      await getMemberOrFail(supabase, "unknown-user");
      fail("エラーがスローされるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).statusCode).toBe(403);
    }
  });

  it("引数が2つ（supabase, userId）のみであること", async () => {
    // getMemberOrFailの引数の数が2であることを検証
    expect(getMemberOrFail.length).toBe(2);
  });
});

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
