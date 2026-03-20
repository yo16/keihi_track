/**
 * API用エラーハンドリング
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types/api";

/** APIエラークラス: ステータスコードとエラーコードを持つ */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** APIルートハンドラのレスポンス型 */
type ApiRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * API Routeラッパー
 * ApiErrorをcatchしてJSONエラーレスポンスに変換する
 * 想定外のエラーは500として返す
 */
export function withErrorHandler(handler: ApiRouteHandler): ApiRouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // ApiErrorの場合はステータスコードとエラー情報をそのまま返す
      if (error instanceof ApiError) {
        const body: ApiErrorResponse = {
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return NextResponse.json(body, { status: error.statusCode });
      }

      // 想定外のエラーは500で返す
      console.error("Unexpected error:", error);
      const body: ApiErrorResponse = {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "予期しないエラーが発生しました",
        },
      };
      return NextResponse.json(body, { status: 500 });
    }
  };
}
