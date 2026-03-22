/**
 * 画像リサイズユーティリティ
 * Canvas APIを使用してクライアントサイドで画像をリサイズする
 */

/**
 * 画像ファイルを指定した最大サイズにリサイズする
 * 長辺がmaxSize以下になるようにリサイズし、JPEG形式で出力する
 *
 * @param file - リサイズ対象の画像ファイル
 * @param maxSize - 長辺の最大ピクセル数
 * @returns リサイズ後のBlob（JPEG形式、quality: 0.8）
 */
export function resizeImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // リサイズ比率の計算（長辺がmaxSize以下になるように）
      const { width, height } = img;
      let newWidth = width;
      let newHeight = height;

      if (width > maxSize || height > maxSize) {
        if (width >= height) {
          newWidth = maxSize;
          newHeight = Math.round((height / width) * maxSize);
        } else {
          newHeight = maxSize;
          newWidth = Math.round((width / height) * maxSize);
        }
      }

      // Canvas描画でリサイズ
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D コンテキストの取得に失敗しました"));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // JPEG形式でBlob変換
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("画像のBlob変換に失敗しました"));
          }
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };

    img.src = url;
  });
}
