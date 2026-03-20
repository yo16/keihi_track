/**
 * 組織・メンバー管理 API Route のテスト
 *
 * 各エンドポイントのハンドラが、認証・認可・バリデーション・DB操作を
 * 正しい順序で呼び出し、適切なレスポンスを返すことを検証する。
 *
 * Supabase, DB操作関数, 認可ガードはモックに置き換える。
 */

// --- モック定義 ---

// createClient のモック
const mockGetUser = jest.fn();
const mockSupabaseClient = { auth: { getUser: mockGetUser } };
jest.mock("../src/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// 認可ガードのモック
const mockGetMemberOrFail = jest.fn();
const mockRequireRole = jest.fn();
const mockRequireNotSelf = jest.fn();
jest.mock("../src/lib/auth/guard", () => ({
  getMemberOrFail: (...args: unknown[]) => mockGetMemberOrFail(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  requireSelf: jest.fn(),
  requireNotSelf: (...args: unknown[]) => mockRequireNotSelf(...args),
}));

// DB操作関数のモック
const mockCreateOrganization = jest.fn();
const mockGetOrganization = jest.fn();
jest.mock("../src/lib/db/organizations", () => ({
  createOrganization: (...args: unknown[]) => mockCreateOrganization(...args),
  getOrganization: (...args: unknown[]) => mockGetOrganization(...args),
}));

const mockGetMembers = jest.fn();
const mockCreateMember = jest.fn();
const mockGetMember = jest.fn();
const mockChangeRole = jest.fn();
const mockDeleteMember = jest.fn();
jest.mock("../src/lib/db/members", () => ({
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
  createMember: (...args: unknown[]) => mockCreateMember(...args),
  getMember: (...args: unknown[]) => mockGetMember(...args),
  changeRole: (...args: unknown[]) => mockChangeRole(...args),
  deleteMember: (...args: unknown[]) => mockDeleteMember(...args),
}));

import { NextRequest } from "next/server";

// --- ヘルパー関数 ---

/** テスト用のNextRequestを生成する */
function createRequest(method: string, url: string, body?: object): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

/** 認証済みユーザーをモックする */
function mockAuthenticatedUser(userId: string = "user-1") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

/** 未認証状態をモックする */
function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

/** adminメンバーをモックする */
function mockAdminMember(orgId: string = "org-1", userId: string = "user-1") {
  const member = {
    org_id: orgId,
    user_id: userId,
    role: "admin" as const,
    display_name: "Admin User",
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  mockGetMemberOrFail.mockResolvedValue(member);
  return member;
}

// --- テスト ---

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================
// POST /api/organizations
// ============================
describe("POST /api/organizations", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/route");
    handler = mod.POST;
  });

  const callHandler = (req: NextRequest) =>
    handler(req, { params: Promise.resolve({}) });

  it("認証済みユーザーが組織を作成できること（201）", async () => {
    mockAuthenticatedUser("user-1");
    const orgData = { id: "org-1", name: "テスト組織", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    mockCreateOrganization.mockResolvedValue(orgData);

    const req = createRequest("POST", "/api/organizations", {
      name: "テスト組織",
      display_name: "管理者",
    });
    const res = await callHandler(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("org-1");
    expect(mockCreateOrganization).toHaveBeenCalledWith("テスト組織", "管理者", "user-1");
  });

  it("未認証の場合401を返すこと", async () => {
    mockUnauthenticated();

    const req = createRequest("POST", "/api/organizations", {
      name: "テスト組織",
      display_name: "管理者",
    });
    const res = await callHandler(req);

    expect(res.status).toBe(401);
  });

  it("バリデーションエラー時に400を返すこと", async () => {
    mockAuthenticatedUser();

    // nameが空
    const req = createRequest("POST", "/api/organizations", {
      name: "",
      display_name: "管理者",
    });
    const res = await callHandler(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

// ============================
// GET /api/organizations/[orgId]
// ============================
describe("GET /api/organizations/[orgId]", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/route");
    handler = mod.GET;
  });

  it("メンバーが組織情報を取得できること（200）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    const orgData = { id: "org-1", name: "テスト組織", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    mockGetOrganization.mockResolvedValue(orgData);

    const req = createRequest("GET", "/api/organizations/org-1");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("org-1");
  });

  it("未認証の場合401を返すこと", async () => {
    mockUnauthenticated();

    const req = createRequest("GET", "/api/organizations/org-1");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(401);
  });
});

// ============================
// GET /api/organizations/[orgId]/me
// ============================
describe("GET /api/organizations/[orgId]/me", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/me/route");
    handler = mod.GET;
  });

  it("自分のメンバー情報を取得できること（200）", async () => {
    mockAuthenticatedUser("user-1");
    mockGetMember.mockResolvedValue({
      org_id: "org-1",
      user_id: "user-1",
      role: "admin",
      display_name: "テストユーザー",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const req = createRequest("GET", "/api/organizations/org-1/me");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user_id).toBe("user-1");
    expect(json.data.org_id).toBe("org-1");
    expect(json.data.role).toBe("admin");
  });

  it("メンバーでない場合404を返すこと", async () => {
    mockAuthenticatedUser("user-1");
    mockGetMember.mockResolvedValue(null);

    const req = createRequest("GET", "/api/organizations/org-1/me");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(404);
  });
});

// ============================
// GET /api/organizations/[orgId]/members
// ============================
describe("GET /api/organizations/[orgId]/members", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/members/route");
    handler = mod.GET;
  });

  it("adminがメンバー一覧を取得できること（200）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    const members = [
      { user_id: "user-1", display_name: "Admin", email: "admin@test.com", role: "admin" },
    ];
    mockGetMembers.mockResolvedValue(members);

    const req = createRequest("GET", "/api/organizations/org-1/members");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("include_deletedパラメータが渡されること", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    mockGetMembers.mockResolvedValue([]);

    const req = createRequest("GET", "/api/organizations/org-1/members?include_deleted=true");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    // getMembersが第3引数trueで呼ばれること
    expect(mockGetMembers).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      true
    );
  });
});

