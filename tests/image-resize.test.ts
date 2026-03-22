/**
 * 画像リサイズユーティリティのテスト
 *
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";

// Canvas APIとImage APIのモック
const mockDrawImage = jest.fn();
const mockToBlob = jest.fn();
const mockGetContext = jest.fn(() => ({
  drawImage: mockDrawImage,
}));

// HTMLCanvasElementのモック
Object.defineProperty(document, "createElement", {
  value: jest.fn((tagName: string) => {
    if (tagName === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      };
    }
    return document.createElement(tagName);
  }),
});

// URL.createObjectURL / revokeObjectURLのモック
const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(URL, "createObjectURL", { value: mockCreateObjectURL });
Object.defineProperty(URL, "revokeObjectURL", { value: mockRevokeObjectURL });

// Imageのモック
class MockImage {
  width = 0;
  height = 0;
  src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

Object.defineProperty(global, "Image", {
  value: MockImage,
});

describe("resizeImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // toBlobのデフォルト動作：正常にBlobを返す
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(new Blob(["test"], { type: "image/jpeg" }));
      }
    );
  });

  it("長辺がmaxSize以下の場合はリサイズせずそのまま出力する", async () => {
    // resizeImageの動的インポート（モック設定後に）
    const { resizeImage } = await import("../src/lib/utils/image-resize");

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const maxSize = 300;

    // Imageのonloadを非同期でトリガー
    const originalImage = global.Image;
    let imageInstance: MockImage;
    // @ts-expect-error モック用にImageを上書き
    global.Image = class extends MockImage {
      constructor() {
        super();
        imageInstance = this;
        setTimeout(() => {
          this.width = 200;
          this.height = 150;
          this.onload?.();
        }, 0);
      }
    };

    const result = await resizeImage(file, maxSize);
    expect(result).toBeInstanceOf(Blob);
    expect(mockRevokeObjectURL).toHaveBeenCalled();

    global.Image = originalImage;
  });

  it("画像読み込みエラー時にrejectされる", async () => {
    const { resizeImage } = await import("../src/lib/utils/image-resize");

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    const originalImage = global.Image;
    // @ts-expect-error モック用にImageを上書き
    global.Image = class extends MockImage {
      constructor() {
        super();
        setTimeout(() => {
          this.onerror?.();
        }, 0);
      }
    };

    await expect(resizeImage(file, 300)).rejects.toThrow(
      "画像の読み込みに失敗しました"
    );

    global.Image = originalImage;
  });
});
