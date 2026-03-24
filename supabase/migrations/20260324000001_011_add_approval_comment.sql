-- 承認時コメントカラムを追加
-- 承認者が承認時に任意のコメント（仕分けメモ・備忘録等）を残せるようにする
ALTER TABLE expenses ADD COLUMN approval_comment TEXT;
