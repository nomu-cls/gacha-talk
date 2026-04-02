-- ============================================================
-- gacha_rounds の CHECK 制約を更新: 'archived' ステータス追加
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 既存のCHECK制約を削除して再作成
ALTER TABLE gacha_rounds DROP CONSTRAINT IF EXISTS gacha_rounds_status_check;
ALTER TABLE gacha_rounds ADD CONSTRAINT gacha_rounds_status_check
  CHECK (status IN ('gacha', 'voting', 'closed', 'archived'));

SELECT 'Done! archived status enabled.' as result;
