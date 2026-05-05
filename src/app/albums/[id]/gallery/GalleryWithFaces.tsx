"use client";

import { OwnerMediaGrid } from "../OwnerMediaGrid";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  uploader_name: string | null;
  created_at: string;
}

interface Props {
  items: MediaItem[];
  albumId: string;
  albumTitle: string;
}

export function GalleryWithFaces({ items, albumId, albumTitle }: Props) {
  return <OwnerMediaGrid items={items} albumId={albumId} albumTitle={albumTitle} />;
}
