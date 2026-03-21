"use client";

/**
 * サイドバーコンポーネント
 * ロール別にメニュー項目を出し分ける
 * モバイルではオーバーレイ表示
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  List,
  CheckSquare,
  BarChart3,
  Users,
  X,
} from "lucide-react";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/database";

/** メニュー項目の型定義 */
interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** このメニューを表示する最低ロール */
  minRole: Role;
}

/** ロール階層の数値マッピング */
const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  approver: 2,
  admin: 3,
};

/** ロール階層チェック */
function hasRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuthContext();

  // メニュー項目の定義（orgIdなしの固定パス）
  const menuItems: MenuItem[] = [
    {
      label: "経費申請",
      href: "/expenses/new",
      icon: <PlusCircle className="size-4" />,
      minRole: "user",
    },
    {
      label: "申請一覧",
      href: "/expenses",
      icon: <List className="size-4" />,
      minRole: "user",
    },
    {
      label: "承認待ち",
      href: "/approvals",
      icon: <CheckSquare className="size-4" />,
      minRole: "approver",
    },
    {
      label: "経費レポート",
      href: "/reports",
      icon: <BarChart3 className="size-4" />,
      minRole: "approver",
    },
    {
      label: "ユーザー管理",
      href: "/admin/members",
      icon: <Users className="size-4" />,
      minRole: "admin",
    },
  ];

  // ロールに基づいてメニューをフィルタリング
  const visibleMenuItems = menuItems.filter((item) =>
    hasRole(role, item.minRole)
  );

  // パスが現在のページにマッチするかチェック
  const isActive = (href: string) => {
    // 完全一致、または先頭一致（サブページ含む）
    if (pathname === href) return true;
    // /expenses/new は /expenses のサブパスだが、一覧とは別扱いにする
    if (href.endsWith("/new")) return pathname === href;
    // 一覧ページの場合はサブパスもマッチ
    return pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r bg-background pt-14 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:pt-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* モバイル用閉じるボタン */}
        <div className="flex items-center justify-end p-2 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="メニューを閉じる"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* メニュー一覧 */}
        <nav className="flex flex-col gap-1 p-3">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
