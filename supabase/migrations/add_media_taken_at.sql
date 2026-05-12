ALTER TABLE media ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_media_taken_at ON media(album_id, taken_at DESC NULLS LAST);
