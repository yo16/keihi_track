/**
 * E2Eテスト用の定数定義
 * globalSetup/globalTeardown および各テストから参照する
 */

/** テスト用組織 */
export const TEST_ORG = {
  name: "E2Eテスト組織",
  creationPassword: process.env.ORG_CREATION_PASSWORD || "test-password",
};

/** テスト用アカウント */
export const TEST_USERS = {
  admin: {
    email: "test-admin@example.com",
    password: "TestAdmin1234",
    displayName: "テスト管理者",
    role: "admin" as const,
  },
  approver: {
    email: "test-approver@example.com",
    password: "TestApprover1234",
    displayName: "テスト承認者",
    role: "approver" as const,
  },
  user: {
    email: "test-user@example.com",
    password: "TestUser1234",
    displayName: "テスト使用者",
    role: "user" as const,
  },
};

/** globalSetupで保存する共有状態のファイルパス */
export const SETUP_STATE_FILE = "./e2e/.setup-state.json";

/** 共有状態の型 */
export interface SetupState {
  orgId: string;
  users: {
    admin: { userId: string };
    approver: { userId: string };
    user: { userId: string };
  };
  expenseId?: string;
}
