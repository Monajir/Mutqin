import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookmarkableContentType } from '@/types';
import { bookmarkRepository } from './bookmarkRepository';
import type { ToggleBookmarkInput } from '../types/bookmark.types';

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: (contentType: BookmarkableContentType | null) => [...bookmarkKeys.all, 'list', contentType] as const,
  refs: (contentType: BookmarkableContentType) => [...bookmarkKeys.all, 'refs', contentType] as const,
};

export function useBookmarks(contentType: BookmarkableContentType | null = null) {
  return useQuery({
    queryKey: bookmarkKeys.list(contentType),
    queryFn: () => bookmarkRepository.getBookmarks(contentType),
    networkMode: 'always',
    staleTime: Infinity,
  });
}

export function useBookmarkRefs(contentType: BookmarkableContentType) {
  return useQuery({
    queryKey: bookmarkKeys.refs(contentType),
    queryFn: () => bookmarkRepository.getBookmarkRefs(contentType),
    networkMode: 'always',
    staleTime: Infinity,
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: ToggleBookmarkInput) => bookmarkRepository.toggleBookmark(input),
    onSuccess: (result) => {
      queryClient.setQueryData(bookmarkKeys.refs(result.contentType), bookmarkRepository.getBookmarkRefs(result.contentType));
      return queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => bookmarkRepository.removeBookmark(id),
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookmarkKeys.all }),
  });
}
