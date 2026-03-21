"use client";

/**
 * 招待パスワード設定ページ
 * Supabase Authの招待リンクからリダイレクトされるページ
 * URLのハッシュフラグメント（#access_token=...&type=invite）からセッションを復元し、
 * パスワード設定フォームを表示する
 * orgIdに依存しないシンプルなページ
 */

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default function SetPasswordPage() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 招待リンクのハッシュフラグメントからセッションを復元する
  useEffect(() => {
    async function initSession() {
      try {
        const supabase = createClient();

        // ハッシュフラグメントにトークンが含まれている場合、
        // Supabase クライアントが自動的にセッションを設定する
        // getSession() でセッションの存在を確認する
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setError(
            "セッションの取得に失敗しました。招待リンクを再度クリックしてください。"
          );
          return;
        }

        if (!session) {
          // セッションがない場合はハッシュフラグメントからの復元を待つ
          // onAuthStateChange で変化を検知する
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (newSession) {
              setIsReady(true);
              subscription.unsubscribe();
            }
          });

          // タイムアウト: 5秒待ってもセッションが取得できない場合はエラー
          const timeout = setTimeout(() => {
            subscription.unsubscribe();
            setError(
              "招待リンクが無効または期限切れです。管理者に再度招待を依頼してください。"
            );
          }, 5000);

          return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
          };
        }

        // セッションが既に存在する場合はフォーム表示可能
        setIsReady(true);
      } catch {
        setError("セッションの初期化中にエラーが発生しました");
      }
    }

    initSession();
  }, []);

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  // ローディング中
  if (!isReady) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">認証情報を確認中...</p>
      </div>
    );
  }

  // パスワード設定フォーム表示
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-4">
        <SetPasswordForm />
      </main>
    </div>
  );
}
