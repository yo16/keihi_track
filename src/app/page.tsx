"use client";

/**
 * トップページ
 * ログインフォーム（メール + パスワード）と新規組織作成リンクを表示
 * URLのクエリパラメータ ?message= でメッセージを表示（パスワード設定完了時など）
 */

import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { CreateOrgDialog } from "@/components/auth/create-org-dialog";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-6">
        {/* ロゴアイコン */}
        <div className="flex flex-col items-center gap-1">
          <Image
            src="/keihi_track_icon.png"
            alt="ケイトラ"
            width={80}
            height={80}
            priority
          />
          <p className="text-sm text-muted-foreground">シンプル経費管理</p>
        </div>

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
