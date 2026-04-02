-- ============================================================
-- ガチャトーク テーブル作成
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. お題テーブル
CREATE TABLE IF NOT EXISTS gacha_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id text NOT NULL,
  text text NOT NULL,
  submitted_by text NOT NULL DEFAULT '匿名',
  created_at timestamptz DEFAULT now()
);

-- 2. ガチャラウンド
CREATE TABLE IF NOT EXISTS gacha_rounds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id text NOT NULL,
  topic_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'gacha' CHECK (status IN ('gacha', 'voting', 'closed', 'archived')),
  voting_deadline timestamptz,
  winner_topic_id uuid REFERENCES gacha_topics(id),
  created_at timestamptz DEFAULT now()
);

-- 3. 投票テーブル
CREATE TABLE IF NOT EXISTS gacha_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES gacha_rounds(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES gacha_topics(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, voter_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_gacha_topics_speaker ON gacha_topics(speaker_id);
CREATE INDEX IF NOT EXISTS idx_gacha_rounds_status ON gacha_rounds(status);
CREATE INDEX IF NOT EXISTS idx_gacha_votes_round ON gacha_votes(round_id);

-- RLS（Row Level Security）
ALTER TABLE gacha_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_votes ENABLE ROW LEVEL SECURITY;

-- 全員読み書き可能（匿名イベントアプリ）
DROP POLICY IF EXISTS "gacha_topics_all" ON gacha_topics;
CREATE POLICY "gacha_topics_all" ON gacha_topics FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "gacha_rounds_all" ON gacha_rounds;
CREATE POLICY "gacha_rounds_all" ON gacha_rounds FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "gacha_votes_all" ON gacha_votes;
CREATE POLICY "gacha_votes_all" ON gacha_votes FOR ALL USING (true) WITH CHECK (true);

-- Realtime有効化（既に追加済みの場合はスキップ）
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gacha_topics;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gacha_rounds;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gacha_votes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 確認
SELECT 'gacha_topics' as table_name, count(*) FROM gacha_topics
UNION ALL
SELECT 'gacha_rounds', count(*) FROM gacha_rounds
UNION ALL
SELECT 'gacha_votes', count(*) FROM gacha_votes;
