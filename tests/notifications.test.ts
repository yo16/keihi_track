/**
 * 通知DB操作関数のテスト
 */
import { ApiError } from "../src/lib/api/error";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../src/lib/db/notifications";

// ---------------------------------------------------------------------------
// Supabaseクライアントのモック
// ---------------------------------------------------------------------------

/** モック用のクエリビルダーを生成する */
function createMockQueryBuilder(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, jest.Mock> = {};

  // チェーン可能なメソッド群
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "or",
    "order",
    "limit",
  ];
  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // 終端メソッド
  builder.single = jest.fn().mockResolvedValue({ data: null, error: null });

  // デフォルトのレスポンス値をselectに設定
  if (overrides.resolveValue !== undefined) {
    builder.select = jest.fn().mockReturnValue({
      ...builder,
      single: jest.fn().mockResolvedValue(overrides.resolveValue),
    });
    // limitの最終結果も設定
    builder.limit = jest.fn().mockResolvedValue(overrides.resolveValue);
  }

  return builder;
}

/** モック用Supabaseクライアントを生成する */
function createMockSupabase(queryBuilder: Record<string, jest.Mock>) {
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as Parameters<typeof getNotifications>[0];
}

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

describe("getNotifications", () => {
  const orgId = "org-001";
  const userId = "user-001";

  it("通知一覧を取得できること", async () => {
    const mockNotifications = [
      {
        id: "notif-001",
        org_id: orgId,
        user_id: userId,
        expense_id: "exp-001",
        type: "approved",
        message: "経費が承認されました",
        is_read: false,
        created_at: "2026-03-20T10:00:00Z",
      },
      {
        id: "notif-002",
        org_id: orgId,
        user_id: userId,
        expense_id: "exp-002",
        type: "rejected",
        message: "経費が却下されました",
        is_read: true,
        created_at: "2026-03-19T10:00:00Z",
      },
    ];

    const qb = createMockQueryBuilder();
    qb.limit = jest
      .fn()
      .mockResolvedValue({ data: mockNotifications, error: null });
    const supabase = createMockSupabase(qb);

    const result = await getNotifications(supabase, orgId, userId);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe("notif-001");
    expect(result.data[1].id).toBe("notif-002");
    expect(result.pagination.has_more).toBe(false);
    expect(result.pagination.next_cursor).toBeNull();
  });

  it("空の通知リストを取得できること", async () => {
    const qb = createMockQueryBuilder();
    qb.limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const supabase = createMockSupabase(qb);

    const result = await getNotifications(supabase, orgId, userId);

    expect(result.data).toHaveLength(0);
    expect(result.pagination.has_more).toBe(false);
    expect(result.pagination.next_cursor).toBeNull();
  });

  it("limit+1件返ったときhas_moreがtrueになること", async () => {
    // limit=2で3件返す
    const mockNotifications = [
      {
        id: "notif-001",
        org_id: orgId,
        user_id: userId,
        expense_id: null,
        type: "new_expense",
        message: "通知1",
        is_read: false,
        created_at: "2026-03-20T10:00:00Z",
      },
      {
        id: "notif-002",
        org_id: orgId,
        user_id: userId,
        expense_id: null,
        type: "new_expense",
        message: "通知2",
        is_read: false,
        created_at: "2026-03-19T10:00:00Z",
      },
      {
        id: "notif-003",
        org_id: orgId,
        user_id: userId,
        expense_id: null,
        type: "new_expense",
        message: "通知3",
        is_read: false,
        created_at: "2026-03-18T10:00:00Z",
      },
    ];

    const qb = createMockQueryBuilder();
    qb.limit = jest
      .fn()
      .mockResolvedValue({ data: mockNotifications, error: null });
    const supabase = createMockSupabase(qb);

    const result = await getNotifications(supabase, orgId, userId, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.has_more).toBe(true);
    expect(result.pagination.next_cursor).not.toBeNull();
  });

  it("カーソルが指定された場合orフィルターが適用されること", async () => {
    const qb = createMockQueryBuilder();
    qb.limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const supabase = createMockSupabase(qb);

    const cursor = Buffer.from("2026-03-20T10:00:00Z|notif-001").toString(
      "base64"
    );
    await getNotifications(supabase, orgId, userId, 20, cursor);

    // orメソッドが呼ばれていることを確認
    expect(qb.or).toHaveBeenCalled();
  });

  it("不正なカーソル形式でApiErrorが投げられること", async () => {
    const qb = createMockQueryBuilder();
    const supabase = createMockSupabase(qb);

    const invalidCursor = Buffer.from("invalid-cursor").toString("base64");

    await expect(
      getNotifications(supabase, orgId, userId, 20, invalidCursor)
    ).rejects.toThrow(ApiError);
  });

  it("limitが100を超える場合100に制限されること", async () => {
    const qb = createMockQueryBuilder();
    qb.limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const supabase = createMockSupabase(qb);

    await getNotifications(supabase, orgId, userId, 200);

    // limit(101)が呼ばれる（100 + 1）
    expect(qb.limit).toHaveBeenCalledWith(101);
  });

  it("DBエラー時にApiErrorが投げられること", async () => {
    const qb = createMockQueryBuilder();
    qb.limit = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });
    const supabase = createMockSupabase(qb);

    await expect(
      getNotifications(supabase, orgId, userId)
    ).rejects.toThrow(ApiError);
  });

  it("dataがnullの場合空配列を返すこと", async () => {
    const qb = createMockQueryBuilder();
    qb.limit = jest.fn().mockResolvedValue({ data: null, error: null });
    const supabase = createMockSupabase(qb);

    const result = await getNotifications(supabase, orgId, userId);

    expect(result.data).toHaveLength(0);
    expect(result.pagination.has_more).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

describe("getUnreadCount", () => {
  const orgId = "org-001";
  const userId = "user-001";

  it("未読件数を取得できること", async () => {
    const qb = createMockQueryBuilder();
    // selectにcountオプション付きの戻り値を設定
    qb.select = jest.fn().mockReturnValue(qb);
    // eqチェーン最終でcount付きレスポンスを返す
    let eqCount = 0;
    qb.eq = jest.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        // 3回目のeq（is_read=false）の後、Promiseを返す
        return Promise.resolve({ count: 5, error: null });
      }
      return qb;
    });
    const supabase = createMockSupabase(qb);

    const result = await getUnreadCount(supabase, orgId, userId);

    expect(result.count).toBe(5);
  });

  it("未読がない場合0を返すこと", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockReturnValue(qb);
    let eqCount = 0;
    qb.eq = jest.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        return Promise.resolve({ count: 0, error: null });
      }
      return qb;
    });
    const supabase = createMockSupabase(qb);

    const result = await getUnreadCount(supabase, orgId, userId);

    expect(result.count).toBe(0);
  });

  it("countがnullの場合0を返すこと", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockReturnValue(qb);
    let eqCount = 0;
    qb.eq = jest.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        return Promise.resolve({ count: null, error: null });
      }
      return qb;
    });
    const supabase = createMockSupabase(qb);

    const result = await getUnreadCount(supabase, orgId, userId);

    expect(result.count).toBe(0);
  });

  it("DBエラー時にApiErrorが投げられること", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockReturnValue(qb);
    let eqCount = 0;
    qb.eq = jest.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        return Promise.resolve({
          count: null,
          error: { message: "DB接続エラー" },
        });
      }
      return qb;
    });
    const supabase = createMockSupabase(qb);

    await expect(getUnreadCount(supabase, orgId, userId)).rejects.toThrow(
      ApiError
    );
  });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

