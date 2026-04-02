-- Quick Polls: 登壇者から会場へのアンケート機能
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quick_polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',  -- ["選択肢A", "選択肢B", ...]
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quick_poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES quick_polls(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

-- RLS
ALTER TABLE quick_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_polls_all" ON quick_polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quick_poll_votes_all" ON quick_poll_votes FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE quick_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE quick_poll_votes;
