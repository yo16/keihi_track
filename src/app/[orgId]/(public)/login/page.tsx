"use client";

/**
 * 組織専用ログインページ
 * URLパラメータからorgIdを取得し、組織名を表示
 * メールアドレス + パスワードでログイン
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OrgLoginForm } from "@/components/auth/org-login-form";

export default function OrgLoginPage() {
  const params = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const orgId = params.orgId;

  // クエリパラメータからメッセージを取得（パスワード設定完了時など）
  const message = searchParams.get("message");

  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 組織情報を取得
  useEffect(() => {
    async function fetchOrg() {
      try {
        const response = await fetch(`/api/organizations/${orgId}`);
        if (!response.ok) {
          setError("指定された組織が見つかりません");
          return;
        }
        const data = await response.json();
        setOrgName(data.data?.display_name || data.data?.name || "組織");
      } catch {
        setError("組織情報の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrg();
  }, [orgId]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-4">
        {/* メッセージ表示（パスワード設定完了時など） */}
        {message && (
          <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded">
            {message}
          </p>
        )}
        {/* 組織専用ログインフォーム */}
        <OrgLoginForm orgId={orgId} orgName={orgName || "組織"} />
      </main>
    </div>
  );
}
