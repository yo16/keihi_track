"use client";

/**
 * トップページ
 * - ログインフォーム（メール + パスワード）と新規組織作成リンクを表示
 * - URLのクエリパラメータ ?message= でメッセージを表示（パスワード設定完了時など）
 * - ハッシュフラグメント #access_token=...&type=invite を検知し、/set-passwordへリダイレクト
 *   （Supabase Authの招待メールはImplicitフローを使用するため）
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginForm } from "@/components/auth/login-form";
import { CreateOrgDialog } from "@/components/auth/create-org-dialog";

export default function Home() {
  const router = useRouter();
  const [isCheckingInvite, setIsCheckingInvite] = useState(true);

  useEffect(() => {
    // ハッシュフラグメントからinvite typeを検知
    const hash = window.location.hash;
    if (hash && hash.includes("type=invite")) {
      // Supabase Authの招待リンクからのリダイレクト
      // @supabase/ssr がハッシュフラグメントからセッションを自動復元する
      const supabase = createClient();

      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          // セッション復元完了 → パスワード設定ページへ
          // ハッシュフラグメントをクリアしてからリダイレクト
          window.location.hash = "";
          router.replace("/set-password");
        }
      });

      // タイムアウト: 10秒待ってもセッションが復元されない場合
      const timeout = setTimeout(() => {
        setIsCheckingInvite(false);
      }, 10000);

      return () => clearTimeout(timeout);
    } else {
      // 通常のアクセス（招待リンクではない）
      setIsCheckingInvite(false);
    }
  }, [router]);

  // 招待リンクの処理中はローディング表示
  if (isCheckingInvite) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">認証情報を確認中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-4">
        {/* ログインフォーム（useSearchParamsを使うのでSuspenseでラップ） */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        {/* 新規組織作成リンク */}
        <CreateOrgDialog />
      </main>
    </div>
  );
}
