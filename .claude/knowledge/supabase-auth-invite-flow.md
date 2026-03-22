# Supabase Auth の招待メールフロー（inviteUserByEmail）

## 適用条件
- Supabase Auth を使用している
- `@supabase/ssr`（Next.js App Router 向け）を使用している
- `inviteUserByEmail` で管理者がユーザーを招待する機能がある

## 制約・注意点

### デフォルトの招待メールは Implicit フローを使う（@supabase/ssr と非互換）
- Supabase Auth のデフォルトの招待メールリンクは `/auth/v1/verify` 経由で処理され、**Implicit フロー**でリダイレクトされる
- Implicit フローでは、トークンが**ハッシュフラグメント**（`/#access_token=xxx&type=invite`）としてクライアントに渡される
- `@supabase/ssr` の `createBrowserClient` は **PKCE フロー用に設計**されており、ハッシュフラグメントからのセッション自動復元をサポートしない
- したがって、デフォルトのままでは招待リンクをクリックしても、セッションが確立されずパスワード設定画面に遷移できない

### ハッシュフラグメントはサーバーサイドで読み取れない
- ハッシュフラグメント（`#` 以降）はブラウザ内でのみ参照可能で、HTTPリクエストとしてサーバーに送信されない
- Next.js の Route Handler（`route.ts`）ではハッシュフラグメントを取得できない
- `onAuthStateChange` でセッション復元を待つ方法も、`createBrowserClient` では動作しない

### `redirect_to` パラメータの制約
- `inviteUserByEmail` の `redirectTo` オプションで指定したURLは、Supabaseダッシュボードの **Redirect URLs** に登録されていないと無視される
- 無視された場合、**Site URL**（デフォルト）にフォールバックする

## 正しい対策: メールテンプレートを変更して PKCE フロー（token_hash + verifyOtp）を使う

### 1. Supabase ダッシュボードでメールテンプレートを変更
- **Authentication > Email Templates > Invite User**
- デフォルトのリンクを以下に置き換える:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to=/set-password
```
- これにより、メール内リンクが Supabase の `/auth/v1/verify` を経由せず、アプリの `/auth/callback` に直接アクセスする
- `token_hash` がクエリパラメータで渡されるため、サーバーサイド（Route Handler）で処理可能

### 2. `/auth/callback` の Route Handler で `verifyOtp` を実行
```typescript
// src/app/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = searchParams.get("redirect_to") || "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email",
    });

    if (error) {
      return NextResponse.redirect(`${origin}/?error=...`);
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

### 3. Supabase ダッシュボードの URL Configuration
- **Site URL**: アプリのベースURL（`http://localhost:3000` 等）
- **Redirect URLs**: `/auth/callback` のフルURL（`http://localhost:3000/auth/callback`）を追加

### 4. `inviteUserByEmail` の `redirectTo` は不要
- メールテンプレートで直接 `/auth/callback` にリンクするため、`inviteUserByEmail` の `redirectTo` はメールテンプレート側の設定で上書きされる
- ただし、`data`（user_metadata）に `org_id` 等を含めることは引き続き有効

## うまくいかないアプローチ（避けるべき）

### ❌ トップページでハッシュフラグメントを検知する方式
```typescript
// これは動作しない
useEffect(() => {
  if (window.location.hash.includes("type=invite")) {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) router.replace("/set-password");
    });
  }
}, []);
```
- `createBrowserClient` はハッシュフラグメントからセッションを復元しないため、`onAuthStateChange` が発火しない
- タイムアウトまで待ってログイン画面に戻る

### ❌ `/auth/callback` の Route Handler で `code` パラメータのみ処理する方式
- デフォルトの招待メールは Implicit フローを使うため、`/auth/callback` に `code` パラメータは渡されない
- `code` がないのでトップページにフォールバックする

## テスト戦略
- メールテンプレートの変更はコードではなくダッシュボードの設定であるため、自動テストでは検証できない
- 手動テストチェックリストに以下を含めること:
  1. Supabase ダッシュボードでメールテンプレートが正しく設定されているか
  2. 招待メールのリンクが `/auth/callback?token_hash=xxx&type=invite&redirect_to=/set-password` 形式であるか
  3. リンクをクリックして `/set-password` に遷移するか
  4. パスワード設定後にトップページに「パスワードが設定されました」メッセージが表示されるか

## 背景
Supabase Auth の `inviteUserByEmail` で招待メールを送信する機能を実装した際、招待リンクをクリックしてもパスワード設定画面に遷移せず、ログイン画面が表示される問題が発生した。

当初は PKCE フロー（`/auth/callback?code=xxx`）を想定して `/auth/callback/route.ts` を実装したが、Supabase のデフォルト招待メールは Implicit フロー（`/#access_token=xxx&type=invite`）を使用しており、`/auth/callback` に到達しなかった。

次に、トップページでハッシュフラグメント（`#type=invite`）を検知して `/set-password` にリダイレクトする方式を試みた（keihi_track-ezj）が、`@supabase/ssr` の `createBrowserClient` がハッシュフラグメントからのセッション復元をサポートしないため、`onAuthStateChange` が発火せずタイムアウトした。

最終的に、Supabase ダッシュボードの**メールテンプレートを変更**し、リンクを `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to=/set-password` に書き換えることで、PKCE フロー（`token_hash` + `verifyOtp`）で処理する方式に落ち着いた（keihi_track-qg6）。この方式では `/auth/callback/route.ts` がサーバーサイドで `verifyOtp` を実行してセッションを確立し、`/set-password` にリダイレクトする。
