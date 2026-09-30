-- Gallery / album detail: media by album, newest first (.eq album_id + .order created_at desc)
CREATE INDEX IF NOT EXISTS idx_media_album_created_at ON media(album_id, created_at DESC);

-- Dashboard: albums by owner, newest first (.eq owner_id + .order created_at desc)
CREATE INDEX IF NOT EXISTS idx_albums_owner_created_at ON albums(owner_id, created_at DESC);

-- Face clustering / faces API: faces by album (.eq album_id)
CREATE INDEX IF NOT EXISTS idx_album_faces_album_id ON album_faces(album_id);

-- Media deletion: delete faces by media (.eq / .in media_id); also speeds FK cascades
CREATE INDEX IF NOT EXISTS idx_album_faces_media_id ON album_faces(media_id);
