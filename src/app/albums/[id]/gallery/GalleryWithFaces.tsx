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
  thumbnail_url?: string | null;
  taken_at?: string | null;
}

interface Props {
  items: MediaItem[];
  albumId: string;
  albumTitle: string;
  firstQR?: { dataUrl: string; joinUrl: string; label: string } | null;
  page?: number;
  totalPages?: number;
}

export function GalleryWithFaces({ items, albumId, albumTitle, firstQR, page, totalPages }: Props) {
  return (
    <OwnerMediaGrid
      items={items}
      albumId={albumId}
      albumTitle={albumTitle}
      firstQR={firstQR}
      page={page}
      totalPages={totalPages}
    />
  );
}
