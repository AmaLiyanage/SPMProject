import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  onSnapshot,
  QueryConstraint,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { 
  LibraryContent, 
  ContentType, 
  ContentCategory, 
  UserBookmark, 
  ContentRating,
  LibrarySearchFilters 
} from '../types/library';

/**
 * Library Service for mentor-only content creation and public browsing
 */

// ==================== MENTOR CONTENT MANAGEMENT ====================

/**
 * Create new library content (mentors only)
 */
export async function createLibraryContent(
  mentorId: string,
  mentorName: string,
  mentorProfilePicture: string | undefined,
  contentData: {
    title: string;
    description: string;
    content: string;
    type: ContentType;
    category: ContentCategory;
    tags: string[];
    thumbnailFile?: File | Blob;
    videoFile?: File | Blob;
    duration?: number;
  }
): Promise<string> {
  try {
    let thumbnailUrl = '';
    let videoUrl = '';

    // Upload thumbnail if provided
    if (contentData.thumbnailFile) {
      const thumbnailRef = ref(storage, `library/thumbnails/${Date.now()}_thumbnail`);
      const thumbnailSnapshot = await uploadBytes(thumbnailRef, contentData.thumbnailFile);
      thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
    }

    // Upload video if provided
    if (contentData.videoFile) {
      const videoRef = ref(storage, `library/videos/${Date.now()}_video`);
      const videoSnapshot = await uploadBytes(videoRef, contentData.videoFile);
      videoUrl = await getDownloadURL(videoSnapshot.ref);
    }

    const newContent: any = {
      title: contentData.title,
      description: contentData.description,
      content: contentData.content,
      type: contentData.type,
      category: contentData.category,
      tags: contentData.tags,
      
      createdBy: mentorId,
      authorName: mentorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
      isPublished: true,
      
      views: 0,
      averageRating: 0,
      totalRatings: 0,
      bookmarkCount: 0,
    };

    // Only add fields if they have values
    if (thumbnailUrl) {
      newContent.thumbnailUrl = thumbnailUrl;
    }
    
    if (mentorProfilePicture) {
      newContent.authorProfilePicture = mentorProfilePicture;
    }
    
    if (contentData.type === 'video' && videoUrl) {
      newContent.videoUrl = videoUrl;
    }
    
    if (contentData.duration) {
      newContent.duration = contentData.duration;
    }

    const docRef = await addDoc(collection(db, 'libraryContent'), newContent);

    return docRef.id;
  } catch (error) {
    console.error('Error creating library content:', error);
    throw error;
  }
}

/**
 * Update library content (mentors only, own content)
 */
export async function updateLibraryContent(
  contentId: string,
  mentorId: string,
  updates: Partial<Pick<LibraryContent, 'title' | 'description' | 'content' | 'category' | 'tags' | 'isPublished'>>
): Promise<void> {
  try {
    // Verify ownership
    const contentDoc = await getDoc(doc(db, 'libraryContent', contentId));
    if (!contentDoc.exists()) {
      throw new Error('Content not found');
    }

    const content = contentDoc.data() as LibraryContent;
    if (content.createdBy !== mentorId) {
      throw new Error('Permission denied: You can only edit your own content');
    }

    await updateDoc(doc(db, 'libraryContent', contentId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating library content:', error);
    throw error;
  }
}

/**
 * Delete library content (mentors only, own content)
 */
export async function deleteLibraryContent(contentId: string, mentorId: string): Promise<void> {
  try {
    // Verify ownership
    const contentDoc = await getDoc(doc(db, 'libraryContent', contentId));
    if (!contentDoc.exists()) {
      throw new Error('Content not found');
    }

    const content = contentDoc.data() as LibraryContent;
    if (content.createdBy !== mentorId) {
      throw new Error('Permission denied: You can only delete your own content');
    }

    // Delete associated files from storage
    if (content.thumbnailUrl) {
      try {
        const thumbnailRef = ref(storage, content.thumbnailUrl);
        await deleteObject(thumbnailRef);
      } catch (e) {
        console.warn('Failed to delete thumbnail:', e);
      }
    }

    if (content.videoUrl) {
      try {
        const videoRef = ref(storage, content.videoUrl);
        await deleteObject(videoRef);
      } catch (e) {
        console.warn('Failed to delete video:', e);
      }
    }

    // Delete content document
    await deleteDoc(doc(db, 'libraryContent', contentId));

    // Clean up related data (bookmarks, ratings)
    await cleanupContentReferences(contentId);
  } catch (error) {
    console.error('Error deleting library content:', error);
    throw error;
  }
}

/**
 * Get mentor's own content
 */
export async function getMentorContent(mentorId: string): Promise<LibraryContent[]> {
  try {
    const q = query(
      collection(db, 'libraryContent'),
      where('createdBy', '==', mentorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate(),
    })) as LibraryContent[];
  } catch (error) {
    console.error('Error fetching mentor content:', error);
    throw error;
  }
}

// ==================== PUBLIC BROWSING ====================

/**
 * Get library content with filtering and pagination
 */
export async function getLibraryContent(
  filters: LibrarySearchFilters = {},
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ content: LibraryContent[]; lastDoc?: DocumentSnapshot }> {
  try {
    const constraints: QueryConstraint[] = [
      where('isPublished', '==', true)
    ];

    // Apply filters
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters.authorId) {
      constraints.push(where('createdBy', '==', filters.authorId));
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        constraints.push(orderBy('averageRating', 'desc'));
        break;
      case 'views':
        constraints.push(orderBy('views', 'desc'));
        break;
      case 'title':
        constraints.push(orderBy('title', 'asc'));
        break;
      case 'oldest':
        constraints.push(orderBy('publishedAt', 'asc'));
        break;
      default:
        constraints.push(orderBy('publishedAt', 'desc'));
    }

    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'libraryContent'), ...constraints);
    const snapshot = await getDocs(q);

    const content = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate(),
    })) as LibraryContent[];

    return {
      content,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching library content:', error);
    throw error;
  }
}

