export type ContentType = 'article' | 'video';
export type ContentCategory = 
  | 'leadership'
  | 'gender-equality'
  | 'career-development'
  | 'entrepreneurship'
  | 'work-life-balance'
  | 'communication'
  | 'negotiation'
  | 'networking'
  | 'personal-branding'
  | 'mentorship';

export interface LibraryContent {
  id: string;
  title: string;
  description: string;
  content: string; // Article text or video URL
  type: ContentType;
  category: ContentCategory;
  tags: string[];
  thumbnailUrl?: string; // For videos or article images
  
  // Metadata
  createdBy: string; // Mentor UID
  authorName: string; // Mentor display name
  authorProfilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  isPublished: boolean;
  
  // Engagement
  views: number;
  averageRating: number;
  totalRatings: number;
  bookmarkCount: number;
  
  // Video specific
  duration?: number; // Video duration in seconds
  videoUrl?: string;
  
  // Offline caching
  isCached?: boolean; // Local flag for offline availability
  lastCached?: Date;
  cacheSize?: number; // Size in bytes
}

export interface UserBookmark {
  id: string;
  userId: string;
  contentId: string;
  createdAt: Date;
}

export interface ContentRating {
  id: string;
  contentId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibrarySearchFilters {
  searchQuery?: string;
  category?: ContentCategory;
  type?: ContentType;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'rating' | 'views' | 'title';
  authorId?: string; // Filter by specific mentor
}

export interface CachedContent {
  id: string;
  content: LibraryContent;
  contentData?: string; // Cached article text or video file path
  thumbnailPath?: string; // Local thumbnail file path
  cachedAt: Date;
  lastAccessed: Date;
  size: number; // Size in bytes
}