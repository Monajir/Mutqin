import type { BookmarkableContentType } from '@/types';

export interface BookmarkListItem {
  id: string;
  contentType: BookmarkableContentType;
  contentRef: string;
  collectionId: string | null;
  title: string;
  subtitle: string;
  arabic: string | null;
  translation: string | null;
  createdAt: string;
}

export interface ToggleBookmarkInput {
  contentType: BookmarkableContentType;
  contentRef: string;
  collectionId?: string;
}

export interface ToggleBookmarkResult {
  added: boolean;
  contentType: BookmarkableContentType;
  contentRef: string;
}