/**
 * Search library content by text
 */
export async function searchLibraryContent(searchQuery: string): Promise<LibraryContent[]> {
  try {
    const q = query(
      collection(db, 'libraryContent'),
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const allContent = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate(),
    })) as LibraryContent[];

    // Client-side filtering for search
    const searchLower = searchQuery.toLowerCase();
    return allContent.filter(content =>
      content.title.toLowerCase().includes(searchLower) ||
      content.description.toLowerCase().includes(searchLower) ||
      content.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      content.authorName.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error('Error searching library content:', error);
    throw error;
  }
}

/**
 * Get single content item and increment view count
 */
export async function getContentById(contentId: string): Promise<LibraryContent | null> {
  try {
    const docRef = doc(db, 'libraryContent', contentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    // Increment view count
    await updateDoc(docRef, {
      views: increment(1)
    });

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      publishedAt: data.publishedAt?.toDate(),
    } as LibraryContent;
  } catch (error) {
    console.error('Error fetching content by ID:', error);
    throw error;
  }
}

// ==================== BOOKMARKS ====================

/**
 * Bookmark content for user
 */
export async function bookmarkContent(userId: string, contentId: string): Promise<void> {
  try {
    const bookmarkRef = collection(db, 'userBookmarks');
    await addDoc(bookmarkRef, {
      userId,
      contentId,
      createdAt: serverTimestamp(),
    });

    // Increment bookmark count
    await updateDoc(doc(db, 'libraryContent', contentId), {
      bookmarkCount: increment(1)
    });
  } catch (error) {
    console.error('Error bookmarking content:', error);
    throw error;
  }
}

/**
 * Remove bookmark
 */
export async function removeBookmark(userId: string, contentId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'userBookmarks'),
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Decrement bookmark count
    await updateDoc(doc(db, 'libraryContent', contentId), {
      bookmarkCount: increment(-1)
    });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
}

/**
 * Get user's bookmarked content
 */
export async function getUserBookmarks(userId: string): Promise<LibraryContent[]> {
  try {
    const bookmarksQuery = query(
      collection(db, 'userBookmarks'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const bookmarksSnapshot = await getDocs(bookmarksQuery);
    const contentIds = bookmarksSnapshot.docs.map(doc => doc.data().contentId);

    if (contentIds.length === 0) {
      return [];
    }

    // Get content details for bookmarked items
    const contentPromises = contentIds.map(id => getDoc(doc(db, 'libraryContent', id)));
    const contentDocs = await Promise.all(contentPromises);

    return contentDocs
      .filter(doc => doc.exists())
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()!.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()!.updatedAt?.toDate() || new Date(),
        publishedAt: doc.data()!.publishedAt?.toDate(),
      })) as LibraryContent[];
  } catch (error) {
    console.error('Error fetching user bookmarks:', error);
    throw error;
  }
}

/**
 * Check if content is bookmarked by user
 */
export async function isContentBookmarked(userId: string, contentId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'userBookmarks'),
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
}

// ==================== RATINGS ====================

/**
 * Rate content
 */
export async function rateContent(
  userId: string,
  contentId: string,
  rating: number,
  review?: string
): Promise<void> {
  try {
    // Check if user already rated this content
    const existingRatingQuery = query(
      collection(db, 'contentRatings'),
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );

    const existingSnapshot = await getDocs(existingRatingQuery);
    
    if (!existingSnapshot.empty) {
      // Update existing rating
      const ratingDoc = existingSnapshot.docs[0];
      await updateDoc(ratingDoc.ref, {
        rating,
        review,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new rating
      await addDoc(collection(db, 'contentRatings'), {
        userId,
        contentId,
        rating,
        review,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Recalculate average rating
    await recalculateContentRating(contentId);
  } catch (error) {
    console.error('Error rating content:', error);
    throw error;
  }
}

/**
 * Get content ratings
 */
export async function getContentRatings(contentId: string): Promise<ContentRating[]> {
  try {
    const q = query(
      collection(db, 'contentRatings'),
      where('contentId', '==', contentId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ContentRating[];
  } catch (error) {
    console.error('Error fetching content ratings:', error);
    throw error;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Recalculate average rating for content
 */
async function recalculateContentRating(contentId: string): Promise<void> {
  try {
    const ratingsQuery = query(
      collection(db, 'contentRatings'),
      where('contentId', '==', contentId)
    );

    const snapshot = await getDocs(ratingsQuery);
    const ratings = snapshot.docs.map(doc => doc.data().rating);

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings 
      : 0;

    await updateDoc(doc(db, 'libraryContent', contentId), {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings,
    });
  } catch (error) {
    console.error('Error recalculating content rating:', error);
    throw error;
  }
}

/**
 * Clean up content references when content is deleted
 */
async function cleanupContentReferences(contentId: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete bookmarks
    const bookmarksQuery = query(
      collection(db, 'userBookmarks'),
      where('contentId', '==', contentId)
    );
    const bookmarksSnapshot = await getDocs(bookmarksQuery);
    bookmarksSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete ratings
    const ratingsQuery = query(
      collection(db, 'contentRatings'),
      where('contentId', '==', contentId)
    );
    const ratingsSnapshot = await getDocs(ratingsQuery);
    ratingsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  } catch (error) {
    console.error('Error cleaning up content references:', error);
    throw error;
  }
}