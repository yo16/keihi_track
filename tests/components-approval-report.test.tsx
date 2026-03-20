/**
 * 承認アクション / フィルター / CSV出力ボタン / レポート関連コンポーネントのテスト
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: mockRefresh,
  }),
  usePathname: () => "/org-1/expenses",
  useParams: () => ({ orgId: "org-1", expenseId: "exp-1" }),
}));

// モック: Supabaseクライアント
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// テスト用AuthProviderラッパー
import {
  AuthProvider,
  type AuthContextValue,
} from "../src/lib/contexts/auth-context";

/** 使用者ロールのAuthContext値 */
const userAuthValue: AuthContextValue = {
  userId: "user-1",
  displayName: "テスト太郎",
  role: "user",
  organization: {
    id: "org-1",
    name: "テスト組織",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  orgId: "org-1",
};

/** 承認者ロールのAuthContext値 */
const approverAuthValue: AuthContextValue = {
  ...userAuthValue,
  role: "approver",
};

/** AuthProviderでラップするヘルパー */
function renderWithAuth(ui: React.ReactElement, authValue: AuthContextValue) {
  return render(<AuthProvider value={authValue}>{ui}</AuthProvider>);
}

// ============================
// ApprovalActions テスト
// ============================
import { ApprovalActions } from "../src/components/expenses/approval-actions";

describe("ApprovalActions", () => {
  it("承認ボタンと却下ボタンが表示される", () => {
    renderWithAuth(
      <ApprovalActions expenseId="exp-1" />,
      approverAuthValue
    );

    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(screen.getByText("却下")).toBeInTheDocument();
  });

  it("却下ボタンクリックでダイアログが表示される", async () => {
    renderWithAuth(
      <ApprovalActions expenseId="exp-1" />,
      approverAuthValue
    );

    fireEvent.click(screen.getByText("却下"));

    // ダイアログのタイトルが表示される
    await waitFor(() => {
      expect(screen.getByText("却下理由の入力")).toBeInTheDocument();
    });
  });
});

// ============================
// ExpenseDetail + ApprovalActions 統合テスト
// ============================
import { ExpenseDetail } from "../src/components/expenses/expense-detail";
import type { Expense } from "../src/types/database";

const baseExpense: Expense = {
  id: "exp-1",
  org_id: "org-1",
  applicant_user_id: "other-user",
  amount: 1500,
  purpose: "交通費",
  usage_date: "2026-03-15",
  receipt_url: "https://example.com/receipt.jpg",
  receipt_thumbnail_url: "https://example.com/receipt_thumb.jpg",
  comment: null,
  status: "pending",
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_comment: null,
  created_at: "2026-03-20T10:00:00Z",
  updated_at: "2026-03-20T10:00:00Z",
};

describe("ExpenseDetail - 承認アクション表示条件", () => {
  it("承認者 + 申請中 + 他人の申請 → 承認/却下ボタンが表示される", () => {
    renderWithAuth(
      <ExpenseDetail expense={baseExpense} />,
      approverAuthValue
    );

    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(screen.getByText("却下")).toBeInTheDocument();
  });

  it("使用者ロール → 承認/却下ボタンが表示されない", () => {
    renderWithAuth(
      <ExpenseDetail expense={baseExpense} />,
      userAuthValue
    );

    expect(screen.queryByText("承認")).not.toBeInTheDocument();
  });

  it("承認者 + 申請中 + 自分の申請 → 承認/却下ボタンが表示されない", () => {
    const ownExpense: Expense = {
      ...baseExpense,
      applicant_user_id: "user-1",
    };

    renderWithAuth(
      <ExpenseDetail expense={ownExpense} />,
      { ...approverAuthValue, userId: "user-1" }
    );

    // 承認ボタンがないこと
    expect(screen.queryByText("承認")).not.toBeInTheDocument();
    // 代わりに取り下げボタンが表示される
    expect(screen.getByText("取り下げ")).toBeInTheDocument();
  });

  it("承認者 + 承認済み + 他人の申請 → 承認/却下ボタンが表示されない", () => {
    const approvedExpense: Expense = {
      ...baseExpense,
      status: "approved",
      approved_by: "approver-1",
      approved_at: "2026-03-21T09:00:00Z",
    };

    renderWithAuth(
      <ExpenseDetail expense={approvedExpense} />,
      approverAuthValue
    );

    expect(screen.queryByText("承認")).not.toBeInTheDocument();
  });
});

// ============================
// ExpenseFilters テスト
// ============================
import { ExpenseFilters } from "../src/components/expenses/expense-filters";

describe("ExpenseFilters", () => {
  it("フィルターUIが表示される", () => {
    const onApply = jest.fn();
    render(<ExpenseFilters onApply={onApply} />);

    expect(screen.getByText("フィルター")).toBeInTheDocument();
    expect(screen.getByLabelText("使用日（開始）")).toBeInTheDocument();
    expect(screen.getByLabelText("使用日（終了）")).toBeInTheDocument();
    expect(screen.getByText("申請中")).toBeInTheDocument();
    expect(screen.getByText("承認済み")).toBeInTheDocument();
    expect(screen.getByText("却下")).toBeInTheDocument();
    expect(screen.getByText("削除")).toBeInTheDocument();
  });

  it("フィルター適用ボタンが存在する", () => {
    const onApply = jest.fn();
    render(<ExpenseFilters onApply={onApply} />);

    expect(screen.getByText("フィルター適用")).toBeInTheDocument();
  });
});

// ============================
// CsvExportButton テスト
// ============================
import { CsvExportButton } from "../src/components/expenses/csv-export-button";

describe("CsvExportButton", () => {
  it("選択件数が0の場合はdisabled", () => {
    renderWithAuth(
      <CsvExportButton selectedIds={[]} />,
      approverAuthValue
    );

    const button = screen.getByText("CSV出力（0件）");
    expect(button).toBeInTheDocument();
    expect(button.closest("button")).toBeDisabled();
  });

  it("選択件数が表示される", () => {
    renderWithAuth(
      <CsvExportButton selectedIds={["id-1", "id-2", "id-3"]} />,
      approverAuthValue
    );

    expect(screen.getByText("CSV出力（3件）")).toBeInTheDocument();
  });

  it("選択件数が1以上の場合はenabled", () => {
    renderWithAuth(
      <CsvExportButton selectedIds={["id-1"]} />,
      approverAuthValue
    );

    const button = screen.getByText("CSV出力（1件）");
    expect(button.closest("button")).not.toBeDisabled();
  });
});
