"use client";

/**
 * ユーザー管理ページ
 * メンバー一覧を表示し、メンバー追加・ロール変更・削除の操作を提供する
 * admin ロールのみアクセス可能
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/contexts/auth-context";
import { MemberList } from "@/components/admin/member-list";
import { MemberFormDialog } from "@/components/admin/member-form";
import { Button } from "@/components/ui/button";
import type { MemberResponse } from "@/types/member";

export default function AdminMembersPage() {
  const router = useRouter();
  const { orgId, role } = useAuthContext();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  // admin以外はダッシュボードへリダイレクト
  useEffect(() => {
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  /** メンバー一覧をAPIから取得する */
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/members?include_deleted=true`
      );

      if (!response.ok) {
        throw new Error("メンバー一覧の取得に失敗しました");
      }

      const result = await response.json();
      setMembers(result.data as MemberResponse[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "メンバー一覧の取得に失敗しました";
      setError(message);
    }
  }, [orgId]);

  // 初回ロード
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      await fetchMembers();
      setIsLoading(false);
    };
    load();
  }, [fetchMembers]);

  /** 一覧を再取得する（作成・変更・削除後に呼ばれる） */
  const handleRefresh = useCallback(() => {
    fetchMembers();
  }, [fetchMembers]);

  // admin以外の場合はリダイレクト中表示
  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">リダイレクト中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <Button onClick={() => setFormDialogOpen(true)}>メンバー追加</Button>
      </div>

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ローディング表示 */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      ) : (
        <MemberList members={members} onRefresh={handleRefresh} />
      )}

      {/* メンバー作成ダイアログ */}
      <MemberFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onCreated={handleRefresh}
      />
    </div>
  );
}
