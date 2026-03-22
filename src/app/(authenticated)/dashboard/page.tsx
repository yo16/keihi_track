"use client";

/**
 * ダッシュボードページ
 * ロール別に適切なページへリダイレクトする
 * - user → /expenses
 * - approver → /approvals
 * - admin → /admin/members
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { role } = useAuthContext();

  // ロールに基づいてリダイレクト先を決定
  useEffect(() => {
    switch (role) {
      case "admin":
        router.replace("/admin/members");
        break;
      case "approver":
        router.replace("/approvals");
        break;
      case "user":
      default:
        router.replace("/expenses");
        break;
    }
  }, [role, router]);

  // リダイレクト中のローディング表示
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">リダイレクト中...</p>
    </div>
  );
}
