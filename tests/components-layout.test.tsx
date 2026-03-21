/**
 * レイアウトコンポーネントのテスト
 * Header, Sidebar, AppShell の表示とインタラクションを検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPathname = jest.fn(() => "/org-1/expenses");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname(),
}));

// モック: Supabaseクライアント
const mockSignOut = jest.fn().mockResolvedValue({});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

// テスト用のAuthProviderとNotificationProviderラッパー
import {
  AuthProvider,
  type AuthContextValue,
} from "../src/lib/contexts/auth-context";
import { NotificationProvider } from "../src/lib/contexts/notification-context";

const defaultAuthValue: AuthContextValue = {
  userId: "user-1",
  displayName: "テスト太郎",
  role: "admin",
  organization: {
    id: "org-1",
    name: "テスト組織",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  orgId: "org-1",
};

/** テスト用ラッパー */
function TestWrapper({
  children,
  authValue = defaultAuthValue,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  authValue?: AuthContextValue;
  unreadCount?: number;
}) {
  return (
    <AuthProvider value={authValue}>
      <NotificationProvider initialUnreadCount={unreadCount}>
        {children}
      </NotificationProvider>
    </AuthProvider>
  );
}

// 各テスト前にモックをリセット
beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSignOut.mockClear();
  mockPathname.mockReturnValue("/org-1/expenses");
});

// ── Header ──

describe("Header", () => {
  let Header: typeof import("@/components/layout/header").Header;

  beforeAll(async () => {
    const mod = await import("../src/components/layout/header");
    Header = mod.Header;
  });

  it("ロゴ「ケイトラ」が表示されること", () => {
    render(
      <TestWrapper>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("ケイトラ")).toBeInTheDocument();
  });

  it("通知ベルアイコンが表示されること", () => {
    render(
      <TestWrapper>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByLabelText("通知")).toBeInTheDocument();
  });

  it("未読数が0の場合、バッジが表示されないこと", () => {
    const { container } = render(
      <TestWrapper unreadCount={0}>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    // バッジのspan要素が存在しないことを確認
    const badge = container.querySelector(
      "[class*='rounded-full'][class*='bg-destructive']"
    );
    expect(badge).not.toBeInTheDocument();
  });

  it("未読数が1以上の場合、バッジに数字が表示されること", () => {
    render(
      <TestWrapper unreadCount={3}>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("未読数が100以上の場合、99+と表示されること", () => {
    render(
      <TestWrapper unreadCount={150}>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("ハンバーガーメニューボタンが表示されること", () => {
    render(
      <TestWrapper>
        <Header onToggleSidebar={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByLabelText("メニューを開く")).toBeInTheDocument();
  });

  it("ハンバーガーメニューをクリックするとonToggleSidebarが呼ばれること", () => {
    const onToggle = jest.fn();
    render(
      <TestWrapper>
        <Header onToggleSidebar={onToggle} />
      </TestWrapper>
    );

    act(() => {
      screen.getByLabelText("メニューを開く").click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ── Sidebar ──

describe("Sidebar", () => {
  let Sidebar: typeof import("@/components/layout/sidebar").Sidebar;

  beforeAll(async () => {
    const mod = await import("../src/components/layout/sidebar");
    Sidebar = mod.Sidebar;
  });

  it("adminロールの場合、全メニュー項目が表示されること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "admin" }}>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("経費申請")).toBeInTheDocument();
    expect(screen.getByText("申請一覧")).toBeInTheDocument();
    expect(screen.getByText("承認待ち")).toBeInTheDocument();
    expect(screen.getByText("経費レポート")).toBeInTheDocument();
    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
  });

  it("approverロールの場合、admin用メニューが非表示であること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "approver" }}>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("経費申請")).toBeInTheDocument();
    expect(screen.getByText("申請一覧")).toBeInTheDocument();
    expect(screen.getByText("承認待ち")).toBeInTheDocument();
    expect(screen.getByText("経費レポート")).toBeInTheDocument();
    expect(screen.queryByText("ユーザー管理")).not.toBeInTheDocument();
  });

  it("userロールの場合、経費申請と申請一覧のみ表示されること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "user" }}>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("経費申請")).toBeInTheDocument();
    expect(screen.getByText("申請一覧")).toBeInTheDocument();
    expect(screen.queryByText("承認待ち")).not.toBeInTheDocument();
    expect(screen.queryByText("経費レポート")).not.toBeInTheDocument();
    expect(screen.queryByText("ユーザー管理")).not.toBeInTheDocument();
  });

  it("現在のパスにマッチするメニュー項目がハイライトされること", () => {
    mockPathname.mockReturnValue("/org-1/expenses");

    render(
      <TestWrapper>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </TestWrapper>
    );

    const expensesLink = screen.getByText("申請一覧").closest("a");
    expect(expensesLink).toHaveClass("bg-muted");
  });

  it("閉じるボタンをクリックするとonCloseが呼ばれること", () => {
    const onClose = jest.fn();
    render(
      <TestWrapper>
        <Sidebar isOpen={true} onClose={onClose} />
      </TestWrapper>
    );

    act(() => {
      screen.getByLabelText("メニューを閉じる").click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("メニュー項目のリンク先が正しいこと", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "admin" }}>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText("経費申請").closest("a")).toHaveAttribute(
      "href",
      "/org-1/expenses/new"
    );
    expect(screen.getByText("申請一覧").closest("a")).toHaveAttribute(
      "href",
      "/org-1/expenses"
    );
    expect(screen.getByText("承認待ち").closest("a")).toHaveAttribute(
      "href",
      "/org-1/approvals"
    );
    expect(screen.getByText("経費レポート").closest("a")).toHaveAttribute(
      "href",
      "/org-1/reports"
    );
    expect(screen.getByText("ユーザー管理").closest("a")).toHaveAttribute(
      "href",
      "/org-1/admin/members"
    );
  });
});

// ── Dashboard redirect ──

describe("DashboardPage", () => {
  let DashboardPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import(
      "../src/app/(authenticated)/dashboard/page"
    );
    DashboardPage = mod.default;
  });

  it("userロールの場合、/{orgId}/expenses にリダイレクトすること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "user" }}>
        <DashboardPage />
      </TestWrapper>
    );

    expect(mockReplace).toHaveBeenCalledWith("/expenses");
  });

  it("approverロールの場合、/approvals にリダイレクトすること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "approver" }}>
        <DashboardPage />
      </TestWrapper>
    );

    expect(mockReplace).toHaveBeenCalledWith("/approvals");
  });

  it("adminロールの場合、/admin/members にリダイレクトすること", () => {
    render(
      <TestWrapper authValue={{ ...defaultAuthValue, role: "admin" }}>
        <DashboardPage />
      </TestWrapper>
    );

    expect(mockReplace).toHaveBeenCalledWith("/admin/members");
  });

  it("リダイレクト中の表示が出ること", () => {
    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText("リダイレクト中...")).toBeInTheDocument();
  });
});
