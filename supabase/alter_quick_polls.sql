-- 既存の quick_polls テーブルに対して speaker_id を追加し、draft状態を許容する
ALTER TABLE quick_polls ADD COLUMN IF NOT EXISTS speaker_id text NOT NULL DEFAULT 'admin';

-- statusのチェック制約を一旦削除してから追加し直す
ALTER TABLE quick_polls DROP CONSTRAINT IF EXISTS quick_polls_status_check;
ALTER TABLE quick_polls ADD CONSTRAINT quick_polls_status_check CHECK (status IN ('draft', 'active', 'closed'));
