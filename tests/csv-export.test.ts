/**
 * CSV生成・ダウンロードユーティリティのテスト
 * generateCsv / downloadCsv の動作を検証する
 *
 * @jest-environment jsdom
 */
import { generateCsv, downloadCsv } from "../src/lib/utils/csv-export";
import type { CsvExpenseRow } from "../src/lib/utils/csv-export";

describe("generateCsv", () => {
  const sampleRow: CsvExpenseRow = {
    amount: 1500,
    purpose: "交通費（東京-大阪）",
    usage_date: "2026-03-15",
    receipt_url: "https://example.com/receipt.jpg",
    comment: "出張のため",
    applicant_name: "田中花子",
    created_at: "2026-03-20T10:00:00Z",
    approver_name: "山田太郎",
    approved_at: "2026-03-21T09:00:00Z",
    rejector_name: null,
    rejected_at: null,
  };

  it("BOM付きUTF-8のCSV文字列を生成する", () => {
    const csv = generateCsv([sampleRow]);

    // BOMが先頭に付与されていること
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("ヘッダー行が正しい順番で含まれる", () => {
    const csv = generateCsv([]);
    const lines = csv.split("\r\n");

    // BOMを除いたヘッダー行
    const headerLine = lines[0].replace("\uFEFF", "");
    expect(headerLine).toBe(
      "金額,用途,使用日,レシート写真URL,コメント,申請者,申請日時,承認者,承認日時,却下者,却下日時"
    );
  });

  it("データ行が正しく出力される", () => {
    const csv = generateCsv([sampleRow]);
    const lines = csv.split("\r\n");

    // データは2行目（インデックス1）
    expect(lines.length).toBe(2); // ヘッダー + 1データ行
    expect(lines[1]).toContain("1500");
    expect(lines[1]).toContain("交通費（東京-大阪）");
    expect(lines[1]).toContain("田中花子");
    expect(lines[1]).toContain("山田太郎");
  });

  it("null値は空文字として出力される", () => {
    const csv = generateCsv([sampleRow]);
    const lines = csv.split("\r\n");
    const values = lines[1].split(",");

    // rejector_name(インデックス9)とrejected_at(インデックス10)がnull
    expect(values[9]).toBe("");
    expect(values[10]).toBe("");
  });

  it("カンマを含む値がダブルクォートで囲まれる", () => {
    const rowWithComma: CsvExpenseRow = {
      ...sampleRow,
      purpose: "交通費,宿泊費",
    };
    const csv = generateCsv([rowWithComma]);

    expect(csv).toContain('"交通費,宿泊費"');
  });

  it("ダブルクォートを含む値がエスケープされる", () => {
    const rowWithQuote: CsvExpenseRow = {
      ...sampleRow,
      comment: '備考"メモ"です',
    };
    const csv = generateCsv([rowWithQuote]);

    expect(csv).toContain('"備考""メモ""です"');
  });

  it("複数行のデータが正しく出力される", () => {
    const rows = [sampleRow, { ...sampleRow, amount: 3000, purpose: "宿泊費" }];
    const csv = generateCsv(rows);
    const lines = csv.split("\r\n");

    // ヘッダー + 2データ行
    expect(lines.length).toBe(3);
    expect(lines[2]).toContain("3000");
    expect(lines[2]).toContain("宿泊費");
  });
});

describe("downloadCsv", () => {
  it("Blobダウンロードを実行する", () => {
    // document.createElement, appendChild, removeChild, click をモック
    const mockClick = jest.fn();
    const mockLink = {
      href: "",
      download: "",
      style: { display: "" },
      click: mockClick,
    };
    jest.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLElement);
    jest.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as unknown as HTMLElement);
    jest.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as unknown as HTMLElement);

    const mockCreateObjectURL = jest.fn().mockReturnValue("blob:test-url");
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    downloadCsv("test,csv,data", "test.csv");

    expect(mockClick).toHaveBeenCalled();
    expect(mockLink.download).toBe("test.csv");
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });
});
