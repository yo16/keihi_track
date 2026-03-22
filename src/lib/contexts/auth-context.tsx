"use client";

/**
 * 認証コンテキスト
 * ユーザー情報、ロール、組織情報をアプリケーション全体に提供する
 */
import { createContext, useContext, type ReactNode } from "react";
import type { Role, Organization } from "@/types/database";

/** AuthContextで提供するデータの型 */
export interface AuthContextValue {
  userId: string;
  displayName: string;
  role: Role;
  organization: Organization;
  orgId: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** AuthProviderのProps */
interface AuthProviderProps {
  children: ReactNode;
  value: AuthContextValue;
}

/** 認証情報をContextで提供するProvider */
export function AuthProvider({ children, value }: AuthProviderProps) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** AuthContextからユーザー情報を取得するフック */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
