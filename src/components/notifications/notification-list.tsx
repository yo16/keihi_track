"use client";

/**
 * 通知一覧コンポーネント
 * 通知の一覧表示、既読/未読の視覚的区別、個別既読化、全既読化を提供する
 */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { useNotificationContext } from "@/lib/contexts/notification-context";
import { formatDateTime } from "@/lib/utils/format";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types/database";

/** 通知一覧で使用する通知データの型（APIレスポンスに合わせる） */
interface NotificationItem {
  id: string;
  type: string;
  message: string;
  expense_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListProps {
  /** 初期表示する通知データ */
  initialNotifications: NotificationItem[];
  /** 初期のページネーション情報 */
  initialPagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export function NotificationList({
  initialNotifications,
  initialPagination,
}: NotificationListProps) {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const { setUnreadCount, unreadCount } = useNotificationContext();

  // 通知一覧の状態管理
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // 通知をクリックした際の処理: 既読化 + 経費詳細ページへ遷移
  const handleNotificationClick = useCallback(
    async (notification: NotificationItem) => {
      // 未読の場合は既読にする
      if (!notification.is_read) {
        try {
          const response = await fetch(
            `/api/organizations/${orgId}/notifications/${notification.id}/read`,
            { method: "PATCH" }
          );
          if (response.ok) {
            // ローカルの通知状態を既読に更新
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id ? { ...n, is_read: true } : n
              )
            );
            // 未読数を1減らす
            setUnreadCount(Math.max(0, unreadCount - 1));
          }
        } catch {
          // エラー時は既読化をスキップし、遷移は行う
        }
      }

      // expense_idがある場合は経費詳細ページへ遷移
      if (notification.expense_id) {
        router.push(`/${orgId}/expenses/${notification.expense_id}`);
      }
    },
    [orgId, router, setUnreadCount, unreadCount]
  );

  // 「全て既読にする」ボタンの処理
  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAllRead(true);
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/notifications/read-all`,
        { method: "PATCH" }
      );
      if (response.ok) {
        // 全通知を既読状態に更新
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
        // 未読数を0にリセット
        setUnreadCount(0);
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [orgId, setUnreadCount]);

  // 次のページを読み込む
  const handleLoadMore = useCallback(async () => {
    if (!pagination.next_cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        cursor: pagination.next_cursor,
      });
      const response = await fetch(
        `/api/organizations/${orgId}/notifications?${params.toString()}`
      );
      if (response.ok) {
        const json = await response.json();
        // 取得した通知を既存リストの末尾に追加
        setNotifications((prev) => [...prev, ...json.data]);
        setPagination(json.pagination);
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setIsLoadingMore(false);
    }
  }, [orgId, pagination.next_cursor, isLoadingMore]);

  // 未読通知があるかを判定
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="space-y-4">
      {/* ヘッダー: タイトルと「全て既読にする」ボタン */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知一覧</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="mr-1 size-4" />
            {isMarkingAllRead ? "処理中..." : "全て既読にする"}
          </Button>
        )}
      </div>

      {/* 通知リスト */}
      {notifications.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          通知はありません
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  notification.is_read ? "bg-background" : "bg-blue-50"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* 通知メッセージ */}
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        notification.is_read
                          ? "text-muted-foreground"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {notification.message}
                    </p>
                    {/* 日時表示 */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>

                  {/* 既読アイコン */}
                  {notification.is_read && (
                    <Check className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {!notification.is_read && (
                    <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ページネーション */}
      <Pagination
        hasMore={pagination.has_more}
        onLoadMore={handleLoadMore}
        isLoading={isLoadingMore}
      />
    </div>
  );
}
