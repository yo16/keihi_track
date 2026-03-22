/**
 * 組織フック
 * AuthContextからorgIdと組織名を取得する
 */
import { useAuthContext } from "@/lib/contexts/auth-context";

/** orgIdと組織名を返すフック */
export function useOrg() {
  const { orgId, organization } = useAuthContext();
  return {
    orgId,
    orgName: organization.name,
  };
}
