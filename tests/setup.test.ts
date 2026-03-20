/**
 * プロジェクト初期セットアップの検証テスト
 * Next.js + TypeScript + shadcn/ui が正しく設定されていることを確認する
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("プロジェクト初期セットアップ", () => {
  // 必須設定ファイルの存在確認
  describe("設定ファイルの存在確認", () => {
    const requiredFiles = [
      "package.json",
      "tsconfig.json",
      "next.config.ts",
      "eslint.config.mjs",
      "postcss.config.mjs",
      ".prettierrc.json",
      "components.json",
    ];

    requiredFiles.forEach((file) => {
      it(`${file} が存在すること`, () => {
        expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      });
    });
  });

  // TypeScript strict modeの確認
  describe("TypeScript設定", () => {
    it("strict modeが有効であること", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("パスエイリアス @/* が設定されていること", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
    });
  });

  // 必須依存パッケージの確認
  describe("依存パッケージの確認", () => {
    let packageJson: Record<string, unknown>;

    beforeAll(() => {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
    });

    const requiredDeps = [
      "@supabase/supabase-js",
      "@supabase/ssr",
      "react-hook-form",
      "zod",
      "@hookform/resolvers",
      "next",
      "react",
      "react-dom",
    ];

    requiredDeps.forEach((dep) => {
      it(`${dep} が dependencies に含まれること`, () => {
        const deps = packageJson.dependencies as Record<string, string>;
        expect(deps[dep]).toBeDefined();
      });
    });

    const requiredDevDeps = [
      "typescript",
      "eslint",
      "prettier",
      "tailwindcss",
    ];

    requiredDevDeps.forEach((dep) => {
      it(`${dep} が devDependencies に含まれること`, () => {
        const devDeps = packageJson.devDependencies as Record<string, string>;
        expect(devDeps[dep]).toBeDefined();
      });
    });
  });

  // shadcn/uiコンポーネントの存在確認
  describe("shadcn/uiコンポーネントの確認", () => {
    const requiredComponents = [
      "button",
      "input",
      "label",
      "card",
      "dialog",
      "table",
      "badge",
      "dropdown-menu",
      "checkbox",
      "select",
      "textarea",
    ];

    requiredComponents.forEach((component) => {
      it(`${component} コンポーネントが存在すること`, () => {
        const filePath = path.join(
          ROOT,
          "src",
          "components",
          "ui",
          `${component}.tsx`
        );
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  // srcディレクトリ構造の確認
  describe("ディレクトリ構造の確認", () => {
    const requiredDirs = [
      "src/app",
      "src/components/ui",
      "src/lib",
    ];

    requiredDirs.forEach((dir) => {
      it(`${dir} ディレクトリが存在すること`, () => {
        expect(fs.existsSync(path.join(ROOT, dir))).toBe(true);
      });
    });
  });

  // .gitignoreに.env.localが含まれていることの確認
  describe(".gitignore設定の確認", () => {
    it(".env.local が .gitignore でカバーされていること", () => {
      const gitignore = fs.readFileSync(
        path.join(ROOT, ".gitignore"),
        "utf-8"
      );
      // .env.* パターンで .env.local もカバーされている
      expect(gitignore).toContain(".env.*");
    });
  });
});
