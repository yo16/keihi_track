/**
 * 新規経費申請ページ
 * ExpenseFormコンポーネントをmode='new'で表示する
 */
import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新規経費申請</h1>
      <ExpenseForm mode="new" />
    </div>
  );
}
