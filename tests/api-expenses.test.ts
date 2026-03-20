/**
 * 経費管理 API Route のテスト
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
jest.mock("../src/lib/auth/guard", () => ({
  getMemberOrFail: (...args: unknown[]) => mockGetMemberOrFail(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  requireSelf: jest.fn(),
  requireNotSelf: jest.fn(),
}));

// DB操作関数のモック
const mockCreateExpense = jest.fn();
const mockGetExpenses = jest.fn();
const mockGetExpense = jest.fn();
const mockApproveExpense = jest.fn();
const mockRejectExpense = jest.fn();
const mockWithdrawExpense = jest.fn();
const mockResubmitExpense = jest.fn();
const mockGetExpensesForCsv = jest.fn();
jest.mock("../src/lib/db/expenses", () => ({
  createExpense: (...args: unknown[]) => mockCreateExpense(...args),
  getExpenses: (...args: unknown[]) => mockGetExpenses(...args),
  getExpense: (...args: unknown[]) => mockGetExpense(...args),
  approveExpense: (...args: unknown[]) => mockApproveExpense(...args),
  rejectExpense: (...args: unknown[]) => mockRejectExpense(...args),
  withdrawExpense: (...args: unknown[]) => mockWithdrawExpense(...args),
  resubmitExpense: (...args: unknown[]) => mockResubmitExpense(...args),
  getExpensesForCsv: (...args: unknown[]) => mockGetExpensesForCsv(...args),
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

/** メンバーモック: 指定ロールのメンバーを返す */
function mockMember(role: string = "user", userId: string = "user-1") {
  mockGetMemberOrFail.mockResolvedValue({
    org_id: "org-1",
    user_id: userId,
    role,
    display_name: "テストユーザー",
    require_password_change: false,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  });
}

