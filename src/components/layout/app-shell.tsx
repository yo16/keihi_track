"use client";

/**
 * アプリケーションシェル
 * ヘッダー + サイドバー + メインコンテンツのレイアウトを提供する
 * モバイルのサイドバー開閉状態を管理する
 */
import { useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // サイドバーの開閉トグル
  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // サイドバーを閉じる
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <Header onToggleSidebar={handleToggleSidebar} />

      <div className="flex flex-1">
        {/* サイドバー */}
        <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
