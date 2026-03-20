"use client";

/**
 * パスワード変更ページ
 * 初回ログイン時やパスワードリセット後にパスワード変更を強制する
 */

import { useParams } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function ChangePasswordPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-4">
        {/* パスワード変更フォーム */}
        <ChangePasswordForm orgId={orgId} />
      </main>
    </div>
  );
}
