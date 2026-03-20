/**
 * 組織スコープレイアウト
 * - 認証チェック（未認証ならログインページへリダイレクト）
 * - 組織メンバー情報の取得
 * - AuthProvider / NotificationProvider でラップ
 * - ヘッダー + サイドバー + メインコンテンツのレイアウト
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/db/members";
import { getOrganization } from "@/lib/db/organizations";
import { AuthProvider, type AuthContextValue } from "@/lib/contexts/auth-context";
import { NotificationProvider } from "@/lib/contexts/notification-context";
import { AppShell } from "@/components/layout/app-shell";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgId } = await params;
  const supabase = await createClient();

  // 認証チェック: 未認証ならログインページへリダイレクト
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${orgId}/login`);
  }

  // 組織情報の取得
  let organization;
  try {
    organization = await getOrganization(supabase, orgId);
  } catch {
    // 組織が見つからない場合もログインページへ
    redirect(`/${orgId}/login`);
  }

  // メンバー情報の取得
  const member = await getMember(supabase, orgId, user.id);
  if (!member) {
    // 組織に所属していない場合はログインページへ
    redirect(`/${orgId}/login`);
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
