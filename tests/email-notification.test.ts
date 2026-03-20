/**
 * メール通知モジュールのテスト
 *
 * Resendクライアント、メール送信関数の動作を検証する。
 * Resend SDK、Supabase admin client、DB操作関数はモックに置き換える。
 */

// --- モック定義 ---

// Resend SDKのモック
const mockEmailsSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

// Supabase admin clientのモック
const mockGetUserById = jest.fn();
const mockAdminClient = {
  auth: {
    admin: {
      getUserById: mockGetUserById,
    },
  },
};
jest.mock("../src/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

// Supabase server clientのモック
const mockServerClient = {};
jest.mock("../src/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockServerClient)),
}));

// getMembersのモック
const mockGetMembers = jest.fn();
jest.mock("../src/lib/db/members", () => ({
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
}));

import {
  sendExpenseNotification,
  notifyNewExpense,
  notifyApproved,
  notifyRejected,
  notifyResubmitted,
} from "../src/lib/email/send-notification";

// resend-clientモジュールの内部状態をリセットするためにモック
// getResendClientの挙動はRESEND_API_KEY環境変数で制御する

// --- テスト ---

describe("resend-client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("RESEND_API_KEYが未設定の場合、getResendClientはnullを返す", async () => {
    delete process.env.RESEND_API_KEY;
    // モジュールを再読み込みして初期化状態をリセット
    const { getResendClient } = await import(
      "../src/lib/email/resend-client"
    );
    // テスト用にinitializedフラグをリセットするため、新しいモジュールインスタンスを使う
    // jest.resetModulesの後にimportするので新しいインスタンスが得られる
    const client = getResendClient();
    expect(client).toBeNull();
  });

  test("RESEND_API_KEYが設定されている場合、getResendClientはResendインスタンスを返す", async () => {
    process.env.RESEND_API_KEY = "re_test_12345";
    const { getResendClient } = await import(
      "../src/lib/email/resend-client"
    );
    const client = getResendClient();
    expect(client).not.toBeNull();
  });
});

describe("sendExpenseNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // RESEND_API_KEYを設定してResendクライアントが有効になるようにする
    process.env.RESEND_API_KEY = "re_test_12345";
  });

  test("宛先が空配列の場合はメール送信をスキップする", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await sendExpenseNotification({
      to: [],
      subject: "テスト",
      text: "テスト本文",
      html: "<p>テスト</p>",
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("notifyNewExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_12345";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  test("承認者全員にメール通知を送信する", async () => {
    // getMembersが承認者とユーザーを返すモック
    mockGetMembers.mockResolvedValue([
      { user_id: "u1", role: "admin", display_name: "管理者", email: "admin@example.com" },
      { user_id: "u2", role: "approver", display_name: "承認者A", email: "approver@example.com" },
      { user_id: "u3", role: "user", display_name: "一般ユーザー", email: "user@example.com" },
    ]);
    mockEmailsSend.mockResolvedValue({ data: { id: "msg-1" }, error: null });

    await notifyNewExpense("org-1", "田中太郎");

    // Resendのsendが呼ばれたことを確認
    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0];
    // 承認者（admin + approver）のみに送信
    expect(callArgs.to).toEqual(["admin@example.com", "approver@example.com"]);
    // 件名に申請者名が含まれる
    expect(callArgs.subject).toContain("田中太郎");
    expect(callArgs.subject).toContain("[ケイトラ]");
  });

  test("承認者が0人の場合はメール送信をスキップする", async () => {
    mockGetMembers.mockResolvedValue([
      { user_id: "u3", role: "user", display_name: "一般ユーザー", email: "user@example.com" },
    ]);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await notifyNewExpense("org-1", "田中太郎");

    // 宛先が空のためスキップされる
    expect(mockEmailsSend).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("notifyApproved", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_12345";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  test("申請者にメール通知を送信する", async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "applicant@example.com" } },
      error: null,
    });
    mockEmailsSend.mockResolvedValue({ data: { id: "msg-2" }, error: null });

    await notifyApproved("org-1", "exp-1", "user-1");

    expect(mockGetUserById).toHaveBeenCalledWith("user-1");
    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.to).toEqual(["applicant@example.com"]);
    expect(callArgs.subject).toContain("承認");
  });

  test("ユーザーのメール取得に失敗した場合はスキップする", async () => {
    mockGetUserById.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await notifyApproved("org-1", "exp-1", "user-invalid");

    expect(mockEmailsSend).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("notifyRejected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_12345";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  test("申請者に却下理由付きのメール通知を送信する", async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "applicant@example.com" } },
      error: null,
    });
    mockEmailsSend.mockResolvedValue({ data: { id: "msg-3" }, error: null });

    await notifyRejected("org-1", "exp-1", "user-1", "領収書が不鮮明です");

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.to).toEqual(["applicant@example.com"]);
    expect(callArgs.subject).toContain("却下");
    // テキスト本文に却下理由が含まれる
    expect(callArgs.text).toContain("領収書が不鮮明です");
    // HTML本文にも却下理由が含まれる
    expect(callArgs.html).toContain("領収書が不鮮明です");
  });
});

describe("notifyResubmitted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_12345";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  test("承認者全員に再申請通知を送信する", async () => {
    mockGetMembers.mockResolvedValue([
      { user_id: "u1", role: "admin", display_name: "管理者", email: "admin@example.com" },
      { user_id: "u2", role: "approver", display_name: "承認者A", email: "approver@example.com" },
    ]);
    mockEmailsSend.mockResolvedValue({ data: { id: "msg-4" }, error: null });

    await notifyResubmitted("org-1", "佐藤花子");

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.to).toEqual(["admin@example.com", "approver@example.com"]);
    expect(callArgs.subject).toContain("佐藤花子");
    expect(callArgs.subject).toContain("再提出");
  });
});

describe("メール送信エラー時の挙動", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_12345";
  });

  test("Resend APIがエラーを返した場合、例外をスローせずログ出力する", async () => {
    mockGetMembers.mockResolvedValue([
      { user_id: "u1", role: "admin", display_name: "管理者", email: "admin@example.com" },
    ]);
    mockEmailsSend.mockResolvedValue({
      data: null,
      error: { message: "Rate limit exceeded" },
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // 例外がスローされないことを確認
    await expect(notifyNewExpense("org-1", "テスト太郎")).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});
