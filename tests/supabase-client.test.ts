/**
 * Supabaseクライアント・ミドルウェア設定のテスト
 * 各クライアントユーティリティとミドルウェアが正しく構成されていることを確認する
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

describe("Supabaseクライアント設定", () => {
  // 必要なファイルがすべて存在すること
  describe("ファイルの存在確認", () => {
    const requiredFiles = [
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/middleware.ts",
      "src/lib/supabase/admin.ts",
      "src/middleware.ts",
    ];

    requiredFiles.forEach((file) => {
      it(`${file} が存在すること`, () => {
        expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      });
    });
  });

  // ブラウザ用クライアントの検証
  describe("client.ts（ブラウザ用）", () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SRC, "lib/supabase/client.ts"),
        "utf-8"
      );
    });

    it("createBrowserClient をインポートしていること", () => {
      expect(content).toContain("createBrowserClient");
      expect(content).toContain("@supabase/ssr");
    });

    it("NEXT_PUBLIC_SUPABASE_URL を参照していること", () => {
      expect(content).toContain("NEXT_PUBLIC_SUPABASE_URL");
    });

    it("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を参照していること", () => {
      expect(content).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    });

    it("環境変数未設定時にエラーをスローすること", () => {
      expect(content).toContain("throw new Error");
    });
  });

  // サーバー用クライアントの検証
  describe("server.ts（サーバー用）", () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SRC, "lib/supabase/server.ts"),
        "utf-8"
      );
    });

    it("createServerClient をインポートしていること", () => {
      expect(content).toContain("createServerClient");
      expect(content).toContain("@supabase/ssr");
    });

    it("next/headers の cookies を使用していること", () => {
      expect(content).toContain("cookies");
      expect(content).toContain("next/headers");
    });

    it("Cookie の getAll と setAll を実装していること", () => {
      expect(content).toContain("getAll");
      expect(content).toContain("setAll");
    });

    it("環境変数未設定時にエラーをスローすること", () => {
      expect(content).toContain("throw new Error");
    });
  });

  // ミドルウェア用セッションリフレッシュの検証
  describe("middleware.ts（ミドルウェア用）", () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SRC, "lib/supabase/middleware.ts"),
        "utf-8"
      );
    });

    it("updateSession 関数をエクスポートしていること", () => {
      expect(content).toContain("export async function updateSession");
    });

    it("createServerClient を使用していること", () => {
      expect(content).toContain("createServerClient");
    });

    it("auth.getUser() でセッションリフレッシュを行うこと", () => {
      expect(content).toContain("auth.getUser()");
    });

    it("NextResponse.next を返すこと", () => {
      expect(content).toContain("NextResponse.next");
    });

    it("環境変数未設定時にエラーをスローすること", () => {
      expect(content).toContain("throw new Error");
    });
  });

  // 管理用クライアントの検証
  describe("admin.ts（管理用）", () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SRC, "lib/supabase/admin.ts"),
        "utf-8"
      );
    });

    it("@supabase/supabase-js の createClient を使用していること", () => {
      expect(content).toContain("@supabase/supabase-js");
    });

    it("SUPABASE_SECRET_KEY を参照していること", () => {
      expect(content).toContain("SUPABASE_SECRET_KEY");
    });

    it("セッション永続化を無効にしていること", () => {
      expect(content).toContain("persistSession: false");
    });

    it("自動トークンリフレッシュを無効にしていること", () => {
      expect(content).toContain("autoRefreshToken: false");
    });

    it("環境変数未設定時にエラーをスローすること", () => {
      expect(content).toContain("throw new Error");
    });

    it("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を使用していないこと（service_roleキーを使用）", () => {
      expect(content).not.toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    });
  });

  // ルートミドルウェアの検証
  describe("src/middleware.ts（ルートミドルウェア）", () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SRC, "middleware.ts"),
        "utf-8"
      );
    });

    it("updateSession を呼び出していること", () => {
      expect(content).toContain("updateSession");
    });

    it("静的ファイルを除外する matcher が設定されていること", () => {
      expect(content).toContain("_next/static");
      expect(content).toContain("_next/image");
      expect(content).toContain("favicon.ico");
    });

    it("画像ファイル拡張子を除外していること", () => {
      expect(content).toContain("svg");
      expect(content).toContain("png");
      expect(content).toContain("jpg");
      expect(content).toContain("webp");
    });

    it("catch節で console.error を使用していること（サイレント握りつぶし禁止）", () => {
      expect(content).toContain("console.error");
    });

    it("Node.js専用モジュールを使用していないこと（Edge Runtime互換性）", () => {
      // Node.js専用モジュールのインポートがないことを確認
      const nodeModules = ["fs", "path", "crypto", "os", "child_process"];
      nodeModules.forEach((mod) => {
        const importPattern = new RegExp(
          `import.*from\\s+['"]${mod}['"]`
        );
        expect(content).not.toMatch(importPattern);
      });
    });

    it("matcher 設定をエクスポートしていること", () => {
      expect(content).toContain("export const config");
      expect(content).toContain("matcher");
    });
  });
});
