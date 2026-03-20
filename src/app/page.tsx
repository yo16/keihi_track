"use client";

/**
 * トップページ
 * 汎用ログインフォーム（組織ID + メール + パスワード）と新規組織作成リンクを表示
 */

import { LoginForm } from "@/components/auth/login-form";
import { CreateOrgDialog } from "@/components/auth/create-org-dialog";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-4">
        {/* ログインフォーム */}
        <LoginForm />

        {/* 新規組織作成リンク */}
        <CreateOrgDialog />
      </main>
    </div>
  );
}
