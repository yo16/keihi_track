/**
 * Resendクライアントの初期化
 * RESEND_API_KEY環境変数が未設定の場合はnullを返し、メール送信をスキップ可能にする
 */
import { Resend } from "resend";

/** Resendクライアントのシングルトンインスタンス（API KEYが未設定の場合はnull） */
let resendClient: Resend | null = null;
let initialized = false;

/**
 * Resendクライアントを取得する
 * 環境変数RESEND_API_KEYが設定されていればResendインスタンスを返す
 * 未設定の場合はnullを返す
 */
export function getResendClient(): Resend | null {
  if (!initialized) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      resendClient = new Resend(apiKey);
    }
    initialized = true;
  }
  return resendClient;
}
