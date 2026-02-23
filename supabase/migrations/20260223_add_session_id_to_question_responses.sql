-- Add session_id to question_responses for direct session scoping
-- (eliminates fragile time-window matching in teacher dashboard)
ALTER TABLE question_responses ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_qr_student_game_session
  ON question_responses(student_id, game_file, session_id);
