"use client";

/**
 * 通知ベルアイコンコンポーネント
 * 未読バッジ付きのベルアイコンを表示し、クリックで通知一覧ページへ遷移する
 */
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotificationContext } from "@/lib/contexts/notification-context";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotificationContext();

  // 通知一覧ページへ遷移する
  const handleClick = () => {
    router.push("/notifications");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="通知"
      onClick={handleClick}
    >
      <Bell className="size-5" />
      {/* 未読バッジ: 0件の場合は非表示、99以上は「99+」と表示 */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