// ============================
// POST /api/organizations/[orgId]/members
// ============================
describe("POST /api/organizations/[orgId]/members", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/members/route");
    handler = mod.POST;
  });

  it("adminがメンバーを追加できること（201）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    mockCreateMember.mockResolvedValue({
      user_id: "user-2",
      display_name: "新メンバー",
      email: "new@test.com",
      role: "user",
      invitation_text: "招待テキスト",
    });

    const req = createRequest("POST", "/api/organizations/org-1/members", {
      email: "new@test.com",
      password: "password123",
      display_name: "新メンバー",
      role: "user",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.invitation_text).toBeDefined();
  });

  it("バリデーションエラー時に400を返すこと（パスワードが短い）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");

    const req = createRequest("POST", "/api/organizations/org-1/members", {
      email: "new@test.com",
      password: "short",
      display_name: "新メンバー",
      role: "user",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(400);
  });

  it("adminロールを指定した場合バリデーションエラーになること", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");

    const req = createRequest("POST", "/api/organizations/org-1/members", {
      email: "new@test.com",
      password: "password123",
      display_name: "新メンバー",
      role: "admin",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(400);
  });
});

// ============================
// PATCH /api/organizations/[orgId]/members/[userId]
// ============================
describe("PATCH /api/organizations/[orgId]/members/[userId]", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/members/[userId]/route");
    handler = mod.PATCH;
  });

  it("adminが他メンバーのロールを変更できること（200）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    mockRequireNotSelf.mockImplementation(() => undefined);
    mockChangeRole.mockResolvedValue({
      org_id: "org-1",
      user_id: "user-2",
      role: "approver",
      display_name: "対象ユーザー",

      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const req = createRequest("PATCH", "/api/organizations/org-1/members/user-2", {
      role: "approver",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1", userId: "user-2" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.role).toBe("approver");
  });

  it("自分自身のロール変更は403になること", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    // requireNotSelfがApiErrorをスローする
    const { ApiError } = await import("../src/lib/api/error");
    mockRequireNotSelf.mockImplementation(() => {
      throw new ApiError(403, "FORBIDDEN", "自分自身に対しては実行できません");
    });

    const req = createRequest("PATCH", "/api/organizations/org-1/members/user-1", {
      role: "user",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1", userId: "user-1" }) });

    expect(res.status).toBe(403);
  });

  it("不正なロール指定で400を返すこと", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    mockRequireNotSelf.mockImplementation(() => undefined);

    const req = createRequest("PATCH", "/api/organizations/org-1/members/user-2", {
      role: "invalid_role",
    });
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1", userId: "user-2" }) });

    expect(res.status).toBe(400);
  });
});

// ============================
// DELETE /api/organizations/[orgId]/members/[userId]
// ============================
describe("DELETE /api/organizations/[orgId]/members/[userId]", () => {
  let handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../src/app/api/organizations/[orgId]/members/[userId]/route");
    handler = mod.DELETE;
  });

  it("adminがメンバーを論理削除できること（200）", async () => {
    mockAuthenticatedUser("user-1");
    mockAdminMember("org-1", "user-1");
    mockDeleteMember.mockResolvedValue({
      org_id: "org-1",
      user_id: "user-2",
      role: "user",
      display_name: "削除対象",

      deleted_at: "2026-03-20T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-03-20T00:00:00Z",
    });

    const req = createRequest("DELETE", "/api/organizations/org-1/members/user-2");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1", userId: "user-2" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user_id).toBe("user-2");
    expect(json.data.deleted_at).toBeDefined();
  });

  it("未認証の場合401を返すこと", async () => {
    mockUnauthenticated();

    const req = createRequest("DELETE", "/api/organizations/org-1/members/user-2");
    const res = await handler(req, { params: Promise.resolve({ orgId: "org-1", userId: "user-2" }) });

    expect(res.status).toBe(401);
  });
});
