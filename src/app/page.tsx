import { Button } from "@/components/ui/button";

// トップページ
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-4xl font-bold">ケイトラ</h1>
        <p className="text-lg text-muted-foreground">経費管理システム</p>
        <Button>はじめる</Button>
      </main>
    </div>
  );
}
