/**
 * APIエラーハンドリングのテスト
 */
import { ApiError } from "../src/lib/api/error";

describe("ApiError", () => {
  it("正しいプロパティが設定されること", () => {
    const error = new ApiError(403, "FORBIDDEN", "アクセス拒否");
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("アクセス拒否");
    expect(error.name).toBe("ApiError");
  });

  it("Errorクラスを継承していること", () => {
    const error = new ApiError(500, "INTERNAL", "サーバーエラー");
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
  });
});