describe("markAsRead", () => {
  const orgId = "org-001";
  const notificationId = "notif-001";
  const userId = "user-001";

  it("通知を既読に更新できること", async () => {
    const updatedNotification = {
      id: notificationId,
      org_id: orgId,
      user_id: userId,
      expense_id: "exp-001",
      type: "approved",
      message: "経費が承認されました",
      is_read: true,
      created_at: "2026-03-20T10:00:00Z",
    };

    const qb = createMockQueryBuilder();
    // update -> eq -> eq -> eq -> select -> single のチェーン
    const singleMock = jest
      .fn()
      .mockResolvedValue({ data: updatedNotification, error: null });
    qb.select = jest.fn().mockReturnValue({ single: singleMock });
    const supabase = createMockSupabase(qb);

    const result = await markAsRead(supabase, orgId, notificationId, userId);

    expect(result.id).toBe(notificationId);
    expect(result.is_read).toBe(true);
  });

  it("存在しない通知の場合ApiError(404)が投げられること", async () => {
    const qb = createMockQueryBuilder();
    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    qb.select = jest.fn().mockReturnValue({ single: singleMock });
    const supabase = createMockSupabase(qb);

    await expect(
      markAsRead(supabase, orgId, notificationId, userId)
    ).rejects.toThrow(ApiError);

    try {
      await markAsRead(supabase, orgId, notificationId, userId);
    } catch (e) {
      expect((e as ApiError).statusCode).toBe(404);
      expect((e as ApiError).code).toBe("NOT_FOUND");
    }
  });

  it("DBエラー時にApiError(500)が投げられること", async () => {
    const qb = createMockQueryBuilder();
    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "OTHER", message: "DB error" },
    });
    qb.select = jest.fn().mockReturnValue({ single: singleMock });
    const supabase = createMockSupabase(qb);

    await expect(
      markAsRead(supabase, orgId, notificationId, userId)
    ).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// markAllAsRead
// ---------------------------------------------------------------------------

describe("markAllAsRead", () => {
  const orgId = "org-001";
  const userId = "user-001";

  it("全未読通知を既読にし更新件数を返すこと", async () => {
    const updatedRows = [
      { id: "notif-001" },
      { id: "notif-002" },
      { id: "notif-003" },
    ];

    const qb = createMockQueryBuilder();
    // update -> eq -> eq -> eq -> select のチェーン
    qb.select = jest
      .fn()
      .mockResolvedValue({ data: updatedRows, error: null });
    const supabase = createMockSupabase(qb);

    const result = await markAllAsRead(supabase, orgId, userId);

    expect(result.updated_count).toBe(3);
  });

  it("未読通知がない場合0件を返すこと", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockResolvedValue({ data: [], error: null });
    const supabase = createMockSupabase(qb);

    const result = await markAllAsRead(supabase, orgId, userId);

    expect(result.updated_count).toBe(0);
  });

  it("dataがnullの場合0件を返すこと", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockResolvedValue({ data: null, error: null });
    const supabase = createMockSupabase(qb);

    const result = await markAllAsRead(supabase, orgId, userId);

    expect(result.updated_count).toBe(0);
  });

  it("DBエラー時にApiErrorが投げられること", async () => {
    const qb = createMockQueryBuilder();
    qb.select = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });
    const supabase = createMockSupabase(qb);

    await expect(markAllAsRead(supabase, orgId, userId)).rejects.toThrow(
      ApiError
    );
  });
});
