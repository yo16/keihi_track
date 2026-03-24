"use client";

/**
 * 承認/却下アクションコンポーネント
 * 承認者が申請中の他人の経費を承認または却下する
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApprovalActionsProps {
  /** 経費ID */
  expenseId: string;
}

/** 承認/却下アクションボタン + ダイアログ */
export function ApprovalActions({ expenseId }: ApprovalActionsProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** 承認処理 */
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const body: Record<string, string> = {};
      if (approvalComment.trim()) {
        body.comment = approvalComment.trim();
      }

      const response = await fetch(
        `/api/expenses/${expenseId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "承認に失敗しました");
      }

      // ダイアログを閉じてページをリフレッシュ
      setShowApproveDialog(false);
      setApprovalComment("");
      router.refresh();
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "承認に失敗しました";
      setError(message);
    } finally {
      setIsApproving(false);
    }
  };

  /** 却下処理 */
  const handleReject = async () => {
    // 却下理由が未入力の場合はエラー
    if (!rejectionComment.trim()) {
      setError("却下理由を入力してください");
      return;
    }

    setIsRejecting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/expenses/${expenseId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: rejectionComment.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "却下に失敗しました");
      }

      // ダイアログを閉じてページをリフレッシュ
      setShowRejectDialog(false);
      setRejectionComment("");
      router.refresh();
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "却下に失敗しました";
      setError(message);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      {/* エラーメッセージ */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 承認・却下ボタン */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowApproveDialog(true)}
          disabled={isApproving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          承認
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isRejecting}
        >
          却下
        </Button>
      </div>

      {/* 承認コメント入力ダイアログ */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費の承認</DialogTitle>
            <DialogDescription>
              この経費申請を承認します。コメントがあれば入力してください（任意）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="approval-comment">コメント（任意）</Label>
            <Textarea
              id="approval-comment"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="仕分けメモや備忘録など"
              rows={3}
            />
          </div>

          {/* ダイアログ内エラー */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setApprovalComment("");
                setError(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? "処理中..." : "承認する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 却下理由入力ダイアログ */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>却下理由の入力</DialogTitle>
            <DialogDescription>
              却下理由を入力してください（必須）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="rejection-comment">却下理由</Label>
            <Textarea
              id="rejection-comment"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="却下理由を入力してください"
              rows={3}
            />
          </div>

          {/* ダイアログ内エラー */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionComment("");
                setError(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionComment.trim()}
            >
              {isRejecting ? "処理中..." : "却下する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
