import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { LibraryContent, ContentCategory, ContentType } from '../types/library';

/**
 * Instagram-style offline-first caching service
 * Features:
 * - Content prefetching and caching
 * - Image caching with local storage
 * - Offline content access
 * - Smart cache management (LRU with size limits)
 * - Background sync when online
 */

// Cache configuration
const CACHE_CONFIG = {
  maxContentItems: 100,        // Maximum cached content items
  maxImageCacheSize: 50 * 1024 * 1024, // 50MB for images
  contentCacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  imageCacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  prefetchCount: 20,           // Number of items to prefetch
};

// Storage keys
const STORAGE_KEYS = {
  cachedContent: 'library_cached_content',
  contentMetadata: 'library_content_metadata',
  imageCacheIndex: 'library_image_cache_index',
  userPreferences: 'library_user_preferences',
  bookmarkedContent: 'library_bookmarked_content',
  offlineActions: 'library_offline_actions',
};

export interface CachedContentMetadata {
  id: string;
  cachedAt: number;
  lastAccessed: number;
  size: number;
  hasImages: boolean;
  imagePaths: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ImageCacheItem {
  url: string;
  localPath: string;
  cachedAt: number;
  lastAccessed: number;
  size: number;
}

export interface OfflineAction {
  id: string;
  type: 'bookmark' | 'unbookmark' | 'rate' | 'view';
  contentId: string;
  userId: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export interface UserCachePreferences {
  autoDownloadOnWifi: boolean;
  cacheQuality: 'low' | 'medium' | 'high';
  maxCacheSize: number;
  categories: ContentCategory[];
}

class OfflineCacheService {
  private imageCache = new Map<string, ImageCacheItem>();
  private contentCache = new Map<string, LibraryContent>();
  private isInitialized = false;
  private pendingImageDownloads = new Map<string, Promise<string | null>>();

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load cached content metadata
      await this.loadContentCache();
      await this.loadImageCacheIndex();
      
      // Clean up expired cache items
      await this.cleanupExpiredCache();
      
      this.isInitialized = true;
      console.log('Offline cache service initialized');
    } catch (error) {
      console.error('Failed to initialize offline cache service:', error);
    }
  }

  // ==================== CONTENT CACHING ====================

  /**
   * Cache content with intelligent prioritization
   */
  async cacheContent(
    content: LibraryContent[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const newMetadata: CachedContentMetadata[] = [];

      for (const item of content) {
        // Skip if already cached and fresh
        const existing = await this.getContentMetadata(item.id);
        if (existing && (timestamp - existing.cachedAt) < CACHE_CONFIG.contentCacheExpiry) {
          // Update last accessed
          existing.lastAccessed = timestamp;
          await this.updateContentMetadata(existing);
          continue;
        }

        // Cache the content
        this.contentCache.set(item.id, item);
        
        // Prepare to cache images
        const imagePaths: string[] = [];
        let hasImages = false;

        // Cache thumbnail
        if (item.thumbnailUrl) {
          try {
            const localPath = await this.cacheImage(item.thumbnailUrl, priority);
            if (localPath) {
              imagePaths.push(localPath);
              hasImages = true;
            }
          } catch (error) {
            console.error(`Failed to cache thumbnail for ${item.id}:`, error);
            // Continue processing other items even if one image fails
          }
        }

        // Cache video thumbnail for videos
        if (item.type === 'video' && item.videoUrl) {
          // Note: Video files are usually too large to cache
          // We only cache thumbnails and metadata
        }

        // Create metadata
        const metadata: CachedContentMetadata = {
          id: item.id,
          cachedAt: timestamp,
          lastAccessed: timestamp,
          size: this.estimateContentSize(item),
          hasImages,
          imagePaths,
          priority,
        };

        newMetadata.push(metadata);
      }

      // Save content cache
      await this.saveContentCache();
      
      // Update metadata
      for (const meta of newMetadata) {
        await this.updateContentMetadata(meta);
      }

      // Cleanup if cache is too large
      await this.manageCacheSize();

      console.log(`Cached ${newMetadata.length} content items`);
    } catch (error) {
      console.error('Failed to cache content:', error);
    }
  }