// --- テスト前のリセット ---

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// POST /api/organizations/[orgId]/expenses - 経費作成
// =============================================================================
describe("POST /api/organizations/[orgId]/expenses", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/route"
    );
    POST = mod.POST;
  });

  const validBody = {
    amount: 1000,
    purpose: "タクシー代",
    usage_date: "2025-06-01",
    receipt_url: "https://example.com/receipt.jpg",
    receipt_thumbnail_url: "https://example.com/receipt_thumb.jpg",
    comment: "出張移動費",
  };

  it("正常系: 201で作成された経費を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    const fakeExpense = { id: "exp-1", ...validBody, status: "pending" };
    mockCreateExpense.mockResolvedValue(fakeExpense);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses",
      validBody
    );
    const res = await POST(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("exp-1");
    expect(mockCreateExpense).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1",
      validBody
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses",
      validBody
    );
    const res = await POST(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(401);
  });

  it("異常系: バリデーションエラーは400を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");

    const req = createRequest("POST", "/api/organizations/org-1/expenses", {
      amount: -100, // 正の値でない
      purpose: "",
      usage_date: "invalid",
      receipt_url: "not-a-url",
      receipt_thumbnail_url: "not-a-url",
    });
    const res = await POST(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// GET /api/organizations/[orgId]/expenses - 経費一覧
// =============================================================================
describe("GET /api/organizations/[orgId]/expenses", () => {
  let GET: typeof import("../src/app/api/organizations/[orgId]/expenses/route").GET;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/route"
    );
    GET = mod.GET;
  });

  it("正常系: 200で経費一覧を返す", async () => {
    mockAuthenticatedUser();
    mockMember("approver");
    const fakePaginated = {
      data: [{ id: "exp-1" }],
      pagination: { next_cursor: null, has_more: false },
    };
    mockGetExpenses.mockResolvedValue(fakePaginated);

    const req = createRequest("GET", "/api/organizations/org-1/expenses");
    const res = await GET(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(mockGetExpenses).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1",
      "approver",
      expect.objectContaining({})
    );
  });

  it("正常系: クエリパラメータがDB操作に渡される", async () => {
    mockAuthenticatedUser();
    mockMember("admin");
    mockGetExpenses.mockResolvedValue({
      data: [],
      pagination: { next_cursor: null, has_more: false },
    });

    const req = createRequest(
      "GET",
      "/api/organizations/org-1/expenses?status=pending&status=approved&date_from=2025-01-01&date_to=2025-12-31&limit=10&cursor=abc"
    );
    const res = await GET(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(200);
    expect(mockGetExpenses).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1",
      "admin",
      {
        status: ["pending", "approved"],
        date_from: "2025-01-01",
        date_to: "2025-12-31",
        limit: 10,
        cursor: "abc",
      }
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest("GET", "/api/organizations/org-1/expenses");
    const res = await GET(req, { params: Promise.resolve({ orgId: "org-1" }) });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// GET /api/organizations/[orgId]/expenses/[expenseId] - 経費詳細
// =============================================================================
describe("GET /api/organizations/[orgId]/expenses/[expenseId]", () => {
  let GET: typeof import("../src/app/api/organizations/[orgId]/expenses/[expenseId]/route").GET;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/[expenseId]/route"
    );
    GET = mod.GET;
  });

  it("正常系: approverは他人の経費を閲覧できる", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");
    const fakeDetail = {
      id: "exp-1",
      applicant: { user_id: "user-2", display_name: "他ユーザー" },
    };
    mockGetExpense.mockResolvedValue(fakeDetail);

    const req = createRequest(
      "GET",
      "/api/organizations/org-1/expenses/exp-1"
    );
    const res = await GET(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("exp-1");
  });

  it("正常系: userは自分の経費を閲覧できる", async () => {
    mockAuthenticatedUser("user-1");
    mockMember("user", "user-1");
    const fakeDetail = {
      id: "exp-1",
      applicant: { user_id: "user-1", display_name: "自分" },
    };
    mockGetExpense.mockResolvedValue(fakeDetail);

    const req = createRequest(
      "GET",
      "/api/organizations/org-1/expenses/exp-1"
    );
    const res = await GET(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
  });

  it("異常系: userは他人の経費を閲覧できない（403）", async () => {
    mockAuthenticatedUser("user-1");
    mockMember("user", "user-1");
    const fakeDetail = {
      id: "exp-1",
      applicant: { user_id: "user-2", display_name: "他ユーザー" },
    };
    mockGetExpense.mockResolvedValue(fakeDetail);

    const req = createRequest(
      "GET",
      "/api/organizations/org-1/expenses/exp-1"
    );
    const res = await GET(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(403);
  });
});

// =============================================================================
// POST .../expenses/[expenseId]/approve - 経費承認
// =============================================================================
describe("POST .../expenses/[expenseId]/approve", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/[expenseId]/approve/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/[expenseId]/approve/route"
    );
    POST = mod.POST;
  });

  it("正常系: approverが承認して200を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");
    const fakeExpense = { id: "exp-1", status: "approved" };
    mockApproveExpense.mockResolvedValue(fakeExpense);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/approve"
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockApproveExpense).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "exp-1",
      "approver-1"
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/approve"
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// POST .../expenses/[expenseId]/reject - 経費却下
// =============================================================================
describe("POST .../expenses/[expenseId]/reject", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/[expenseId]/reject/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/[expenseId]/reject/route"
    );
    POST = mod.POST;
  });

  it("正常系: コメント付きで却下して200を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");
    const fakeExpense = { id: "exp-1", status: "rejected" };
    mockRejectExpense.mockResolvedValue(fakeExpense);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/reject",
      { comment: "領収書が不鮮明です" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockRejectExpense).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "exp-1",
      "approver-1",
      "領収書が不鮮明です"
    );
  });

  it("異常系: コメントなしは400を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/reject",
      { comment: "" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST .../expenses/[expenseId]/withdraw - 経費取り下げ
// =============================================================================
describe("POST .../expenses/[expenseId]/withdraw", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/[expenseId]/withdraw/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/[expenseId]/withdraw/route"
    );
    POST = mod.POST;
  });

  it("正常系: 申請者が取り下げて200を返す", async () => {
    mockAuthenticatedUser("user-1");
    mockMember("user", "user-1");
    const fakeExpense = { id: "exp-1", status: "deleted" };
    mockWithdrawExpense.mockResolvedValue(fakeExpense);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/withdraw"
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockWithdrawExpense).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "exp-1",
      "user-1"
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/withdraw"
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// POST .../expenses/[expenseId]/resubmit - 経費再申請
// =============================================================================
describe("POST .../expenses/[expenseId]/resubmit", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/[expenseId]/resubmit/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/[expenseId]/resubmit/route"
    );
    POST = mod.POST;
  });

  const validBody = {
    amount: 2000,
    purpose: "修正後タクシー代",
    usage_date: "2025-06-02",
    receipt_url: "https://example.com/receipt2.jpg",
    receipt_thumbnail_url: "https://example.com/receipt2_thumb.jpg",
  };

  it("正常系: 再申請して200を返す", async () => {
    mockAuthenticatedUser("user-1");
    mockMember("user", "user-1");
    const fakeExpense = { id: "exp-1", status: "pending" };
    mockResubmitExpense.mockResolvedValue(fakeExpense);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/resubmit",
      validBody
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockResubmitExpense).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "exp-1",
      "user-1",
      validBody
    );
  });

  it("異常系: バリデーションエラーは400を返す", async () => {
    mockAuthenticatedUser("user-1");
    mockMember("user", "user-1");

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/exp-1/resubmit",
      { amount: -1, purpose: "", usage_date: "bad", receipt_url: "x", receipt_thumbnail_url: "y" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1", expenseId: "exp-1" }),
    });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST /api/organizations/[orgId]/expenses/csv - CSV出力
// =============================================================================
describe("POST /api/organizations/[orgId]/expenses/csv", () => {
  let POST: typeof import("../src/app/api/organizations/[orgId]/expenses/csv/route").POST;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/organizations/[orgId]/expenses/csv/route"
    );
    POST = mod.POST;
  });

  it("正常系: approverがCSVデータを取得して200を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");
    const fakeRows = [{ amount: 1000, purpose: "交通費" }];
    mockGetExpensesForCsv.mockResolvedValue(fakeRows);

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/csv",
      { ids: ["exp-1", "exp-2"] }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(mockGetExpensesForCsv).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      ["exp-1", "exp-2"]
    );
  });

  it("異常系: idsが空配列は400を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/csv",
      { ids: [] }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: idsがない場合は400を返す", async () => {
    mockAuthenticatedUser("approver-1");
    mockMember("approver", "approver-1");

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/csv",
      {}
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "POST",
      "/api/organizations/org-1/expenses/csv",
      { ids: ["exp-1"] }
    );
    const res = await POST(req, {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(res.status).toBe(401);
  });
});
