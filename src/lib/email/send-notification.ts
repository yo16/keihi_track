/**
 * 経費ステータス変更時のメール通知関数
 * Resendクライアントがnull（API KEY未設定）の場合はログ出力のみでスキップする
 */
import { getResendClient } from "./resend-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembers } from "@/lib/db/members";
import { createClient } from "@/lib/supabase/server";

// メール送信元アドレス（Resend無料プランのデフォルト）
const FROM_EMAIL = "ケイトラ <onboarding@resend.dev>";

// アプリケーションのベースURL
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// 汎用メール送信関数
// ---------------------------------------------------------------------------

interface SendNotificationParams {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

/**
 * 汎用メール送信
 * Resendクライアントがnullならスキップしてログ出力のみ行う
 */
export async function sendExpenseNotification(
  params: SendNotificationParams
): Promise<void> {
  const resend = getResendClient();

  if (!resend) {
    console.log(
      `[メール通知スキップ] RESEND_API_KEY未設定のため送信をスキップ: 件名="${params.subject}", 宛先=${params.to.join(", ")}`
    );
    return;
  }

  // 宛先が空の場合はスキップ
  if (params.to.length === 0) {
    console.log(
      `[メール通知スキップ] 送信先が0件のためスキップ: 件名="${params.subject}"`
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  if (error) {
    console.error(`[メール通知エラー] ${error.message}`, error);
  }
}

// ---------------------------------------------------------------------------
// 承認者のメールアドレス一覧を取得するヘルパー
// ---------------------------------------------------------------------------

/**
 * 組織の承認者（approver/admin）全員のメールアドレスを取得する
 */
async function getApproverEmails(orgId: string): Promise<string[]> {
  const supabase = await createClient();
  const members = await getMembers(supabase, orgId);

  // approverまたはadminロールのメンバーのemailを抽出
  return members
    .filter((m) => m.role === "approver" || m.role === "admin")
    .map((m) => m.email)
    .filter((email) => email !== "");
}

/**
 * 特定ユーザーのメールアドレスを取得する
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.getUserById(userId);

  if (error || !data?.user?.email) {
    console.error(
      `[メール通知] ユーザーのメール取得に失敗: userId=${userId}`,
      error
    );
    return null;
  }

  return data.user.email;
}

// ---------------------------------------------------------------------------
// 各種通知関数
// ---------------------------------------------------------------------------

/**
 * 新規申請通知: 承認者全員にメール送信
 * @param orgId - 組織ID
 * @param applicantName - 申請者の表示名
 */
export async function notifyNewExpense(
  orgId: string,
  applicantName: string
): Promise<void> {
  const approverEmails = await getApproverEmails(orgId);
  const loginUrl = `${getAppUrl()}/${orgId}/login`;

  const subject = `[ケイトラ] ${applicantName}さんが経費申請を提出しました`;
  const text = [
    `${applicantName}さんが新しい経費申請を提出しました。`,
    "",
    "内容を確認し、承認または却下をお願いいたします。",
    "",
    `ログインはこちら: ${loginUrl}`,
    "",
    "---",
    "このメールはケイトラから自動送信されています。",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">経費申請の通知</h2>
      <p><strong>${escapeHtml(applicantName)}</strong>さんが新しい経費申請を提出しました。</p>
      <p>内容を確認し、承認または却下をお願いいたします。</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(loginUrl)}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ケイトラにログイン
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px;" />
      <p style="color: #6b7280; font-size: 12px;">このメールはケイトラから自動送信されています。</p>
    </div>
  `;

  await sendExpenseNotification({ to: approverEmails, subject, text, html });
}

/**
 * 承認通知: 申請者にメール送信
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param applicantUserId - 申請者のユーザーID
 */
export async function notifyApproved(
  orgId: string,
  expenseId: string,
  applicantUserId: string
): Promise<void> {
  const email = await getUserEmail(applicantUserId);
  if (!email) return;

  const loginUrl = `${getAppUrl()}/${orgId}/login`;

  const subject = "[ケイトラ] 経費申請が承認されました";
  const text = [
    "あなたの経費申請が承認されました。",
    "",
    `経費ID: ${expenseId}`,
    "",
    `詳細はこちらからご確認ください: ${loginUrl}`,
    "",
    "---",
    "このメールはケイトラから自動送信されています。",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">経費申請が承認されました</h2>
      <p>あなたの経費申請が承認されました。</p>
      <p style="color: #6b7280;">経費ID: ${escapeHtml(expenseId)}</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(loginUrl)}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ケイトラにログイン
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px;" />
      <p style="color: #6b7280; font-size: 12px;">このメールはケイトラから自動送信されています。</p>
    </div>
  `;

  await sendExpenseNotification({ to: [email], subject, text, html });
}

/**
 * 却下通知: 申請者にメール送信
 * @param orgId - 組織ID
 * @param expenseId - 経費ID
 * @param applicantUserId - 申請者のユーザーID
 * @param rejectionComment - 却下理由
 */
export async function notifyRejected(
  orgId: string,
  expenseId: string,
  applicantUserId: string,
  rejectionComment: string
): Promise<void> {
  const email = await getUserEmail(applicantUserId);
  if (!email) return;

  const loginUrl = `${getAppUrl()}/${orgId}/login`;

  const subject = "[ケイトラ] 経費申請が却下されました";
  const text = [
    "あなたの経費申請が却下されました。",
    "",
    `経費ID: ${expenseId}`,
    `却下理由: ${rejectionComment}`,
    "",
    "内容を修正のうえ、再申請をお願いいたします。",
    "",
    `ログインはこちら: ${loginUrl}`,
    "",
    "---",
    "このメールはケイトラから自動送信されています。",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">経費申請が却下されました</h2>
      <p>あなたの経費申請が却下されました。</p>
      <p style="color: #6b7280;">経費ID: ${escapeHtml(expenseId)}</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold; color: #991b1b;">却下理由:</p>
        <p style="margin: 8px 0 0;">${escapeHtml(rejectionComment)}</p>
      </div>
      <p>内容を修正のうえ、再申請をお願いいたします。</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(loginUrl)}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ケイトラにログイン
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px;" />
      <p style="color: #6b7280; font-size: 12px;">このメールはケイトラから自動送信されています。</p>
    </div>
  `;

  await sendExpenseNotification({ to: [email], subject, text, html });
}

/**
 * 再申請通知: 承認者全員にメール送信
 * @param orgId - 組織ID
 * @param applicantName - 申請者の表示名
 */
export async function notifyResubmitted(
  orgId: string,
  applicantName: string
): Promise<void> {
  const approverEmails = await getApproverEmails(orgId);
  const loginUrl = `${getAppUrl()}/${orgId}/login`;

  const subject = `[ケイトラ] ${applicantName}さんが経費申請を再提出しました`;
  const text = [
    `${applicantName}さんが経費申請を再提出しました。`,
    "",
    "内容を確認し、承認または却下をお願いいたします。",
    "",
    `ログインはこちら: ${loginUrl}`,
    "",
    "---",
    "このメールはケイトラから自動送信されています。",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">経費申請の再提出通知</h2>
      <p><strong>${escapeHtml(applicantName)}</strong>さんが経費申請を再提出しました。</p>
      <p>内容を確認し、承認または却下をお願いいたします。</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(loginUrl)}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ケイトラにログイン
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px;" />
      <p style="color: #6b7280; font-size: 12px;">このメールはケイトラから自動送信されています。</p>
    </div>
  `;

  await sendExpenseNotification({ to: approverEmails, subject, text, html });
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * HTMLエスケープ（XSS対策）
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
