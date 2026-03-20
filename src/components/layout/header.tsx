"use client";

/**
 * ヘッダーコンポーネント
 * ロゴ、通知ベル、ユーザーメニュー、モバイルハンバーガーメニューを表示する
 */
import { useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const { displayName } = useAuthContext();

  // 通知ポーリングを開始する
  useNotifications();

  // ログアウト処理
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
      {/* モバイル用ハンバーガーメニューボタン */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="メニューを開く"
      >
        <Menu className="size-5" />
      </Button>

      {/* ロゴ */}
      <div className="flex items-center gap-2 font-bold text-lg">
        <span className="text-primary">ケイトラ</span>
      </div>

      {/* 右側のアクション群 */}
      <div className="ml-auto flex items-center gap-2">
        {/* 通知ベルアイコン */}
        <NotificationBell />

        {/* ユーザーメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <User className="size-4" />
            <span className="hidden sm:inline">{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
