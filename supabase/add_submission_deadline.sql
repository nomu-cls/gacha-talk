-- ============================================================
-- 質問受付締め切り設定テーブル
-- Supabase SQL Editor で実行してください
-- ============================================================

CREATE TABLE IF NOT EXISTS gacha_settings (
  id text PRIMARY KEY DEFAULT 'global',
  submission_deadline timestamptz,        -- 締め切り日時（NULLなら無制限）
  submission_deadline_enabled boolean NOT NULL DEFAULT false,  -- トグル
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE gacha_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gacha_settings_all" ON gacha_settings;
CREATE POLICY "gacha_settings_all" ON gacha_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gacha_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 初期レコードを挿入（1行だけ）
INSERT INTO gacha_settings (id, submission_deadline, submission_deadline_enabled)
VALUES ('global', NULL, false)
ON CONFLICT (id) DO NOTHING;
