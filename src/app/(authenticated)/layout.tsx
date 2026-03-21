/**
 * 認証済みレイアウト
 * - 認証チェック（未認証ならトップページへリダイレクト）
 * - 組織メンバー情報の取得（getMemberOrFailでorgIdを自動特定）
 * - AuthProvider / NotificationProvider でラップ
 * - ヘッダー + サイドバー + メインコンテンツのレイアウト
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMemberOrFail } from "@/lib/auth/guard";
import { getOrganization } from "@/lib/db/organizations";
import { AuthProvider, type AuthContextValue } from "@/lib/contexts/auth-context";
import { NotificationProvider } from "@/lib/contexts/notification-context";
import { AppShell } from "@/components/layout/app-shell";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const supabase = await createClient();

  // 認証チェック: 未認証ならトップページへリダイレクト
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // メンバー情報の取得（user_idのみで検索、orgIdは戻り値から取得）
  let member;
  try {
    member = await getMemberOrFail(supabase, user.id);
  } catch {
    // 組織に所属していない場合はトップページへ
    redirect("/");
  }

  // 組織情報の取得
  const orgId = member.org_id;
  let organization;
  try {
    organization = await getOrganization(supabase, orgId);
  } catch {
    // 組織が見つからない場合もトップページへ
    redirect("/");
  }

  // AuthContextに渡す値を組み立て
  const authValue: AuthContextValue = {
    userId: user.id,
    displayName: member.display_name,
    role: member.role,
    organization,
    orgId,
  };

  return (
    <AuthProvider value={authValue}>
      <NotificationProvider initialUnreadCount={0}>
        <AppShell>{children}</AppShell>
      </NotificationProvider>
    </AuthProvider>
  );
}
