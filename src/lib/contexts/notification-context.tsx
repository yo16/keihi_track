"use client";

/**
 * 通知コンテキスト
 * 未読通知数の管理と更新関数を提供する
 * ポーリングは通知タスクで実装する
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/** NotificationContextで提供するデータの型 */
export interface NotificationContextValue {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/** NotificationProviderのProps */
interface NotificationProviderProps {
  children: ReactNode;
  initialUnreadCount?: number;
}

/** 通知情報をContextで提供するProvider */
export function NotificationProvider({
  children,
  initialUnreadCount = 0,
}: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // 未読数を1増やす
  const incrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  // 未読数をリセットする
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        incrementUnreadCount,
        resetUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/** NotificationContextから通知情報を取得するフック */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}