  /**
   * Get content from cache (offline-first)
   */
  async getCachedContent(
    filters: {
      category?: ContentCategory;
      type?: ContentType;
      limit?: number;
      bookmarksOnly?: boolean;
    } = {}
  ): Promise<LibraryContent[]> {
    try {
      await this.initialize();

      let cachedItems = Array.from(this.contentCache.values());

      // Apply filters
      if (filters.category) {
        cachedItems = cachedItems.filter(item => item.category === filters.category);
      }
      
      if (filters.type) {
        cachedItems = cachedItems.filter(item => item.type === filters.type);
      }

      if (filters.bookmarksOnly) {
        const bookmarkedIds = await this.getBookmarkedContentIds();
        cachedItems = cachedItems.filter(item => bookmarkedIds.includes(item.id));
      }

      // Sort by last accessed (most recent first)
      const metadata = await this.getAllContentMetadata();
      cachedItems.sort((a, b) => {
        const metaA = metadata.find(m => m.id === a.id);
        const metaB = metadata.find(m => m.id === b.id);
        return (metaB?.lastAccessed || 0) - (metaA?.lastAccessed || 0);
      });

      // Apply limit
      if (filters.limit) {
        cachedItems = cachedItems.slice(0, filters.limit);
      }

      // Update last accessed times
      const timestamp = Date.now();
      for (const item of cachedItems) {
        const meta = metadata.find(m => m.id === item.id);
        if (meta) {
          meta.lastAccessed = timestamp;
          await this.updateContentMetadata(meta);
        }
      }

      return cachedItems;
    } catch (error) {
      console.error('Failed to get cached content:', error);
      return [];
    }
  }

  /**
   * Get single content item from cache
   */
  async getCachedContentById(contentId: string): Promise<LibraryContent | null> {
    try {
      await this.initialize();
      
      const content = this.contentCache.get(contentId);
      if (content) {
        // Update last accessed
        const metadata = await this.getContentMetadata(contentId);
        if (metadata) {
          metadata.lastAccessed = Date.now();
          await this.updateContentMetadata(metadata);
        }
      }
      
      return content || null;
    } catch (error) {
      console.error('Failed to get cached content by ID:', error);
      return null;
    }
  }

  // ==================== IMAGE CACHING ====================

