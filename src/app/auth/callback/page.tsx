"use client";

/**
 * Supabase Auth コールバックページ
 * 招待メールのリンククリック後にリダイレクトされるページ。
 * URLのハッシュフラグメントからセッションを復元し、
 * user_metadataのorg_idを取得してset-passwordページへ転送する。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // Supabaseがハッシュフラグメントからセッションを自動復元するのを待つ
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("セッション取得エラー:", sessionError);
        setError("認証処理中にエラーが発生しました。");
        return;
      }

      if (session?.user) {
        // user_metadataからorg_idを取得
        const orgId = session.user.user_metadata?.org_id;

        if (orgId) {
          // 招待ユーザー: パスワード設定ページへ
          router.replace(`/${orgId}/set-password`);
        } else {
          // org_idがない場合はトップページへ
          router.replace("/");
        }
        return;
      }

      // セッションがない場合、onAuthStateChangeで変化を待つ
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (newSession?.user) {
            const orgId = newSession.user.user_metadata?.org_id;
            if (orgId) {
              router.replace(`/${orgId}/set-password`);
            } else {
              router.replace("/");
            }
            subscription.unsubscribe();
          }
        }
      );

      // 10秒タイムアウト
      setTimeout(() => {
        subscription.unsubscribe();
        setError("認証の処理がタイムアウトしました。招待リンクが無効な可能性があります。");
      }, 10000);
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/" className="text-primary underline">トップページへ戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">認証処理中...</p>
    </div>
  );
}
