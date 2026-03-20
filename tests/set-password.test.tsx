/**
 * パスワード設定機能のテスト
 * SetPasswordForm コンポーネントのレンダリングとインタラクションを検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockUseParams = jest.fn(() => ({ orgId: "test-org" }));
const mockUseSearchParams = jest.fn(() => ({
  get: jest.fn(() => null),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
}));

// モック: Supabaseクライアント
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: {
    subscription: { unsubscribe: jest.fn() },
  },
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: jest.fn(),
    },
  }),
}));

// 各テスト前にモックをリセット
beforeEach(() => {
  mockPush.mockClear();
  mockGetSession.mockClear();
  mockUpdateUser.mockClear();
  mockOnAuthStateChange.mockClear();
  jest.clearAllMocks();
});

// ── SetPasswordForm ──

describe("SetPasswordForm", () => {
  let SetPasswordForm: React.ComponentType<{ orgId: string }>;

  beforeAll(async () => {
    const mod = await import(
      "../src/components/auth/set-password-form"
    );
    SetPasswordForm = mod.SetPasswordForm;
  });

  it("新しいパスワードとパスワード確認の入力フィールドが表示されること", () => {
    render(<SetPasswordForm orgId="test-org" />);

    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード確認")).toBeInTheDocument();
  });

  it("パスワードを設定ボタンが表示されること", () => {
    render(<SetPasswordForm orgId="test-org" />);

    expect(
      screen.getByRole("button", { name: "パスワードを設定" })
    ).toBeInTheDocument();
  });

  it("タイトルが表示されること", () => {
    render(<SetPasswordForm orgId="test-org" />);

    expect(screen.getByText("パスワード設定")).toBeInTheDocument();
  });

  it("説明文が表示されること", () => {
    render(<SetPasswordForm orgId="test-org" />);

    expect(
      screen.getByText("新しいパスワードを設定してください")
    ).toBeInTheDocument();
  });

  it("パスワードが8文字未満の場合バリデーションエラーが表示されること", async () => {
    render(<SetPasswordForm orgId="test-org" />);

    const passwordInput = screen.getByLabelText("新しいパスワード");
    const confirmInput = screen.getByLabelText("パスワード確認");
    const submitButton = screen.getByRole("button", {
      name: "パスワードを設定",
    });

    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmInput, { target: { value: "short" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("パスワードは8文字以上で入力してください")
      ).toBeInTheDocument();
    });
  });

  it("パスワードが一致しない場合バリデーションエラーが表示されること", async () => {
    render(<SetPasswordForm orgId="test-org" />);

    const passwordInput = screen.getByLabelText("新しいパスワード");
    const confirmInput = screen.getByLabelText("パスワード確認");
    const submitButton = screen.getByRole("button", {
      name: "パスワードを設定",
    });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "different123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("パスワードが一致しません")
      ).toBeInTheDocument();
    });
  });

  it("セッションが無効な場合エラーメッセージが表示されること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<SetPasswordForm orgId="test-org" />);

    const passwordInput = screen.getByLabelText("新しいパスワード");
    const confirmInput = screen.getByLabelText("パスワード確認");
    const submitButton = screen.getByRole("button", {
      name: "パスワードを設定",
    });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "セッションが無効です。招待リンクを再度クリックしてください。"
        )
      ).toBeInTheDocument();
    });
  });

  it("パスワード設定成功後ログインページにリダイレクトされること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });

    render(<SetPasswordForm orgId="test-org" />);

    const passwordInput = screen.getByLabelText("新しいパスワード");
    const confirmInput = screen.getByLabelText("パスワード確認");
    const submitButton = screen.getByRole("button", {
      name: "パスワードを設定",
    });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "password123",
      });
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/test-org/login?message=")
      );
    });
  });

  it("updateUserがエラーを返した場合エラーメッセージが表示されること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: "Update failed" },
    });

    render(<SetPasswordForm orgId="test-org" />);

    const passwordInput = screen.getByLabelText("新しいパスワード");
    const confirmInput = screen.getByLabelText("パスワード確認");
    const submitButton = screen.getByRole("button", {
      name: "パスワードを設定",
    });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "パスワードの設定に失敗しました: Update failed"
        )
      ).toBeInTheDocument();
    });
  });
});

// ── SetPasswordPage ──

describe("SetPasswordPage", () => {
  let SetPasswordPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/[orgId]/(public)/set-password/page"
    );
    SetPasswordPage = mod.default;
  });

  it("セッションが存在する場合パスワード設定フォームが表示されること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    render(<SetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText("パスワード設定")).toBeInTheDocument();
    });
  });

  it("セッションが取得できない場合ローディング状態が表示されること", () => {
    // getSession が解決しない状態をシミュレート
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(<SetPasswordPage />);

    expect(screen.getByText("認証情報を確認中...")).toBeInTheDocument();
  });

  it("セッションエラーの場合エラーメッセージが表示されること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Session error" },
    });

    render(<SetPasswordPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "セッションの取得に失敗しました。招待リンクを再度クリックしてください。"
        )
      ).toBeInTheDocument();
    });
  });
});

// ── ログインページのメッセージ表示 ──

describe("OrgLoginPage（メッセージ表示）", () => {
  it("messageクエリパラメータがある場合メッセージが表示されること", async () => {
    // メッセージ付きの searchParams をモック
    mockUseSearchParams.mockReturnValue({
      get: (key: string) =>
        key === "message"
          ? "パスワードが設定されました。ログインしてください。"
          : null,
    });

    // fetch のモック（組織情報取得用）
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { name: "テスト組織", display_name: "テスト組織" },
        }),
    });

    const mod = await import(
      "../src/app/[orgId]/(public)/login/page"
    );
    const OrgLoginPage = mod.default;

    render(<OrgLoginPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "パスワードが設定されました。ログインしてください。"
        )
      ).toBeInTheDocument();
    });

    // fetch モックのクリーンアップ
    (global.fetch as jest.Mock).mockRestore();
  });
});