  /**
   * Cache image to local storage with duplicate download prevention
   */
  async cacheImage(
    imageUrl: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string | null> {
    try {
      // Check if already cached
      const existing = this.imageCache.get(imageUrl);
      if (existing) {
        // Check if file still exists
        const fileInfo = await FileSystem.getInfoAsync(existing.localPath);
        if (fileInfo.exists) {
          // Update last accessed
          existing.lastAccessed = Date.now();
          await this.saveImageCacheIndex();
          return existing.localPath;
        } else {
          // Remove from cache if file doesn't exist
          this.imageCache.delete(imageUrl);
        }
      }

      // Check if download is already in progress
      const pendingDownload = this.pendingImageDownloads.get(imageUrl);
      if (pendingDownload) {
        return await pendingDownload;
      }

      // Start new download and track it
      const downloadPromise = this.downloadAndCacheImage(imageUrl);
      this.pendingImageDownloads.set(imageUrl, downloadPromise);

      try {
        const result = await downloadPromise;
        return result;
      } finally {
        // Remove from pending downloads when complete
        this.pendingImageDownloads.delete(imageUrl);
      }
    } catch (error) {
      console.error('Failed to cache image:', error);
      this.pendingImageDownloads.delete(imageUrl);
      return null;
    }
  }

  /**
   * Internal method to download and cache image
   */
  private async downloadAndCacheImage(imageUrl: string): Promise<string | null> {
    try {
      // Generate local file path
      const filename = this.generateImageFilename(imageUrl);
      const localPath = `${FileSystem.documentDirectory}library_cache/${filename}`;

      // Ensure cache directory exists
      const cacheDir = `${FileSystem.documentDirectory}library_cache/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }
      } catch (dirError) {
        console.error('Failed to create cache directory:', dirError);
        return null;
      }

      // Download image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status === 200) {
        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const size = fileInfo.exists ? fileInfo.size || 0 : 0;

        // Create cache item
        const cacheItem: ImageCacheItem = {
          url: imageUrl,
          localPath,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          size,
        };

        this.imageCache.set(imageUrl, cacheItem);
        await this.saveImageCacheIndex();

        // Manage cache size
        await this.manageImageCacheSize();

        console.log(`Cached image: ${filename}`);
        return localPath;
      }

      return null;
    } catch (error) {
      console.error('Failed to download and cache image:', error);
      return null;
    }
  }

  /**
   * Get local path for cached image
   */
  async getCachedImagePath(imageUrl: string): Promise<string | null> {
    try {
      const cacheItem = this.imageCache.get(imageUrl);
      if (!cacheItem) {
        return null;
      }

      // Check if file still exists and has valid size
      const fileInfo = await FileSystem.getInfoAsync(cacheItem.localPath);
      if (!fileInfo.exists) {
        // Remove from cache if file doesn't exist
        this.imageCache.delete(imageUrl);
        await this.saveImageCacheIndex();
        return null;
      }

      // Check if file has valid size (not empty or corrupted)
      if (fileInfo.size === 0) {
        // Remove corrupted file
        try {
          await FileSystem.deleteAsync(cacheItem.localPath);
        } catch (e) {
          // Ignore delete errors
        }
        this.imageCache.delete(imageUrl);
        await this.saveImageCacheIndex();
        return null;
      }

      // Update last accessed
      cacheItem.lastAccessed = Date.now();
      await this.saveImageCacheIndex();

      // Ensure we return the path without file:// prefix - let the component handle it
      const cleanPath = cacheItem.localPath.startsWith('file://') 
        ? cacheItem.localPath.substring(7) 
        : cacheItem.localPath;
      
      return cleanPath;
    } catch (error) {
      console.error('Failed to get cached image path:', error);
      return null;
    }
  }

  // ==================== OFFLINE ACTIONS ====================

  /**
   * Queue action for offline execution
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: `${action.type}_${action.contentId}_${Date.now()}`,
        timestamp: Date.now(),
        synced: false,
      };

      const existingActions = await this.getOfflineActions();
      existingActions.push(offlineAction);
      
      await AsyncStorage.setItem(STORAGE_KEYS.offlineActions, JSON.stringify(existingActions));
      
      console.log(`Queued offline action: ${action.type} for ${action.contentId}`);
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  /**
   * Get all pending offline actions
   */
  async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.offlineActions);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline actions:', error);
      return [];
    }
  }

  /**
   * Mark offline action as synced
   */
  async markActionSynced(actionId: string): Promise<void> {
    try {
      const actions = await this.getOfflineActions();
      const action = actions.find(a => a.id === actionId);
      
      if (action) {
        action.synced = true;
        await AsyncStorage.setItem(STORAGE_KEYS.offlineActions, JSON.stringify(actions));
      }
    } catch (error) {
      console.error('Failed to mark action as synced:', error);
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Clean up expired cache items
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      
      // Clean up content cache
      const contentMetadata = await this.getAllContentMetadata();
      for (const meta of contentMetadata) {
        if (now - meta.cachedAt > CACHE_CONFIG.contentCacheExpiry) {
          this.contentCache.delete(meta.id);
          await this.removeContentMetadata(meta.id);
        }
      }

      // Clean up image cache
      const imagesToDelete: string[] = [];
      for (const [url, item] of this.imageCache.entries()) {
        if (now - item.cachedAt > CACHE_CONFIG.imageCacheExpiry) {
          // Delete local file
          try {
            await FileSystem.deleteAsync(item.localPath);
          } catch (e) {
            // File might not exist, ignore error
          }
          
          imagesToDelete.push(url);
        }
      }

      // Remove from cache
      imagesToDelete.forEach(url => this.imageCache.delete(url));
      if (imagesToDelete.length > 0) {
        await this.saveImageCacheIndex();
      }

      console.log(`Cleaned up ${imagesToDelete.length} expired images`);
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
    }
  }

  /**
   * Manage cache size using LRU eviction
   */
  async manageCacheSize(): Promise<void> {
    try {
      const metadata = await this.getAllContentMetadata();
      
      if (metadata.length <= CACHE_CONFIG.maxContentItems) return;

      // Sort by last accessed (oldest first)
      metadata.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Remove oldest items
      const itemsToRemove = metadata.slice(0, metadata.length - CACHE_CONFIG.maxContentItems);
      
      for (const meta of itemsToRemove) {
        this.contentCache.delete(meta.id);
        await this.removeContentMetadata(meta.id);
        
        // Delete associated images
        for (const imagePath of meta.imagePaths) {
          try {
            await FileSystem.deleteAsync(imagePath);
          } catch (e) {
            // Ignore errors
          }
        }
      }

      console.log(`Removed ${itemsToRemove.length} items from cache`);
    } catch (error) {
      console.error('Failed to manage cache size:', error);
    }
  }

  /**
   * Manage image cache size
   */
  async manageImageCacheSize(): Promise<void> {
    try {
      const totalSize = Array.from(this.imageCache.values())
        .reduce((sum, item) => sum + item.size, 0);

      if (totalSize <= CACHE_CONFIG.maxImageCacheSize) return;

      // Sort by last accessed (oldest first)
      const items = Array.from(this.imageCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      let currentSize = totalSize;
      
      for (const [url, item] of items) {
        if (currentSize <= CACHE_CONFIG.maxImageCacheSize) break;
        
        // Delete file
        try {
          await FileSystem.deleteAsync(item.localPath);
        } catch (e) {
          // Ignore errors
        }
        
        // Remove from cache
        this.imageCache.delete(url);
        currentSize -= item.size;
      }

      await this.saveImageCacheIndex();
      
      console.log(`Reduced image cache size to ${currentSize} bytes`);
    } catch (error) {
      console.error('Failed to manage image cache size:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    contentItems: number;
    imageItems: number;
    totalSize: number;
    lastCleanup: number;
  }> {
    try {
      const contentCount = this.contentCache.size;
      const imageCount = this.imageCache.size;
      const totalImageSize = Array.from(this.imageCache.values())
        .reduce((sum, item) => sum + item.size, 0);

      return {
        contentItems: contentCount,
        imageItems: imageCount,
        totalSize: totalImageSize,
        lastCleanup: Date.now(), // You might want to track this separately
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        contentItems: 0,
        imageItems: 0,
        totalSize: 0,
        lastCleanup: 0,
      };
    }
  }

  /**
   * Remove a broken cached image
   */
  async removeBrokenCachedImage(imageUrl: string): Promise<void> {
    try {
      console.log(`🗑️ Removing broken cached image: ${imageUrl}`);
      
      const cacheItem = this.imageCache.get(imageUrl);
      if (cacheItem) {
        // Delete the file
        try {
          await FileSystem.deleteAsync(cacheItem.localPath);
        } catch (e) {
          console.log('File delete error (may not exist):', e);
        }
        
        // Remove from cache
        this.imageCache.delete(imageUrl);
        await this.saveImageCacheIndex();
        
        console.log(`✅ Removed broken cached image: ${imageUrl}`);
      }
    } catch (error) {
      console.error('Failed to remove broken cached image:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      // Clear memory caches
      this.contentCache.clear();
      this.imageCache.clear();

      // Clear stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.cachedContent,
        STORAGE_KEYS.contentMetadata,
        STORAGE_KEYS.imageCacheIndex,
      ]);

      // Delete cache directory
      const cacheDir = `${FileSystem.documentDirectory}library_cache/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(cacheDir);
      }

      console.log('Cleared all cache');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private async loadContentCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.cachedContent);
      if (stored) {
        const contentArray: LibraryContent[] = JSON.parse(stored);
        contentArray.forEach(item => {
          this.contentCache.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Failed to load content cache:', error);
    }
  }

  private async saveContentCache(): Promise<void> {
    try {
      const contentArray = Array.from(this.contentCache.values());
      await AsyncStorage.setItem(STORAGE_KEYS.cachedContent, JSON.stringify(contentArray));
    } catch (error) {
      console.error('Failed to save content cache:', error);
    }
  }

  private async loadImageCacheIndex(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.imageCacheIndex);
      if (stored) {
        const imageItems: ImageCacheItem[] = JSON.parse(stored);
        imageItems.forEach(item => {
          this.imageCache.set(item.url, item);
        });
      }
    } catch (error) {
      console.error('Failed to load image cache index:', error);
    }
  }

