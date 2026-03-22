# 手動テストチェックリスト

## 0. 環境セットアップ（テスト前に確認）

### Supabaseダッシュボード設定
- [ ] Authentication > URL Configuration > Site URL: アプリのベースURL（開発時: `http://localhost:3000`）
- [ ] Authentication > URL Configuration > Redirect URLs: `http://localhost:3000/auth/callback` を追加
- [ ] Authentication > Email Templates > Invite User: リンクを以下に変更:
  ```
  {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to=/set-password
  ```

### 環境変数
- [ ] `.env.local` に NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY を設定
- [ ] `.env.local` に NEXT_PUBLIC_APP_URL=http://localhost:3000 を設定
- [ ] `.env.local` に RESEND_API_KEY を設定（メール通知テスト時）

### Supabase Auth カスタムSMTP（Resend）
- [ ] Settings > Authentication > SMTP Settings でResendのSMTPを設定済み

## 1. 組織作成フロー
- [ ] / にアクセス → ログインフォーム表示
- [ ] 「新規組織を作成」→ ダイアログ表示
- [ ] メール+パスワード+組織名+表示名入力 → 組織作成成功
- [ ] /dashboard にリダイレクト

## 2. メンバー招待フロー
- [ ] /admin/members → 「メンバー追加」ボタン
- [ ] メール+表示名+ロール入力 → 招待
- [ ] 「招待メールを{email}に送信しました」メッセージ表示（URL表示なし）
- [ ] 招待メールが届く

## 3. 招待ユーザーのアカウント有効化
- [ ] 招待メールのリンクをクリック
- [ ] /auth/callback?token_hash=xxx&type=invite にアクセスされる
- [ ] /set-password にリダイレクト
- [ ] パスワード入力+確認 → 設定完了
- [ ] / にリダイレクト、「パスワードが設定されました」メッセージ表示

## 4. ログインフロー
- [ ] メール+パスワード入力 → ログイン成功
- [ ] /dashboard にリダイレクト
- [ ] ロール別メニューが正しく表示

## 5. 経費申請→承認フロー
- [ ] /expenses/new → 経費申請（金額+用途+使用日+レシート+コメント）
- [ ] /expenses → 申請一覧に表示
- [ ] 承認者でログイン → /approvals → 承認待ち一覧に表示
- [ ] 経費詳細 → 承認ボタン → 承認成功
- [ ] 通知ベルに未読バッジ表示
