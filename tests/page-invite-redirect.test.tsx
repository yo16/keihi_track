/**
 * トップページのハッシュフラグメント検知テスト
 * 招待リンクからのリダイレクト処理（#access_token=...&type=invite）の
 * 表示分岐を検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

// モック: Supabase client
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// モック: LoginForm（内部のuseSearchParamsなど依存を回避）
jest.mock("@/components/auth/login-form", () => ({
  LoginForm: () => <div data-testid="login-form">LoginForm</div>,
}));

// モック: CreateOrgDialog
jest.mock("@/components/auth/create-org-dialog", () => ({
  CreateOrgDialog: () => (
    <div data-testid="create-org-dialog">CreateOrgDialog</div>
  ),
}));

// 各テスト前にモックをリセット
beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockOnAuthStateChange.mockClear();
  jest.clearAllMocks();
});

describe("トップページ - ハッシュフラグメント検知", () => {
  let Home: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../src/app/page");
    Home = mod.default;
  });

  it("ハッシュフラグメント #access_token=xxx&type=invite 付きで「認証情報を確認中...」が表示されること", () => {
    // window.location.hash をモックして招待リンクを再現
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        hash: "#access_token=xxx&type=invite",
      },
    });

    render(<Home />);

    // 招待リンク処理中のローディングメッセージが表示される
    expect(screen.getByText("認証情報を確認中...")).toBeInTheDocument();

    // LoginFormは表示されない
    expect(screen.queryByTestId("login-form")).not.toBeInTheDocument();
  });

  it("ハッシュフラグメントなしでLoginFormが表示されること", () => {
    // window.location.hash を空にする（通常アクセス）
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        hash: "",
      },
    });

    render(<Home />);

    // LoginFormが表示される
    expect(screen.getByTestId("login-form")).toBeInTheDocument();

    // ローディングメッセージは表示されない
    expect(screen.queryByText("認証情報を確認中...")).not.toBeInTheDocument();
  });

  it("?message=xxx 付き＋ハッシュなしでLoginFormが表示されること", () => {
    // ハッシュなし（messageクエリパラメータは LoginForm 内部で処理される）
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        hash: "",
        search: "?message=パスワードが設定されました",
      },
    });

    render(<Home />);

    // LoginFormが表示される（メッセージ表示はLoginForm内部の責務）
    expect(screen.getByTestId("login-form")).toBeInTheDocument();

    // ローディングメッセージは表示されない
    expect(screen.queryByText("認証情報を確認中...")).not.toBeInTheDocument();
  });
});
