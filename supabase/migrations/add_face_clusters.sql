CREATE TABLE IF NOT EXISTS face_clusters (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id               UUID        NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  representative_face_id UUID        REFERENCES album_faces(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_clusters_album_id ON face_clusters(album_id);

ALTER TABLE album_faces ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES face_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_album_faces_cluster_id ON album_faces(cluster_id);
