"use client";

/**
 * 通知ポーリングフック
 * 30秒間隔で未読通知件数をフェッチし、NotificationContextに反映する
 * ページ遷移（pathname変更）時にもフェッチを行う
 */
import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNotificationContext } from "@/lib/contexts/notification-context";

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 30_000;

export function useNotifications() {
  const { setUnreadCount } = useNotificationContext();
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 未読件数をAPIから取得してContextに反映する
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/notifications/unread-count"
      );
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      // レスポンス形式: { data: { count: number } }
      if (json?.data?.count !== undefined) {
        setUnreadCount(json.data.count);
      }
    } catch {
      // ネットワークエラー等は静かに無視する（次回ポーリングで再取得）
    }
  }, [setUnreadCount]);

  // 30秒間隔のポーリングを設定する
  useEffect(() => {
    // 初回フェッチ
    fetchUnreadCount();

    // setIntervalでポーリング開始
    intervalRef.current = setInterval(fetchUnreadCount, POLLING_INTERVAL_MS);

    // クリーンアップ: アンマウント時にポーリング停止
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchUnreadCount]);

  // ページ遷移時（pathname変更時）にもフェッチする
  useEffect(() => {
    fetchUnreadCount();
  }, [pathname, fetchUnreadCount]);
}
