/**
 * Context / Hook のテスト
 * AuthContext, NotificationContext, useAuth, useOrg の動作を検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ── AuthContext ──

describe("AuthContext", () => {
  let AuthProvider: typeof import("@/lib/contexts/auth-context").AuthProvider;
  let useAuthContext: typeof import("@/lib/contexts/auth-context").useAuthContext;

  beforeAll(async () => {
    const mod = await import("../src/lib/contexts/auth-context");
    AuthProvider = mod.AuthProvider;
    useAuthContext = mod.useAuthContext;
  });

  const mockAuthValue = {
    userId: "user-123",
    displayName: "テスト太郎",
    role: "admin" as const,
    organization: {
      id: "org-123",
      name: "テスト組織",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    orgId: "org-123",
  };

  it("Providerでラップされた子コンポーネントからユーザー情報を取得できること", () => {
    function TestComponent() {
      const auth = useAuthContext();
      return (
        <div>
          <span data-testid="display-name">{auth.displayName}</span>
          <span data-testid="role">{auth.role}</span>
          <span data-testid="org-id">{auth.orgId}</span>
          <span data-testid="org-name">{auth.organization.name}</span>
        </div>
      );
    }

    render(
      <AuthProvider value={mockAuthValue}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("display-name")).toHaveTextContent("テスト太郎");
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
    expect(screen.getByTestId("org-id")).toHaveTextContent("org-123");
    expect(screen.getByTestId("org-name")).toHaveTextContent("テスト組織");
  });

  it("Providerの外でuseAuthContextを使用するとエラーがスローされること", () => {
    function TestComponent() {
      useAuthContext();
      return null;
    }

    // エラーバウンダリがないのでコンソールエラーを抑制
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      "useAuthContext must be used within an AuthProvider"
    );
    consoleSpy.mockRestore();
  });
});

// ── NotificationContext ──

describe("NotificationContext", () => {
  let NotificationProvider: typeof import("@/lib/contexts/notification-context").NotificationProvider;
  let useNotificationContext: typeof import("@/lib/contexts/notification-context").useNotificationContext;

  beforeAll(async () => {
    const mod = await import("../src/lib/contexts/notification-context");
    NotificationProvider = mod.NotificationProvider;
    useNotificationContext = mod.useNotificationContext;
  });

  it("初期未読数が0であること", () => {
    function TestComponent() {
      const { unreadCount } = useNotificationContext();
      return <span data-testid="count">{unreadCount}</span>;
    }

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("initialUnreadCountを指定できること", () => {
    function TestComponent() {
      const { unreadCount } = useNotificationContext();
      return <span data-testid="count">{unreadCount}</span>;
    }

    render(
      <NotificationProvider initialUnreadCount={5}>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });

  it("setUnreadCountで未読数を更新できること", () => {
    function TestComponent() {
      const { unreadCount, setUnreadCount } = useNotificationContext();
      return (
        <div>
          <span data-testid="count">{unreadCount}</span>
          <button onClick={() => setUnreadCount(10)}>set</button>
        </div>
      );
    }

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByText("set").click();
    });

    expect(screen.getByTestId("count")).toHaveTextContent("10");
  });

  it("incrementUnreadCountで未読数を1増やせること", () => {
    function TestComponent() {
      const { unreadCount, incrementUnreadCount } = useNotificationContext();
      return (
        <div>
          <span data-testid="count">{unreadCount}</span>
          <button onClick={incrementUnreadCount}>increment</button>
        </div>
      );
    }

    render(
      <NotificationProvider initialUnreadCount={3}>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByText("increment").click();
    });

    expect(screen.getByTestId("count")).toHaveTextContent("4");
  });

  it("resetUnreadCountで未読数を0にリセットできること", () => {
    function TestComponent() {
      const { unreadCount, resetUnreadCount } = useNotificationContext();
      return (
        <div>
          <span data-testid="count">{unreadCount}</span>
          <button onClick={resetUnreadCount}>reset</button>
        </div>
      );
    }

    render(
      <NotificationProvider initialUnreadCount={7}>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByText("reset").click();
    });

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("Providerの外でuseNotificationContextを使用するとエラーがスローされること", () => {
    function TestComponent() {
      useNotificationContext();
      return null;
    }

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      "useNotificationContext must be used within a NotificationProvider"
    );
    consoleSpy.mockRestore();
  });
});

// ── useOrg ──

describe("useOrg", () => {
  let AuthProvider: typeof import("@/lib/contexts/auth-context").AuthProvider;
  let useOrg: typeof import("@/lib/hooks/use-org").useOrg;

  beforeAll(async () => {
    const authMod = await import("../src/lib/contexts/auth-context");
    AuthProvider = authMod.AuthProvider;
    const orgMod = await import("../src/lib/hooks/use-org");
    useOrg = orgMod.useOrg;
  });

  it("orgIdと組織名を取得できること", () => {
    function TestComponent() {
      const { orgId, orgName } = useOrg();
      return (
        <div>
          <span data-testid="org-id">{orgId}</span>
          <span data-testid="org-name">{orgName}</span>
        </div>
      );
    }

    render(
      <AuthProvider
        value={{
          userId: "user-1",
          displayName: "テスト",
          role: "user",
          organization: {
            id: "org-abc",
            name: "組織ABC",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
          orgId: "org-abc",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("org-id")).toHaveTextContent("org-abc");
    expect(screen.getByTestId("org-name")).toHaveTextContent("組織ABC");
  });
});
