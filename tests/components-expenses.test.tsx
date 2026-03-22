/**
 * 経費コンポーネントのテスト
 * ExpenseForm, ExpenseList, ExpenseDetail の表示とインタラクションを検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockParams = { expenseId: "exp-1" };
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: mockRefresh,
  }),
  usePathname: () => "/expenses",
  useParams: () => mockParams,
}));

// モック: Supabaseクライアント
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: "https://example.com/img.jpg" } }),
      }),
    },
  }),
}));

// テスト用AuthProviderラッパー
import {
  AuthProvider,
  type AuthContextValue,
} from "../src/lib/contexts/auth-context";

const defaultAuthValue: AuthContextValue = {
  userId: "user-1",
  displayName: "テスト太郎",
  role: "user",
  organization: {
    id: "org-1",
    name: "テスト組織",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  orgId: "org-1",
};

/** AuthContextラッパー */
function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider value={defaultAuthValue}>{children}</AuthProvider>;
}

// テスト用経費データ
const mockExpense = {
  id: "exp-1",
  org_id: "org-1",
  applicant_user_id: "user-1",
  amount: 1500,
  purpose: "交通費",
  usage_date: "2025-03-15",
  receipt_url: "https://example.com/original.jpg",
  receipt_thumbnail_url: "https://example.com/thumb.jpg",
  comment: "テストコメント",
  status: "pending" as const,
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_comment: null,
  created_at: "2025-03-15T10:00:00Z",
  updated_at: "2025-03-15T10:00:00Z",
};

describe("ExpenseForm", () => {
  it("新規申請モードで必要な入力フィールドが表示される", async () => {
    const { ExpenseForm } = await import(
      "../src/components/expenses/expense-form"
    );
    render(
      <AuthWrapper>
        <ExpenseForm mode="new" />
      </AuthWrapper>
    );

    // 必須フィールドの確認
    expect(screen.getByLabelText("金額（円）")).toBeInTheDocument();
    expect(screen.getByLabelText("用途")).toBeInTheDocument();
    expect(screen.getByLabelText("使用日")).toBeInTheDocument();
    expect(screen.getByText("レシート画像")).toBeInTheDocument();
    expect(screen.getByLabelText("コメント（任意）")).toBeInTheDocument();
    expect(screen.getByText("申請する")).toBeInTheDocument();
  });

  it("再申請モードで「再申請する」ボタンが表示される", async () => {
    const { ExpenseForm } = await import(
      "../src/components/expenses/expense-form"
    );
    render(
      <AuthWrapper>
        <ExpenseForm
          mode="resubmit"
          initialData={{
            expenseId: "exp-1",
            amount: 1500,
            purpose: "交通費",
            usage_date: "2025-03-15",
            comment: "コメント",
          }}
        />
      </AuthWrapper>
    );

    expect(screen.getByText("再申請する")).toBeInTheDocument();
  });

  it("再申請モードで初期値がセットされる", async () => {
    const { ExpenseForm } = await import(
      "../src/components/expenses/expense-form"
    );
    render(
      <AuthWrapper>
        <ExpenseForm
          mode="resubmit"
          initialData={{
            expenseId: "exp-1",
            amount: 1500,
            purpose: "交通費",
            usage_date: "2025-03-15",
            comment: "テストコメント",
          }}
        />
      </AuthWrapper>
    );

    expect(screen.getByLabelText("金額（円）")).toHaveValue(1500);
    expect(screen.getByLabelText("用途")).toHaveValue("交通費");
    expect(screen.getByLabelText("使用日")).toHaveValue("2025-03-15");
  });
});

describe("ExpenseList", () => {
  it("経費データが空の場合にメッセージが表示される", async () => {
    const { ExpenseList } = await import(
      "../src/components/expenses/expense-list"
    );
    render(
      <AuthWrapper>
        <ExpenseList
          expenses={[]}
          hasMore={false}
          onLoadMore={jest.fn()}
        />
      </AuthWrapper>
    );

    expect(
      screen.getByText("経費申請はまだありません")
    ).toBeInTheDocument();
  });

  it("経費データがテーブルで表示される", async () => {
    const { ExpenseList } = await import(
      "../src/components/expenses/expense-list"
    );
    render(
      <AuthWrapper>
        <ExpenseList
          expenses={[mockExpense]}
          hasMore={false}
          onLoadMore={jest.fn()}
        />
      </AuthWrapper>
    );

    // テーブルヘッダーの確認
    expect(screen.getByText("用途")).toBeInTheDocument();
    expect(screen.getByText("ステータス")).toBeInTheDocument();

    // データの確認
    expect(screen.getAllByText("交通費").length).toBeGreaterThan(0);
    expect(screen.getAllByText("申請中").length).toBeGreaterThan(0);
  });
});

describe("ExpenseDetail", () => {
  it("経費の全項目が表示される", async () => {
    const { ExpenseDetail } = await import(
      "../src/components/expenses/expense-detail"
    );
    render(
      <AuthWrapper>
        <ExpenseDetail expense={mockExpense} />
      </AuthWrapper>
    );

    expect(screen.getByText("¥1,500")).toBeInTheDocument();
    expect(screen.getByText("交通費")).toBeInTheDocument();
    expect(screen.getByText("テストコメント")).toBeInTheDocument();
    expect(screen.getByText("申請中")).toBeInTheDocument();
  });

  it("自分の申請中経費に取り下げボタンが表示される", async () => {
    const { ExpenseDetail } = await import(
      "../src/components/expenses/expense-detail"
    );
    render(
      <AuthWrapper>
        <ExpenseDetail expense={mockExpense} />
      </AuthWrapper>
    );

    expect(screen.getByText("取り下げ")).toBeInTheDocument();
  });

  it("却下された自分の経費に再申請ボタンが表示される", async () => {
    const { ExpenseDetail } = await import(
      "../src/components/expenses/expense-detail"
    );
    const rejectedExpense = {
      ...mockExpense,
      status: "rejected" as const,
      rejected_by: "approver-1",
      rejected_at: "2025-03-16T10:00:00Z",
      rejection_comment: "金額が不正です",
    };
    render(
      <AuthWrapper>
        <ExpenseDetail expense={rejectedExpense} />
      </AuthWrapper>
    );

    expect(screen.getByText("再申請")).toBeInTheDocument();
    expect(screen.getByText("却下理由: 金額が不正です")).toBeInTheDocument();
  });

  it("他人の経費にはアクションボタンが表示されない", async () => {
    const { ExpenseDetail } = await import(
      "../src/components/expenses/expense-detail"
    );
    const otherExpense = {
      ...mockExpense,
      applicant_user_id: "other-user",
    };
    render(
      <AuthWrapper>
        <ExpenseDetail expense={otherExpense} />
      </AuthWrapper>
    );

    expect(screen.queryByText("取り下げ")).not.toBeInTheDocument();
    expect(screen.queryByText("再申請")).not.toBeInTheDocument();
  });

  it("レシート画像が表示される", async () => {
    const { ExpenseDetail } = await import(
      "../src/components/expenses/expense-detail"
    );
    render(
      <AuthWrapper>
        <ExpenseDetail expense={mockExpense} />
      </AuthWrapper>
    );

    const img = screen.getByAlt("レシート");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
  });
});
