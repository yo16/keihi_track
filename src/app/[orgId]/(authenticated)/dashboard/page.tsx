"use client";

/**
 * ダッシュボードページ
 * ロール別に適切なページへリダイレクトする
 * - user → /{orgId}/expenses
 * - approver → /{orgId}/approvals
 * - admin → /{orgId}/admin/members
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { role, orgId } = useAuthContext();

  // ロールに基づいてリダイレクト先を決定
  useEffect(() => {
    switch (role) {
      case "admin":
        router.replace(`/${orgId}/admin/members`);
        break;
      case "approver":
        router.replace(`/${orgId}/approvals`);
        break;
      case "user":
      default:
        router.replace(`/${orgId}/expenses`);
        break;
    }
  }, [role, orgId, router]);

  // リダイレクト中のローディング表示
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">リダイレクト中...</p>
    </div>
  );
}
