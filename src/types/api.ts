/**
 * APIリクエスト/レスポンス共通型定義
 */

/** APIエラーレスポンス */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** ページネーション付きレスポンス */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

/** 通常のAPIレスポンス */
export interface ApiResponse<T> {
  data: T;
}
