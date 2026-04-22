"use client";

import { useState } from "react";
import { OwnerMediaGrid } from "../OwnerMediaGrid";
import { FaceFilter } from "./FaceFilter";

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
  const [filteredIds, setFilteredIds] = useState<Set<string> | null>(null);

  const displayed = filteredIds ? items.filter((i) => filteredIds.has(i.id)) : items;

  return (
    <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 overflow-hidden">
      <FaceFilter items={items} albumId={albumId} onFilter={setFilteredIds} />
      <OwnerMediaGrid items={displayed} albumId={albumId} albumTitle={albumTitle} />
    </div>
  );
}
