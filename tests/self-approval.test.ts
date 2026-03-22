/**
 * 自己承認/自己却下ルールのテスト
 *
 * approveExpense / rejectExpense の自己承認制御ロジックを検証する。
 * - 承認権限者が2人以上: 自己承認/自己却下は403で拒否
 * - 承認権限者が1人のみ: 自己承認/自己却下を許可
 */

// --- モック定義 ---

// admin clientのモック（承認権限者カウント用）
const mockAdminSelect = jest.fn();
const mockAdminFrom = jest.fn(() => ({
  select: mockAdminSelect,
}));
jest.mock("../src/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockAdminFrom,
  })),
}));

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../src/lib/api/error";
import { approveExpense, rejectExpense } from "../src/lib/db/expenses";

// --- テスト用定数 ---
const ORG_ID = "org-1";
const USER_ID = "user-1";
const EXPENSE_ID = "expense-1";

// テスト用の経費レコード（自己承認のケース: applicant_user_id === approverId）
const PENDING_EXPENSE = {
  id: EXPENSE_ID,
  org_id: ORG_ID,
  applicant_user_id: USER_ID,
  amount: 1000,
  purpose: "テスト用経費",
  usage_date: "2026-03-22",
  receipt_url: "https://example.com/receipt.png",
  receipt_thumbnail_url: "https://example.com/receipt_thumb.png",
  comment: null,
  status: "pending",
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_comment: null,
  created_at: "2026-03-22T00:00:00.000Z",
  updated_at: "2026-03-22T00:00:00.000Z",
};

// 承認後の経費レコック
const APPROVED_EXPENSE = {
  ...PENDING_EXPENSE,
  status: "approved",
  approved_by: USER_ID,
  approved_at: "2026-03-22T12:00:00.000Z",
};

// 却下後の経費レコード
const REJECTED_EXPENSE = {
  ...PENDING_EXPENSE,
  status: "rejected",
  rejected_by: USER_ID,
  rejected_at: "2026-03-22T12:00:00.000Z",
  rejection_comment: "テスト却下理由",
};

// --- ヘルパー関数 ---

/** admin clientのカウントクエリをモックするチェーン設定 */
function mockAdminApproverCount(count: number, error: object | null = null) {
  const chainResult = { count, error };
  const isChain = { is: jest.fn().mockReturnValue(chainResult) };
  const inChain = { in: jest.fn().mockReturnValue(isChain) };
  const eqChain = { eq: jest.fn().mockReturnValue(inChain) };
  mockAdminSelect.mockReturnValue(eqChain);
}

/** Supabaseクライアントのモックを作成する */
function createMockSupabase(
  selectResult: { data: object | null; error: object | null },
  updateResult?: { data: object | null; error: object | null }
) {
  // updateチェーン
  const updateSingle = jest.fn().mockResolvedValue(updateResult ?? { data: null, error: null });
  const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
  const updateEq2 = jest.fn().mockReturnValue({ select: updateSelect });
  const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
  const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

  // selectチェーン（経費取得用）
  const selectSingle = jest.fn().mockResolvedValue(selectResult);
  const selectEq2 = jest.fn().mockReturnValue({ single: selectSingle });
  const selectEq1 = jest.fn().mockReturnValue({ eq: selectEq2 });
  const selectFn = jest.fn().mockReturnValue({ eq: selectEq1 });

  return {
    from: jest.fn().mockReturnValue({
      select: selectFn,
      update: updateFn,
    }),
  } as unknown as SupabaseClient;
}

// --- テスト ---

describe("approveExpense - 自己承認ルール", () => {
  // ステータスログ挿入のモック（admin clientのfromを再利用）
  beforeEach(() => {
    jest.clearAllMocks();
    // insertStatusLog用: admin clientのfrom("expense_status_logs").insert()
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "expense_status_logs") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      // organization_members（カウント用）
      return { select: mockAdminSelect };
    });
  });

  test("承認権限者が2人以上の場合、自己承認は403エラーになること", async () => {
    // 経費取得: 自分の申請（pending）
    const supabase = createMockSupabase({
      data: PENDING_EXPENSE,
      error: null,
    });

    // 承認権限者が2人
    mockAdminApproverCount(2);

    // 自己承認を試みる
    await expect(
      approveExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID)
    ).rejects.toThrow(ApiError);

    await expect(
      approveExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "自分の申請は承認できません",
    });
  });

  test("承認権限者が1人のみの場合、自己承認が許可されること", async () => {
    // 経費取得: 自分の申請（pending）+ 更新結果
    const supabase = createMockSupabase(
      { data: PENDING_EXPENSE, error: null },
      { data: APPROVED_EXPENSE, error: null }
    );

    // 承認権限者が1人のみ
    mockAdminApproverCount(1);

    // 自己承認が成功すること
    const result = await approveExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID);
    expect(result.status).toBe("approved");
    expect(result.approved_by).toBe(USER_ID);
  });

  test("他人の申請を承認する場合、承認権限者数に関係なく成功すること", async () => {
    const OTHER_USER = "user-2";
    const otherExpense = { ...PENDING_EXPENSE, applicant_user_id: OTHER_USER };
    const approvedOther = { ...APPROVED_EXPENSE, applicant_user_id: OTHER_USER, approved_by: USER_ID };

    const supabase = createMockSupabase(
      { data: otherExpense, error: null },
      { data: approvedOther, error: null }
    );

    // 他人の申請なのでカウントクエリは呼ばれない
    const result = await approveExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID);
    expect(result.status).toBe("approved");

    // admin clientのorganization_membersへのカウントクエリが呼ばれていないこと
    expect(mockAdminSelect).not.toHaveBeenCalled();
  });
});

describe("rejectExpense - 自己却下ルール", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "expense_status_logs") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: mockAdminSelect };
    });
  });

  test("承認権限者が2人以上の場合、自己却下は403エラーになること", async () => {
    const supabase = createMockSupabase({
      data: PENDING_EXPENSE,
      error: null,
    });

    // 承認権限者が2人
    mockAdminApproverCount(2);

    await expect(
      rejectExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID, "テスト却下理由")
    ).rejects.toThrow(ApiError);

    await expect(
      rejectExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID, "テスト却下理由")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "自分の申請は却下できません",
    });
  });

  test("承認権限者が1人のみの場合、自己却下が許可されること", async () => {
    const supabase = createMockSupabase(
      { data: PENDING_EXPENSE, error: null },
      { data: REJECTED_EXPENSE, error: null }
    );

    // 承認権限者が1人のみ
    mockAdminApproverCount(1);

    const result = await rejectExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID, "テスト却下理由");
    expect(result.status).toBe("rejected");
    expect(result.rejected_by).toBe(USER_ID);
  });

  test("他人の申請を却下する場合、承認権限者数に関係なく成功すること", async () => {
    const OTHER_USER = "user-2";
    const otherExpense = { ...PENDING_EXPENSE, applicant_user_id: OTHER_USER };
    const rejectedOther = { ...REJECTED_EXPENSE, applicant_user_id: OTHER_USER, rejected_by: USER_ID };

    const supabase = createMockSupabase(
      { data: otherExpense, error: null },
      { data: rejectedOther, error: null }
    );

    const result = await rejectExpense(supabase, ORG_ID, EXPENSE_ID, USER_ID, "テスト却下理由");
    expect(result.status).toBe("rejected");

    // admin clientのカウントクエリが呼ばれていないこと
    expect(mockAdminSelect).not.toHaveBeenCalled();
  });
});
