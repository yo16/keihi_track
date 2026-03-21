/**
 * パスワード設定機能のテスト
 * SetPasswordForm コンポーネントのレンダリングとインタラクションを検証する
 * orgIdに依存しない新しいバージョン
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
  let SetPasswordForm: React.ComponentType;

  beforeAll(async () => {
    const mod = await import(
      "../src/components/auth/set-password-form"
    );
    SetPasswordForm = mod.SetPasswordForm;
  });

  it("新しいパスワードとパスワード確認の入力フィールドが表示されること", () => {
    render(<SetPasswordForm />);

    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード確認")).toBeInTheDocument();
  });

  it("パスワードを設定ボタンが表示されること", () => {
    render(<SetPasswordForm />);

    expect(
      screen.getByRole("button", { name: "パスワードを設定" })
    ).toBeInTheDocument();
  });

  it("タイトルが表示されること", () => {
    render(<SetPasswordForm />);

    expect(screen.getByText("パスワード設定")).toBeInTheDocument();
  });

  it("説明文が表示されること", () => {
    render(<SetPasswordForm />);

    expect(
      screen.getByText("新しいパスワードを設定してください")
    ).toBeInTheDocument();
  });

  it("パスワードが8文字未満の場合バリデーションエラーが表示されること", async () => {
    render(<SetPasswordForm />);

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
    render(<SetPasswordForm />);

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

    render(<SetPasswordForm />);

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

  it("パスワード設定成功後トップページにリダイレクトされること", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });

    render(<SetPasswordForm />);

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
        expect.stringContaining("/?message=")
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

    render(<SetPasswordForm />);

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
      "../src/app/set-password/page"
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