  private async saveImageCacheIndex(): Promise<void> {
    try {
      const imageArray = Array.from(this.imageCache.values());
      await AsyncStorage.setItem(STORAGE_KEYS.imageCacheIndex, JSON.stringify(imageArray));
    } catch (error) {
      console.error('Failed to save image cache index:', error);
    }
  }

  private async getContentMetadata(contentId: string): Promise<CachedContentMetadata | null> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.contentMetadata}_${contentId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  private async updateContentMetadata(metadata: CachedContentMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.contentMetadata}_${metadata.id}`,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Failed to update content metadata:', error);
    }
  }

  private async removeContentMetadata(contentId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.contentMetadata}_${contentId}`);
    } catch (error) {
      console.error('Failed to remove content metadata:', error);
    }
  }

  private async getAllContentMetadata(): Promise<CachedContentMetadata[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metadataKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.contentMetadata));
      
      const metadataItems = await AsyncStorage.multiGet(metadataKeys);
      return metadataItems
        .filter(([, value]) => value !== null)
        .map(([, value]) => JSON.parse(value!));
    } catch (error) {
      console.error('Failed to get all content metadata:', error);
      return [];
    }
  }

  private async getBookmarkedContentIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.bookmarkedContent);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private generateImageFilename(url: string): string {
    try {
      // Create a safe filename from URL using MD5-like hash
      const hash = url.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      // Extract extension more carefully to avoid path separators
      let extension = 'jpg'; // default
      try {
        const urlWithoutParams = url.split('?')[0]; // Remove query parameters
        const pathParts = urlWithoutParams.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        
        // Only look for extension in the last part of the path
        if (lastPart && lastPart.includes('.')) {
          const extensionMatch = lastPart.match(/\.([a-zA-Z0-9]{1,5})$/);
          if (extensionMatch && extensionMatch[1]) {
            const ext = extensionMatch[1].toLowerCase();
            // Only allow safe image extensions (no path separators)
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
              extension = ext;
            }
          }
        }
      } catch (error) {
        // Use default extension if parsing fails
        extension = 'jpg';
      }
      
      // Create safe filename with timestamp for uniqueness
      const timestamp = Date.now().toString().slice(-6);
      const safeHash = Math.abs(hash).toString();
      
      return `img_${safeHash}_${timestamp}.${extension}`;
    } catch (error) {
      // Ultimate fallback - use timestamp only
      console.error('Error generating filename, using fallback:', error);
      return `img_${Date.now()}.jpg`;
    }
  }

  private estimateContentSize(content: LibraryContent): number {
    // Rough estimate of content size in bytes
    return JSON.stringify(content).length * 2; // UTF-16 encoding
  }
}

// Export singleton instance
export const offlineCacheService = new OfflineCacheService();