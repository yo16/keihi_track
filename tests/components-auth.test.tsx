/**
 * 認証コンポーネントのテスト
 * LoginForm, OrgLoginForm, ChangePasswordForm, CreateOrgDialog の
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
const mockUseParams = jest.fn(() => ({ orgId: "test-org" }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockUseParams(),
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

  it("組織ID、メールアドレス、パスワードの入力フィールドが表示されること", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("組織ID")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
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
});

// ── OrgLoginForm ──

describe("OrgLoginForm", () => {
  let OrgLoginForm: React.ComponentType<{ orgId: string; orgName: string }>;

  beforeAll(async () => {
    const mod = await import("../src/components/auth/org-login-form");
    OrgLoginForm = mod.OrgLoginForm;
  });

  it("メールアドレスとパスワードの入力フィールドが表示されること", () => {
    render(<OrgLoginForm orgId="test-org" orgName="テスト組織" />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("組織名が表示されること", () => {
    render(<OrgLoginForm orgId="test-org" orgName="テスト組織" />);

    expect(screen.getByText("テスト組織")).toBeInTheDocument();
  });

  it("ログインボタンが表示されること", () => {
    render(<OrgLoginForm orgId="test-org" orgName="テスト組織" />);

    expect(
      screen.getByRole("button", { name: "ログイン" })
    ).toBeInTheDocument();
  });

  it("組織IDの入力フィールドは表示されないこと", () => {
    render(<OrgLoginForm orgId="test-org" orgName="テスト組織" />);

    expect(screen.queryByLabelText("組織ID")).not.toBeInTheDocument();
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
