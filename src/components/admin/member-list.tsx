"use client";

/**
 * メンバー一覧コンポーネント
 * テーブル形式でメンバーを表示し、各行にロール変更・削除のアクションを提供する
 * 自分自身の行ではアクションボタンを非表示にする
 */

import { useState, useCallback } from "react";
import { useAuthContext } from "@/lib/contexts/auth-context";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RoleChangeDialog } from "@/components/admin/role-change-dialog";
import type { Role } from "@/types/database";
import type { MemberResponse } from "@/types/member";

/** ロール表示用のバッジバリアント */
const ROLE_BADGE_VARIANT: Record<
  Role,
  "default" | "secondary" | "outline"
> = {
  admin: "default",
  approver: "secondary",
  user: "outline",
};

/** ロール表示用ラベル */
const ROLE_LABELS: Record<Role, string> = {
  admin: "管理者",
  approver: "承認者",
  user: "使用者",
};

interface MemberListProps {
  /** メンバー一覧 */
  members: MemberResponse[];
  /** メンバー一覧の再取得コールバック */
  onRefresh: () => void;
}

export function MemberList({ members, onRefresh }: MemberListProps) {
  const { userId } = useAuthContext();

  // ロール変更ダイアログの状態
  const [roleChangeTarget, setRoleChangeTarget] =
    useState<MemberResponse | null>(null);
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);

  // 削除確認ダイアログの状態
  const [deleteTarget, setDeleteTarget] = useState<MemberResponse | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** ロール変更ダイアログを開く */
  const handleOpenRoleChange = useCallback((member: MemberResponse) => {
    setRoleChangeTarget(member);
    setRoleChangeOpen(true);
  }, []);

  /** 削除確認ダイアログを開く */
  const handleOpenDeleteConfirm = useCallback((member: MemberResponse) => {
    setDeleteTarget(member);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  }, []);

  /** メンバー削除APIを呼び出す */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/members/${deleteTarget.user_id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const message =
          errorData?.error?.message || "メンバーの削除に失敗しました";
        setDeleteError(message);
        return;
      }

      // 成功時: ダイアログを閉じて一覧を更新
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      onRefresh();
    } catch {
      setDeleteError("メンバーの削除中にエラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onRefresh]);

  // メンバーが0件の場合
  if (members.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        メンバーが登録されていません。
      </p>
    );
  }

  return (
    <>
      {/* メンバー一覧テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>表示名</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            // 自分自身かどうかの判定
            const isSelf = member.user_id === userId;
            // 削除済みかどうかの判定
            const isDeleted = member.deleted_at !== null;

            return (
              <TableRow key={member.user_id}>
                <TableCell>{member.display_name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isDeleted ? (
                    <Badge variant="destructive">削除済み</Badge>
                  ) : (
                    <Badge variant="outline">アクティブ</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {/* 自分自身・削除済みメンバーにはアクションを表示しない */}
                  {!isSelf && !isDeleted && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleChange(member)}
                      >
                        ロール変更
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenDeleteConfirm(member)}
                      >
                        削除
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ロール変更ダイアログ */}
      <RoleChangeDialog
        open={roleChangeOpen}
        onOpenChange={setRoleChangeOpen}
        member={roleChangeTarget}
        onChanged={onRefresh}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>メンバー削除の確認</DialogTitle>
            <DialogDescription>
              {deleteTarget?.display_name}（{deleteTarget?.email}
              ）を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>

          {/* 削除エラー表示 */}
          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
