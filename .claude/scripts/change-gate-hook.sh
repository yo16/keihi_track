#!/bin/bash
# change-gate-hook.sh
# UserPromptSubmit hook: ユーザーの入力から問題報告・改善要望のキーワードを検知し、
# change-gate スキルの使用を促すリマインダーを出力する。
#
# 使用方法:
#   settings.json の hooks.UserPromptSubmit に登録する
#   ユーザーの入力は $CLAUDE_USER_PROMPT 環境変数で渡される

PROMPT="${CLAUDE_USER_PROMPT:-}"

if [ -z "$PROMPT" ]; then
  exit 0
fi

# 問題報告・改善要望のキーワードパターン
# 日本語キーワード
JP_KEYWORDS="動かない|おかしい|エラー|バグ|失敗|壊れ|改善|修正して|直して|変えて|変更して|追加して|削除して|使いにくい|見づらい|遅い|リファクタ|整理して|期待通りでない|不具合|問題が|うまくいかない|表示されない|反映されない"

# 英語キーワード
EN_KEYWORDS="bug|broken|error|fix|doesn't work|not working|improve|change|modify|refactor"

if echo "$PROMPT" | grep -qiE "($JP_KEYWORDS|$EN_KEYWORDS)"; then
  echo "⚠️ 変更管理リマインダー: このメッセージは問題報告・改善要望の可能性があります。"
  echo "コードを直接修正する前に、change-gate スキルを使用して /batch-change プロセスに乗せてください。"
  echo "（change-gate スキルがユーザーに確認を行います）"
fi
