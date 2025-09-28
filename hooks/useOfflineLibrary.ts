import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { LibraryContent, ContentCategory, ContentType, LibrarySearchFilters } from '../types/library';
import { offlineCacheService, UserCachePreferences } from '../services/offlineCacheService';
import { 
  getLibraryContent, 
  searchLibraryContent, 
  getUserBookmarks,
  bookmarkContent,
  removeBookmark,
  rateContent,
} from '../services/libraryService';

export interface OfflineLibraryState {
  content: LibraryContent[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  cacheStats: {
    contentItems: number;
    imageItems: number;
    totalSize: number;
  };
}

export interface OfflineLibraryActions {
  loadContent: (filters?: LibrarySearchFilters, forceOnline?: boolean) => Promise<void>;
  searchContent: (query: string, forceOnline?: boolean) => Promise<LibraryContent[]>;
  bookmarkContentOffline: (contentId: string) => Promise<void>;
  removeBookmarkOffline: (contentId: string) => Promise<void>;
  rateContentOffline: (contentId: string, rating: number, review?: string) => Promise<void>;
  syncOfflineActions: () => Promise<void>;
  prefetchContent: (categories?: ContentCategory[]) => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<void>;
}

export const useOfflineLibrary = (userId?: string) => {
  const [state, setState] = useState<OfflineLibraryState>({
    content: [],
    isLoading: true,
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    cacheStats: {
      contentItems: 0,
      imageItems: 0,
      totalSize: 0,
    },
  });

  // Initialize offline cache service
  useEffect(() => {
    offlineCacheService.initialize();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(netState => {
      const wasOffline = !state.isOnline;
      const isNowOnline = netState.isConnected && netState.isInternetReachable;
      
      setState(prev => ({ ...prev, isOnline: isNowOnline || false }));

      // Auto-sync when coming back online
      if (wasOffline && isNowOnline && userId) {
        console.log('📱 Back online - syncing content silently...');
        syncOfflineActions();
        
        // Silently refresh main content to show latest data (including deletions)
        setTimeout(async () => {
          try {
            const response = await getLibraryContent({}, 50);
            if (response.content.length > 0) {
              await offlineCacheService.cacheContent(response.content, 'medium');
              // Update content state silently without loading indicators
              setState(prev => ({ 
                ...prev, 
                content: response.content,
                lastSyncTime: Date.now(),
              }));
              console.log('✅ Content silently refreshed after coming online');
            }
          } catch (error) {
            console.log('❌ Silent refresh failed after coming online');
          }
        }, 1000); // Small delay to ensure connection is stable
        
        prefetchContent(); // Prefetch additional content for cache
      }
    });

    return unsubscribe;
  }, [state.isOnline, userId]);

  // Load content (offline-first approach) - Cache ALL library content from all mentors
  const loadContent = useCallback(async (
    filters: LibrarySearchFilters = {},
    forceOnline = false
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      let content: LibraryContent[] = [];

      // Always try cached content first (Instagram-style)
      const cachedContent = await offlineCacheService.getCachedContent({
        category: filters.category,
        type: filters.type,
        limit: 50,
      });

      if (cachedContent.length > 0 && !forceOnline) {
        // Use cached content immediately for fast loading
        setState(prev => ({ 
          ...prev, 
          content: cachedContent,
          isLoading: false,
        }));

        // If online, fetch fresh content in background and update cache
        if (state.isOnline) {
          try {
            const response = await getLibraryContent(filters, 50);
            if (response.content.length > 0) {
              // Cache ALL content from library (all mentors)
              await offlineCacheService.cacheContent(response.content, 'medium');
              
              // Update state with fresh content
              setState(prev => ({ 
                ...prev, 
                content: response.content,
                lastSyncTime: Date.now(),
              }));
            }
          } catch (error) {
            console.log('Background fetch failed, using cached content');
          }
        }
      } else {
        // No cached content or force online - fetch from server
        if (state.isOnline) {
          const response = await getLibraryContent(filters, 50);
          content = response.content;
          
          // Cache ALL fetched content (from all mentors)
          if (content.length > 0) {
            await offlineCacheService.cacheContent(content, forceOnline ? 'high' : 'medium');
          }
        } else {
          // Offline and no cache - show empty
          content = [];
        }

        setState(prev => ({ 
          ...prev, 
          content,
          isLoading: false,
          lastSyncTime: state.isOnline && content.length > 0 ? Date.now() : prev.lastSyncTime,
        }));
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      
      // Always fallback to cached content on error
      const cachedContent = await offlineCacheService.getCachedContent({
        category: filters.category,
        type: filters.type,
        limit: 50,
      });
      
      setState(prev => ({ 
        ...prev, 
        content: cachedContent,
        isLoading: false,
      }));
    }
  }, [state.isOnline]);

  // Search content (offline-first)
  const searchContent = useCallback(async (
    query: string,
    forceOnline = false
  ): Promise<LibraryContent[]> => {
    try {
      // Don't set loading for searches to prevent page reload and keyboard dismissal
      let results: LibraryContent[] = [];

      if (state.isOnline && forceOnline) {
        // Online search
        results = await searchLibraryContent(query);
        
        // Cache search results
        await offlineCacheService.cacheContent(results, 'medium');
      } else {
        // Offline search in cached content
        const cachedContent = await offlineCacheService.getCachedContent();
        const searchLower = query.toLowerCase();
        
        results = cachedContent.filter(content =>
          content.title.toLowerCase().includes(searchLower) ||
          content.description.toLowerCase().includes(searchLower) ||
          content.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          content.authorName.toLowerCase().includes(searchLower)
        );

        console.log(`Search "${query}" found ${results.length} results in cache`);

        // If no results and we're online, try online search
        if (results.length === 0 && state.isOnline) {
          results = await searchLibraryContent(query);
          await offlineCacheService.cacheContent(results, 'medium');
        }
      }

      // Update the content state with search results (without loading states)
      setState(prev => ({ 
        ...prev, 
        content: results
      }));

      return results;
    } catch (error) {
      console.error('Failed to search content:', error);
      return [];
    }
  }, [state.isOnline]);

  // Bookmark content (offline-capable)
  const bookmarkContentOffline = useCallback(async (contentId: string) => {
    if (!userId) return;

    try {
      if (state.isOnline) {
        // Try online first
        await bookmarkContent(userId, contentId);
      } else {
        // Queue for offline sync
        await offlineCacheService.queueOfflineAction({
          type: 'bookmark',
          contentId,
          userId,
          data: {},
        });
      }

      // Update local state immediately for better UX
      setState(prev => ({
        ...prev,
        content: prev.content.map(item => 
          item.id === contentId 
            ? { ...item, bookmarkCount: item.bookmarkCount + 1 }
            : item
        ),
      }));
    } catch (error) {
      console.error('Failed to bookmark content:', error);
      
      // Queue for offline sync on error
      await offlineCacheService.queueOfflineAction({
        type: 'bookmark',
        contentId,
        userId,
        data: {},
      });
    }
  }, [userId, state.isOnline]);

  // Remove bookmark (offline-capable)
  const removeBookmarkOffline = useCallback(async (contentId: string) => {
    if (!userId) return;

    try {
      if (state.isOnline) {
        await removeBookmark(userId, contentId);
      } else {
        await offlineCacheService.queueOfflineAction({
          type: 'unbookmark',
          contentId,
          userId,
          data: {},
        });
      }

      // Update local state immediately
      setState(prev => ({
        ...prev,
        content: prev.content.map(item => 
          item.id === contentId 
            ? { ...item, bookmarkCount: Math.max(0, item.bookmarkCount - 1) }
            : item
        ),
      }));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      
      await offlineCacheService.queueOfflineAction({
        type: 'unbookmark',
        contentId,
        userId,
        data: {},
      });
    }
  }, [userId, state.isOnline]);

  // Rate content (offline-capable)
  const rateContentOffline = useCallback(async (
    contentId: string, 
    rating: number, 
    review?: string
  ) => {
    if (!userId) return;

    try {
      if (state.isOnline) {
        await rateContent(userId, contentId, rating, review);
      } else {
        await offlineCacheService.queueOfflineAction({
          type: 'rate',
          contentId,
          userId,
          data: { rating, review },
        });
      }

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        content: prev.content.map(item => 
          item.id === contentId 
            ? { 
                ...item, 
                totalRatings: item.totalRatings + 1,
                // Rough estimate of new average
                averageRating: (item.averageRating * item.totalRatings + rating) / (item.totalRatings + 1)
              }
            : item
        ),
      }));
    } catch (error) {
      console.error('Failed to rate content:', error);
      
      await offlineCacheService.queueOfflineAction({
        type: 'rate',
        contentId,
        userId,
        data: { rating, review },
      });
    }
  }, [userId, state.isOnline]);

  // Sync offline actions when online
  const syncOfflineActions = useCallback(async () => {
    if (!state.isOnline || !userId) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true }));

      const pendingActions = await offlineCacheService.getOfflineActions();
      const unsynced = pendingActions.filter(action => !action.synced);

      for (const action of unsynced) {
        try {
          switch (action.type) {
            case 'bookmark':
              await bookmarkContent(action.userId, action.contentId);
              break;
            case 'unbookmark':
              await removeBookmark(action.userId, action.contentId);
              break;
            case 'rate':
              await rateContent(
                action.userId, 
                action.contentId, 
                action.data.rating, 
                action.data.review
              );
              break;
          }

          // Mark as synced
          await offlineCacheService.markActionSynced(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Continue with other actions
        }
      }

      setState(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isOnline, userId]);

  // Prefetch content for offline use - Focus on popular content from all mentors
  const prefetchContent = useCallback(async (categories?: ContentCategory[]) => {
    if (!state.isOnline) return;

    try {
      console.log('Starting comprehensive content prefetch...');
      
      // 1. Prefetch most popular content overall (all mentors)
      const popularResponse = await getLibraryContent(
        { sortBy: 'views' }, 
        20 // Top 20 most viewed across all categories
      );
      if (popularResponse.content.length > 0) {
        await offlineCacheService.cacheContent(popularResponse.content, 'medium');
        console.log(`Cached ${popularResponse.content.length} popular items`);
      }

      // 2. Prefetch newest content (all mentors)
      const newestResponse = await getLibraryContent(
        { sortBy: 'newest' }, 
        15 // Latest 15 items
      );
      if (newestResponse.content.length > 0) {
        await offlineCacheService.cacheContent(newestResponse.content, 'medium');
        console.log(`Cached ${newestResponse.content.length} newest items`);
      }

      // 3. Prefetch top-rated content (all mentors)
      const topRatedResponse = await getLibraryContent(
        { sortBy: 'rating' }, 
        15 // Top 15 rated items
      );
      if (topRatedResponse.content.length > 0) {
        await offlineCacheService.cacheContent(topRatedResponse.content, 'medium');
        console.log(`Cached ${topRatedResponse.content.length} top-rated items`);
      }

      // 4. Prefetch from key categories (all mentors in each category)
      const categoriesToPrefetch = categories || [
        'leadership',
        'career-development', 
        'entrepreneurship',
        'work-life-balance',
        'communication'
      ];

      for (const category of categoriesToPrefetch) {
        const response = await getLibraryContent(
          { category, sortBy: 'views' }, 
          8 // Top 8 from each category
        );
        
        if (response.content.length > 0) {
          await offlineCacheService.cacheContent(response.content, 'low');
          console.log(`Cached ${response.content.length} items from ${category}`);
        }
      }

      // 5. Prefetch user's bookmarks with high priority (if available)
      if (userId) {
        try {
          const bookmarks = await getUserBookmarks(userId);
          if (bookmarks.length > 0) {
            await offlineCacheService.cacheContent(bookmarks, 'high');
            console.log(`Cached ${bookmarks.length} user bookmarks`);
          }
        } catch (error) {
          console.log('Could not prefetch user bookmarks');
        }
      }

      console.log('✅ Content prefetching completed - All mentors content cached!');
    } catch (error) {
      console.error('Failed to prefetch content:', error);
    }
  }, [state.isOnline, userId]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await offlineCacheService.clearAllCache();
      setState(prev => ({
        ...prev,
        cacheStats: {
          contentItems: 0,
          imageItems: 0,
          totalSize: 0,
        },
      }));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      const stats = await offlineCacheService.getCacheStats();
      setState(prev => ({ ...prev, cacheStats: stats }));
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  }, []);

  // Initial cache stats load
  useEffect(() => {
    getCacheStats();
  }, [getCacheStats]);

  return {
    ...state,
    actions: {
      loadContent,
      searchContent,
      bookmarkContentOffline,
      removeBookmarkOffline,
      rateContentOffline,
      syncOfflineActions,
      prefetchContent,
      clearCache,
      getCacheStats,
    },
  };
};