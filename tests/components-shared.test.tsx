/**
 * 共有コンポーネントのテスト
 * StatusBadge, Pagination, ReceiptViewer の表示を検証する
 *
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// モック: next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/org-1/expenses",
}));

describe("StatusBadge", () => {
  it("pending ステータスで「申請中」と表示される", async () => {
    const { StatusBadge } = await import(
      "../src/components/shared/status-badge"
    );
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("申請中")).toBeInTheDocument();
  });

  it("approved ステータスで「承認済み」と表示される", async () => {
    const { StatusBadge } = await import(
      "../src/components/shared/status-badge"
    );
    render(<StatusBadge status="approved" />);
    expect(screen.getByText("承認済み")).toBeInTheDocument();
  });

  it("rejected ステータスで「却下」と表示される", async () => {
    const { StatusBadge } = await import(
      "../src/components/shared/status-badge"
    );
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText("却下")).toBeInTheDocument();
  });

  it("deleted ステータスで「削除」と表示される", async () => {
    const { StatusBadge } = await import(
      "../src/components/shared/status-badge"
    );
    render(<StatusBadge status="deleted" />);
    expect(screen.getByText("削除")).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("hasMore=true の場合に「次のページ」ボタンが表示される", async () => {
    const { Pagination } = await import(
      "../src/components/shared/pagination"
    );
    const onLoadMore = jest.fn();
    render(<Pagination hasMore={true} onLoadMore={onLoadMore} />);
    expect(screen.getByText("次のページ")).toBeInTheDocument();
  });

  it("hasMore=false の場合にボタンが表示されない", async () => {
    const { Pagination } = await import(
      "../src/components/shared/pagination"
    );
    const onLoadMore = jest.fn();
    const { container } = render(
      <Pagination hasMore={false} onLoadMore={onLoadMore} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("ボタンクリックでonLoadMoreが呼ばれる", async () => {
    const { Pagination } = await import(
      "../src/components/shared/pagination"
    );
    const onLoadMore = jest.fn();
    render(<Pagination hasMore={true} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByText("次のページ"));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("isLoading=true の場合に「読み込み中...」と表示される", async () => {
    const { Pagination } = await import(
      "../src/components/shared/pagination"
    );
    const onLoadMore = jest.fn();
    render(
      <Pagination hasMore={true} onLoadMore={onLoadMore} isLoading={true} />
    );
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });
});

describe("ReceiptViewer", () => {
  it("サムネイル画像が表示される", async () => {
    const { ReceiptViewer } = await import(
      "../src/components/shared/receipt-viewer"
    );
    render(
      <ReceiptViewer
        thumbnailUrl="https://example.com/thumb.jpg"
        originalUrl="https://example.com/original.jpg"
      />
    );
    const img = screen.getByAlt("レシート");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
  });
});
