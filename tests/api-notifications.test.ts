/**
 * 通知 API Route のテスト
 *
 * 各エンドポイントのハンドラが、認証・認可・DB操作を
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
jest.mock("../src/lib/auth/guard", () => ({
  getMemberOrFail: (...args: unknown[]) => mockGetMemberOrFail(...args),
  requireRole: jest.fn(),
  requireSelf: jest.fn(),
  requireNotSelf: jest.fn(),
}));

// DB操作関数のモック
const mockGetNotifications = jest.fn();
const mockGetUnreadCount = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
jest.mock("../src/lib/db/notifications", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}));

import { NextRequest } from "next/server";

// --- ヘルパー関数 ---

/** テスト用のNextRequestを生成する */
function createRequest(method: string, url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method });
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
// GET /api/notifications - 通知一覧
// =============================================================================
describe("GET /api/notifications", () => {
  let GET: typeof import("../src/app/api/notifications/route").GET;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/notifications/route"
    );
    GET = mod.GET;
  });

  it("正常系: 200で通知一覧を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    const fakePaginated = {
      data: [{ id: "notif-1", message: "テスト通知" }],
      pagination: { next_cursor: null, has_more: false },
    };
    mockGetNotifications.mockResolvedValue(fakePaginated);

    const req = createRequest("GET", "/api/notifications");
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("notif-1");
  });

  it("正常系: クエリパラメータ(limit, cursor)がDB操作に渡される", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockGetNotifications.mockResolvedValue({
      data: [],
      pagination: { next_cursor: null, has_more: false },
    });

    const req = createRequest(
      "GET",
      "/api/notifications?limit=5&cursor=abc123"
    );
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    expect(mockGetNotifications).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1",
      5,
      "abc123"
    );
  });

  it("正常系: limitなしの場合undefinedが渡される", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockGetNotifications.mockResolvedValue({
      data: [],
      pagination: { next_cursor: null, has_more: false },
    });

    const req = createRequest("GET", "/api/notifications");
    await GET(req, { params: Promise.resolve({}) });

    expect(mockGetNotifications).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1",
      undefined,
      undefined
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest("GET", "/api/notifications");
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// GET /api/notifications/unread-count - 未読件数
// =============================================================================
describe("GET /api/notifications/unread-count", () => {
  let GET: typeof import("../src/app/api/notifications/unread-count/route").GET;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/notifications/unread-count/route"
    );
    GET = mod.GET;
  });

  it("正常系: 200で未読件数を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockGetUnreadCount.mockResolvedValue({ count: 3 });

    const req = createRequest(
      "GET",
      "/api/notifications/unread-count"
    );
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.count).toBe(3);
  });

  it("正常系: 未読が0件の場合", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockGetUnreadCount.mockResolvedValue({ count: 0 });

    const req = createRequest(
      "GET",
      "/api/notifications/unread-count"
    );
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.count).toBe(0);
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "GET",
      "/api/notifications/unread-count"
    );
    const res = await GET(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// PATCH /api/notifications/[notificationId]/read - 既読
// =============================================================================
describe("PATCH .../notifications/[notificationId]/read", () => {
  let PATCH: typeof import("../src/app/api/notifications/[notificationId]/read/route").PATCH;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/notifications/[notificationId]/read/route"
    );
    PATCH = mod.PATCH;
  });

  it("正常系: 200で既読にした通知を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    const fakeNotification = {
      id: "notif-1",
      is_read: true,
      message: "テスト通知",
    };
    mockMarkAsRead.mockResolvedValue(fakeNotification);

    const req = createRequest(
      "PATCH",
      "/api/notifications/notif-1/read"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ notificationId: "notif-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("notif-1");
    expect(json.data.is_read).toBe(true);
    expect(mockMarkAsRead).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "notif-1",
      "user-1"
    );
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "PATCH",
      "/api/notifications/notif-1/read"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ notificationId: "notif-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// PATCH /api/notifications/read-all - 全既読
// =============================================================================
describe("PATCH /api/notifications/read-all", () => {
  let PATCH: typeof import("../src/app/api/notifications/read-all/route").PATCH;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/api/notifications/read-all/route"
    );
    PATCH = mod.PATCH;
  });

  it("正常系: 200で更新件数を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockMarkAllAsRead.mockResolvedValue({ updated_count: 5 });

    const req = createRequest(
      "PATCH",
      "/api/notifications/read-all"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.updated_count).toBe(5);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith(
      mockSupabaseClient,
      "org-1",
      "user-1"
    );
  });

  it("正常系: 未読が0件の場合もupdated_count=0を返す", async () => {
    mockAuthenticatedUser();
    mockMember("user");
    mockMarkAllAsRead.mockResolvedValue({ updated_count: 0 });

    const req = createRequest(
      "PATCH",
      "/api/notifications/read-all"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.updated_count).toBe(0);
  });

  it("異常系: 未認証は401を返す", async () => {
    mockUnauthenticated();

    const req = createRequest(
      "PATCH",
      "/api/notifications/read-all"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(401);
  });
});
