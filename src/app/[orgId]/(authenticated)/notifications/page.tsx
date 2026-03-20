"use client";

/**
 * 通知一覧ページ
 * GET /api/organizations/{orgId}/notifications で通知データを取得し、
 * NotificationListコンポーネントで表示する
 */
import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { NotificationList } from "@/components/notifications/notification-list";

/** 通知一覧ページの状態 */
type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      notifications: Array<{
        id: string;
        type: string;
        message: string;
        expense_id: string | null;
        is_read: boolean;
        created_at: string;
      }>;
      pagination: {
        next_cursor: string | null;
        has_more: boolean;
      };
    };

export default function NotificationsPage() {
  const { orgId } = useAuthContext();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  // 初回マウント時に通知一覧を取得する
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `/api/organizations/${orgId}/notifications`
        );
        if (!response.ok) {
          setPageState({
            status: "error",
            message: "通知の取得に失敗しました",
          });
          return;
        }
        const json = await response.json();
        setPageState({
          status: "loaded",
          notifications: json.data,
          pagination: json.pagination,
        });
      } catch {
        setPageState({
          status: "error",
          message: "通知の取得に失敗しました",
        });
      }
    };

    fetchNotifications();
  }, [orgId]);

  // ローディング状態
  if (pageState.status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (pageState.status === "error") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{pageState.message}</p>
      </div>
    );
  }

  // 正常表示
  return (
    <NotificationList
      initialNotifications={pageState.notifications}
      initialPagination={pageState.pagination}
    />
  );
}
