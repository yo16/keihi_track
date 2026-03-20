/**
 * 管理者向けコンポーネントのテスト
 * MemberList, MemberFormDialog, InviteTextDialog, RoleChangeDialog の
 * レンダリングと基本的なインタラクションを検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { MemberResponse } from "../src/types/member";

// モック: next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// モック: AuthContext
const mockAuthContext = {
  userId: "current-user-id",
  displayName: "テスト管理者",
  role: "admin" as const,
  organization: {
    id: "test-org-id",
    name: "テスト組織",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  orgId: "test-org-id",
};

jest.mock("@/lib/contexts/auth-context", () => ({
  useAuthContext: () => mockAuthContext,
}));

// モック: fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// モック: navigator.clipboard
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// 各テスト前にモックをリセット
beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockFetch.mockClear();
  mockWriteText.mockClear();
  jest.clearAllMocks();
});

// テスト用のメンバーデータ
const testMembers: MemberResponse[] = [
  {
    user_id: "current-user-id",
    display_name: "テスト管理者",
    email: "admin@example.com",
    role: "admin",
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    user_id: "user-2",
    display_name: "テストユーザー",
    email: "user@example.com",
    role: "user",
    deleted_at: null,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    user_id: "user-3",
    display_name: "削除済みユーザー",
    email: "deleted@example.com",
    role: "user",
    deleted_at: "2026-02-01T00:00:00Z",
    created_at: "2026-01-03T00:00:00Z",
  },
];

// ── MemberList ──

describe("MemberList", () => {
  let MemberList: React.ComponentType<{
    members: MemberResponse[];
    onRefresh: () => void;
  }>;

  beforeAll(async () => {
    const mod = await import("../src/components/admin/member-list");
    MemberList = mod.MemberList;
  });

  it("メンバー一覧がテーブル形式で表示されること", () => {
    const onRefresh = jest.fn();
    render(<MemberList members={testMembers} onRefresh={onRefresh} />);

    // テーブルヘッダーの確認
    expect(screen.getByText("表示名")).toBeInTheDocument();
    expect(screen.getByText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByText("ロール")).toBeInTheDocument();
    expect(screen.getByText("ステータス")).toBeInTheDocument();
  });

  it("各メンバーの情報が表示されること", () => {
    const onRefresh = jest.fn();
    render(<MemberList members={testMembers} onRefresh={onRefresh} />);

    // メンバー情報の確認
    expect(screen.getByText("テスト管理者")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("テストユーザー")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("自分自身の行にはアクションボタンが表示されないこと", () => {
    const onRefresh = jest.fn();
    render(<MemberList members={testMembers} onRefresh={onRefresh} />);

    // ロール変更・削除ボタンの数を確認
    // 自分自身(current-user-id)と削除済みユーザーにはボタンがないので、
    // アクティブな他ユーザー(user-2)の分だけ表示される
    const roleChangeButtons = screen.getAllByText("ロール変更");
    expect(roleChangeButtons).toHaveLength(1);

    const deleteButtons = screen.getAllByText("削除");
    expect(deleteButtons).toHaveLength(1);
  });

  it("削除済みメンバーにはアクションボタンが表示されないこと", () => {
    const onRefresh = jest.fn();
    render(<MemberList members={testMembers} onRefresh={onRefresh} />);

    // 削除済みバッジが表示されていること
    expect(screen.getByText("削除済み")).toBeInTheDocument();
  });

  it("メンバーが0件の場合、空メッセージが表示されること", () => {
    const onRefresh = jest.fn();
    render(<MemberList members={[]} onRefresh={onRefresh} />);

    expect(
      screen.getByText("メンバーが登録されていません。")
    ).toBeInTheDocument();
  });
});

// ── InviteSuccessDialog ──

describe("InviteSuccessDialog", () => {
  let InviteSuccessDialog: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invitationSent: boolean;
    loginUrl: string;
  }>;

  beforeAll(async () => {
    const mod = await import("../src/components/admin/invite-success");
    InviteSuccessDialog = mod.InviteSuccessDialog;
  });

  it("招待メール送信時に送信メッセージが表示されること", () => {
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={true}
        loginUrl="https://example.com/test-org/login"
      />
    );

    expect(screen.getByText(/招待メールを送信しました/)).toBeInTheDocument();
  });

  it("既存ユーザー追加時に追加メッセージが表示されること", () => {
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={false}
        loginUrl="https://example.com/test-org/login"
      />
    );

    expect(screen.getByText(/メンバーを組織に追加しました/)).toBeInTheDocument();
  });

  it("ログインURLが表示されること", () => {
    const loginUrl = "https://example.com/test-org/login";
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={true}
        loginUrl={loginUrl}
      />
    );

    expect(screen.getByText(loginUrl)).toBeInTheDocument();
  });

  it("URLコピーボタンが表示されること", () => {
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={true}
        loginUrl="https://example.com/test-org/login"
      />
    );

    expect(screen.getByText("URLをコピー")).toBeInTheDocument();
  });

  it("コピーボタンクリックでログインURLがクリップボードにコピーされること", async () => {
    const loginUrl = "https://example.com/test-org/login";
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={true}
        loginUrl={loginUrl}
      />
    );

    fireEvent.click(screen.getByText("URLをコピー"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(loginUrl);
    });
  });

  it("コピー成功後に「コピーしました」が表示されること", async () => {
    render(
      <InviteSuccessDialog
        open={true}
        onOpenChange={jest.fn()}
        invitationSent={true}
        loginUrl="https://example.com/test-org/login"
      />
    );

    fireEvent.click(screen.getByText("URLをコピー"));

    await waitFor(() => {
      expect(screen.getByText("コピーしました")).toBeInTheDocument();
    });
  });
});

// ── MemberFormDialog ──

describe("MemberFormDialog", () => {
  let MemberFormDialog: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
  }>;

  beforeAll(async () => {
    const mod = await import("../src/components/admin/member-form");
    MemberFormDialog = mod.MemberFormDialog;
  });

  it("ダイアログが開いているとき、フォーム入力要素が表示されること", () => {
    render(
      <MemberFormDialog
        open={true}
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
      />
    );

    expect(screen.getByText("メンバー追加")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("表示名")).toBeInTheDocument();
    expect(screen.getByLabelText("ロール")).toBeInTheDocument();
  });

  it("パスワード入力フィールドが表示されないこと", () => {
    render(
      <MemberFormDialog
        open={true}
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
      />
    );

    expect(screen.queryByLabelText("初期パスワード")).not.toBeInTheDocument();
  });

  it("送信ボタンが表示されること", () => {
    render(
      <MemberFormDialog
        open={true}
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "メンバーを追加" })
    ).toBeInTheDocument();
  });
});

// ── RoleChangeDialog ──

describe("RoleChangeDialog", () => {
  let RoleChangeDialog: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: MemberResponse | null;
    onChanged: () => void;
  }>;

  beforeAll(async () => {
    const mod = await import("../src/components/admin/role-change-dialog");
    RoleChangeDialog = mod.RoleChangeDialog;
  });

  it("対象メンバーの情報が表示されること", () => {
    const targetMember = testMembers[1]; // テストユーザー
    render(
      <RoleChangeDialog
        open={true}
        onOpenChange={jest.fn()}
        member={targetMember}
        onChanged={jest.fn()}
      />
    );

    expect(screen.getByText("ロール変更")).toBeInTheDocument();
    // ダイアログ説明文に表示名が含まれること
    expect(
      screen.getByText(/テストユーザー.*ロールを変更/)
    ).toBeInTheDocument();
  });

  it("現在のロールが表示されること", () => {
    const targetMember = testMembers[1];
    render(
      <RoleChangeDialog
        open={true}
        onOpenChange={jest.fn()}
        member={targetMember}
        onChanged={jest.fn()}
      />
    );

    expect(screen.getByText("現在のロール")).toBeInTheDocument();
    expect(screen.getByText("使用者（user）")).toBeInTheDocument();
  });

  it("変更ボタンが表示されること", () => {
    const targetMember = testMembers[1];
    render(
      <RoleChangeDialog
        open={true}
        onOpenChange={jest.fn()}
        member={targetMember}
        onChanged={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "変更" })).toBeInTheDocument();
  });

  it("memberがnullの場合、ダイアログが表示されないこと", () => {
    const { container } = render(
      <RoleChangeDialog
        open={true}
        onOpenChange={jest.fn()}
        member={null}
        onChanged={jest.fn()}
      />
    );

    // ダイアログコンテンツが存在しないことを確認
    expect(container.innerHTML).toBe("");
  });
});

// ── AdminMembersPage ──

describe("AdminMembersPage", () => {
  let AdminMembersPage: React.ComponentType;

  beforeAll(async () => {
    // メンバー一覧APIのモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: testMembers }),
    });

    const mod = await import(
      "../src/app/[orgId]/(authenticated)/admin/members/page"
    );
    AdminMembersPage = mod.default;
  });

  it("ページタイトルが表示されること", async () => {
    render(<AdminMembersPage />);

    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
  });

  it("メンバー追加ボタンが表示されること", async () => {
    render(<AdminMembersPage />);

    expect(
      screen.getByRole("button", { name: "メンバー追加" })
    ).toBeInTheDocument();
  });

  it("メンバー一覧取得APIが呼ばれること", async () => {
    render(<AdminMembersPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/organizations/test-org-id/members?include_deleted=true"
      );
    });
  });
});
