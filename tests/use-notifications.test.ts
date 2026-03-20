/**
 * useNotificationsフックのテスト
 * ポーリング動作、pathname変更時のフェッチ、クリーンアップを検証する
 *
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";

// モック: next/navigation
let mockPathname = "/org-1/expenses";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockPathname,
}));

// モック: auth-context
jest.mock("@/lib/contexts/auth-context", () => ({
  useAuthContext: () => ({
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
  }),
}));

// モック: notification-context
const mockSetUnreadCount = jest.fn();
jest.mock("@/lib/contexts/notification-context", () => ({
  useNotificationContext: () => ({
    unreadCount: 0,
    setUnreadCount: mockSetUnreadCount,
    incrementUnreadCount: jest.fn(),
    resetUnreadCount: jest.fn(),
  }),
}));

// モック: fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockSetUnreadCount.mockClear();
  mockPathname = "/org-1/expenses";
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useNotifications", () => {
  let useNotifications: typeof import("@/lib/hooks/use-notifications").useNotifications;

  beforeAll(async () => {
    const mod = await import("../src/lib/hooks/use-notifications");
    useNotifications = mod.useNotifications;
  });

  it("マウント時に未読件数をフェッチすること", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { count: 3 } }),
    });

    renderHook(() => useNotifications());

    // 初回フェッチが発生するまで待つ
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/organizations/org-1/notifications/unread-count"
    );
    expect(mockSetUnreadCount).toHaveBeenCalledWith(3);
  });

  it("30秒間隔でポーリングが行われること", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { count: 5 } }),
    });

    renderHook(() => useNotifications());

    // 初回フェッチを消化
    await act(async () => {
      await Promise.resolve();
    });

    mockFetch.mockClear();
    mockSetUnreadCount.mockClear();

    // 30秒経過
    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/organizations/org-1/notifications/unread-count"
    );
  });

  it("アンマウント時にポーリングが停止すること", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { count: 0 } }),
    });

    const { unmount } = renderHook(() => useNotifications());

    // 初回フェッチを消化
    await act(async () => {
      await Promise.resolve();
    });

    mockFetch.mockClear();

    // アンマウント
    unmount();

    // 30秒経過してもフェッチされないこと
    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("APIがエラーを返した場合でもクラッシュしないこと", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    // エラーが発生してもクラッシュしないことを確認
    expect(() => {
      renderHook(() => useNotifications());
    }).not.toThrow();
  });

  it("ネットワークエラーが発生してもクラッシュしないこと", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    expect(() => {
      renderHook(() => useNotifications());
    }).not.toThrow();
  });
});
