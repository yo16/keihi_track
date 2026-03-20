/**
 * 通知コンポーネントのテスト
 * NotificationBell, NotificationList の表示とインタラクションを検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockPathname = jest.fn(() => "/org-1/notifications");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// モック: fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// テスト用のAuthProviderとNotificationProviderラッパー
import {
  AuthProvider,
  type AuthContextValue,
} from "../src/lib/contexts/auth-context";
import { NotificationProvider } from "../src/lib/contexts/notification-context";

const defaultAuthValue: AuthContextValue = {
  userId: "user-1",
  displayName: "テスト太郎",
  role: "user",
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
  mockFetch.mockClear();
  mockPathname.mockReturnValue("/org-1/notifications");
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── NotificationBell ──

describe("NotificationBell", () => {
  let NotificationBell: typeof import("@/components/notifications/notification-bell").NotificationBell;

  beforeAll(async () => {
    const mod = await import(
      "../src/components/notifications/notification-bell"
    );
    NotificationBell = mod.NotificationBell;
  });

  it("ベルアイコンが表示されること", () => {
    render(
      <TestWrapper>
        <NotificationBell />
      </TestWrapper>
    );

    expect(screen.getByLabelText("通知")).toBeInTheDocument();
  });

  it("未読数が0の場合、バッジが表示されないこと", () => {
    const { container } = render(
      <TestWrapper unreadCount={0}>
        <NotificationBell />
      </TestWrapper>
    );

    const badge = container.querySelector(
      "[class*='rounded-full'][class*='bg-destructive']"
    );
    expect(badge).not.toBeInTheDocument();
  });

  it("未読数が1以上の場合、バッジに数字が表示されること", () => {
    render(
      <TestWrapper unreadCount={5}>
        <NotificationBell />
      </TestWrapper>
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("未読数が99以下の場合、そのまま数字が表示されること", () => {
    render(
      <TestWrapper unreadCount={99}>
        <NotificationBell />
      </TestWrapper>
    );

    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("未読数が100以上の場合、99+と表示されること", () => {
    render(
      <TestWrapper unreadCount={100}>
        <NotificationBell />
      </TestWrapper>
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("クリックすると通知一覧ページに遷移すること", () => {
    render(
      <TestWrapper>
        <NotificationBell />
      </TestWrapper>
    );

    act(() => {
      screen.getByLabelText("通知").click();
    });

    expect(mockPush).toHaveBeenCalledWith("/org-1/notifications");
  });
});

// ── NotificationList ──

describe("NotificationList", () => {
  let NotificationList: typeof import("@/components/notifications/notification-list").NotificationList;

  beforeAll(async () => {
    const mod = await import(
      "../src/components/notifications/notification-list"
    );
    NotificationList = mod.NotificationList;
  });

  const sampleNotifications = [
    {
      id: "n-1",
      type: "new_expense",
      message: "田中花子が経費申請を提出しました",
      expense_id: "exp-1",
      is_read: false,
      created_at: "2026-03-20T10:00:00Z",
    },
    {
      id: "n-2",
      type: "approved",
      message: "経費申請が承認されました",
      expense_id: "exp-2",
      is_read: true,
      created_at: "2026-03-19T09:00:00Z",
    },
  ];

  it("通知一覧のタイトルが表示されること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(screen.getByText("通知一覧")).toBeInTheDocument();
  });

  it("通知メッセージが表示されること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(
      screen.getByText("田中花子が経費申請を提出しました")
    ).toBeInTheDocument();
    expect(screen.getByText("経費申請が承認されました")).toBeInTheDocument();
  });

  it("未読通知はbg-blue-50の背景色で区別されること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    // 未読通知のボタンがbg-blue-50クラスを持つ
    const unreadButton = screen
      .getByText("田中花子が経費申請を提出しました")
      .closest("button");
    expect(unreadButton).toHaveClass("bg-blue-50");
  });

  it("既読通知はbg-backgroundの背景色であること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    const readButton = screen
      .getByText("経費申請が承認されました")
      .closest("button");
    expect(readButton).toHaveClass("bg-background");
  });

  it("通知が0件の場合、空メッセージが表示されること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={[]}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(screen.getByText("通知はありません")).toBeInTheDocument();
  });

  it("未読通知がある場合、全て既読にするボタンが表示されること", () => {
    render(
      <TestWrapper unreadCount={1}>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(screen.getByText("全て既読にする")).toBeInTheDocument();
  });

  it("全て既読の場合、全て既読にするボタンが表示されないこと", () => {
    const allReadNotifications = sampleNotifications.map((n) => ({
      ...n,
      is_read: true,
    }));

    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={allReadNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(screen.queryByText("全て既読にする")).not.toBeInTheDocument();
  });

  it("通知クリック時にexpense_idがある場合、経費詳細ページに遷移すること", async () => {
    // 既読化APIのレスポンスモック
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "n-1", is_read: true } }),
    });

    render(
      <TestWrapper unreadCount={1}>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    await act(async () => {
      screen
        .getByText("田中花子が経費申請を提出しました")
        .closest("button")!
        .click();
    });

    // 既読化APIが呼ばれたことを確認
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/organizations/org-1/notifications/n-1/read",
      { method: "PATCH" }
    );

    // 経費詳細ページへの遷移を確認
    expect(mockPush).toHaveBeenCalledWith("/org-1/expenses/exp-1");
  });

  it("全て既読にするボタンをクリックすると全通知が既読になること", async () => {
    // 全既読APIのレスポンスモック
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { updated_count: 1 } }),
    });

    render(
      <TestWrapper unreadCount={1}>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    await act(async () => {
      screen.getByText("全て既読にする").click();
    });

    // 全既読APIが呼ばれたことを確認
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/organizations/org-1/notifications/read-all",
      { method: "PATCH" }
    );

    // 全通知がbg-backgroundクラスになっていること（bg-blue-50が消えていること）
    await waitFor(() => {
      const buttons = screen.getAllByRole("button").filter((btn) =>
        btn.classList.contains("w-full")
      );
      buttons.forEach((btn) => {
        expect(btn).toHaveClass("bg-background");
        expect(btn).not.toHaveClass("bg-blue-50");
      });
    });
  });

  it("has_moreがtrueの場合、次のページボタンが表示されること", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: "cursor-1", has_more: true }}
        />
      </TestWrapper>
    );

    expect(screen.getByText("次のページ")).toBeInTheDocument();
  });

  it("has_moreがfalseの場合、次のページボタンが表示されないこと", () => {
    render(
      <TestWrapper>
        <NotificationList
          initialNotifications={sampleNotifications}
          initialPagination={{ next_cursor: null, has_more: false }}
        />
      </TestWrapper>
    );

    expect(screen.queryByText("次のページ")).not.toBeInTheDocument();
  });
});
