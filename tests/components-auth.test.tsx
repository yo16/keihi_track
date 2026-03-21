/**
 * 認証コンポーネントのテスト
 * LoginForm, ChangePasswordForm の
 * レンダリングと基本的なインタラクションを検証する
 *
 * 注: React Testing Library と Jest DOM のセットアップが必要
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockUseSearchParams = jest.fn(() => ({
  get: jest.fn(() => null),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockUseSearchParams(),
}));

// モック: Supabaseクライアント
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
    },
  }),
}));

// 各テスト前にモックをリセット
beforeEach(() => {
  mockPush.mockClear();
  jest.clearAllMocks();
});

// ── LoginForm ──

describe("LoginForm", () => {
  // 動的インポートでモック適用後にコンポーネントを読み込む
  let LoginForm: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../src/components/auth/login-form");
    LoginForm = mod.LoginForm;
  });

  it("メールアドレスとパスワードの入力フィールドが表示されること", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("組織IDの入力フィールドは表示されないこと", () => {
    render(<LoginForm />);

    expect(screen.queryByLabelText("組織ID")).not.toBeInTheDocument();
  });

  it("ログインボタンが表示されること", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: "ログイン" })
    ).toBeInTheDocument();
  });

  it("タイトルが表示されること", () => {
    render(<LoginForm />);

    expect(screen.getByText("ケイトラ")).toBeInTheDocument();
  });

  it("messageクエリパラメータがある場合メッセージが表示されること", () => {
    mockUseSearchParams.mockReturnValue({
      get: (key: string) =>
        key === "message"
          ? "パスワードが設定されました。ログインしてください。"
          : null,
    });

    render(<LoginForm />);

    expect(
      screen.getByText(
        "パスワードが設定されました。ログインしてください。"
      )
    ).toBeInTheDocument();
  });
});

// ── ChangePasswordForm ──

describe("ChangePasswordForm", () => {
  let ChangePasswordForm: React.ComponentType<{ orgId: string }>;

  beforeAll(async () => {
    const mod = await import("../src/components/auth/change-password-form");
    ChangePasswordForm = mod.ChangePasswordForm;
  });

  it("新しいパスワードとパスワード確認の入力フィールドが表示されること", () => {
    render(<ChangePasswordForm orgId="test-org" />);

    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード確認")).toBeInTheDocument();
  });

  it("パスワードを変更ボタンが表示されること", () => {
    render(<ChangePasswordForm orgId="test-org" />);

    expect(
      screen.getByRole("button", { name: "パスワードを変更" })
    ).toBeInTheDocument();
  });

  it("タイトルが表示されること", () => {
    render(<ChangePasswordForm orgId="test-org" />);

    expect(screen.getByText("パスワード変更")).toBeInTheDocument();
  });
});
