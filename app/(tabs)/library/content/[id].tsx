import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  TextInput,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../../contexts/AuthContext';
import { 
  getContentById, 
  bookmarkContent, 
  removeBookmark, 
  isContentBookmarked,
  rateContent,
  getContentRatings 
} from '../../../../services/libraryService';
import { LibraryContent, ContentRating } from '../../../../types/library';
import { OfflineImage } from '../../../../components/OfflineImage';
import { ContentVideoPlayer } from '../../../../components/ContentVideoPlayer';

const { width } = Dimensions.get('window');

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [content, setContent] = useState<LibraryContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratings, setRatings] = useState<ContentRating[]>([]);
  const [showRatings, setShowRatings] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadContent();
    }
  }, [id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const contentData = await getContentById(id!);
      
      if (!contentData) {
        Alert.alert('Error', 'Content not found.');
        router.back();
        return;
      }

      setContent(contentData);

      // Load bookmark status and ratings for logged-in users
      if (userProfile) {
        const bookmarkStatus = await isContentBookmarked(userProfile.uid, id!);
        setIsBookmarked(bookmarkStatus);

        const contentRatings = await getContentRatings(id!);
        setRatings(contentRatings);

        // Find user's rating
        const userRatingData = contentRatings.find(r => r.userId === userProfile.uid);
        if (userRatingData) {
          setUserRating(userRatingData.rating);
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!userProfile || !content) {
      Alert.alert('Sign In Required', 'Please sign in to bookmark content.');
      return;
    }

    try {
      if (isBookmarked) {
        await removeBookmark(userProfile.uid, content.id);
        setIsBookmarked(false);
      } else {
        await bookmarkContent(userProfile.uid, content.id);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!content) return;

    try {
      // Create rich text content for sharing
      const shareContent = `📚 ${content.title}
      
👤 By: ${content.authorName}
🏷️ Category: ${content.category.replace('-', ' ')}
⭐ Rating: ${content.averageRating.toFixed(1)} (${content.totalRatings} reviews)

📖 Description:
${content.description}

${content.type === 'article' ? '📄 Article Content:' : '🎥 Video Description:'}
${content.content}

---
Shared from HerPower - Empowering Women Leaders
#WomenInLeadership #HerPower #${content.category.replace('-', '')}`;

      await Share.share({
        message: shareContent,
        title: `${content.title} - HerPower`,
      });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!userProfile || !content) {
      Alert.alert('Sign In Required', 'Please sign in to rate content.');
      return;
    }

    // If rating is selected, show review input
    if (rating > 0 && !showReviewInput) {
      setShowReviewInput(true);
      return;
    }

    try {
      await rateContent(userProfile.uid, content.id, rating, reviewText.trim() || undefined);
      setUserRating(rating);
      setShowReviewInput(false);
      setReviewText('');
      
      // Refresh content to get updated rating
      await loadContent();
    } catch (error) {
      console.error('Error rating content:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating first.');
      return;
    }
    await handleRate(userRating);
  };

  const renderStarRating = (rating: number, onPress?: (rating: number) => void) => (
    <View style={styles.starRatingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onPress?.(star)}
          disabled={!onPress}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color="#fbbf24"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Content not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.actionButton}
            >
              <Ionicons name="share-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            
            {userProfile && (
              <TouchableOpacity
                onPress={handleBookmark}
                style={styles.actionButton}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={isBookmarked ? '#9333ea' : '#6b7280'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Media Section - Video or Thumbnail */}
        {content.thumbnailUrl && (
          <View style={styles.mediaContainer}>
            {content.type === 'video' && content.videoUrl ? (
              <ContentVideoPlayer
                uri={content.videoUrl}
                thumbnailUri={content.thumbnailUrl}
                title={content.title}
                style={styles.mediaPlayer}
                onPlaybackStatusUpdate={(status) => {
                  console.log('Video status:', status);
                }}
              />
            ) : (
              <Image
                source={{ uri: content.thumbnailUrl }}
                style={[styles.thumbnail, { width, height: width * 0.56 }]}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            )}
            {imageLoading && content.type !== 'video' && (
              <View style={[styles.thumbnailLoader, { width, height: width * 0.56 }]}>
                <ActivityIndicator size="large" color="#9333ea" />
              </View>
            )}
          </View>
        )}

        <View style={styles.contentContainer}>
          {/* Content Type Badge */}
          <View style={styles.typeBadgeContainer}>
            <Ionicons
              name={content.type === 'video' ? 'play-circle' : 'document-text'}
              size={20}
              color="#9333ea"
            />
            <Text style={styles.typeBadgeText}>
              {content.type}
            </Text>
            {content.type === 'video' && content.duration && (
              <Text style={styles.durationText}>
                {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
              </Text>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {content.title}
          </Text>

          {/* Author Info */}
          <View style={styles.authorContainer}>
            <OfflineImage
              uri={content.authorProfilePicture}
              style={styles.authorImage}
              resizeMode="cover"
              priority="high"
              hideLoadingIndicator={true}
              fallbackSource={require('../../../../assets/images/default-mentor-avatar.png')}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                {content.authorName}
              </Text>
              <Text style={styles.authorDate}>
                {content.createdAt.toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {content.views}
              </Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {content.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {content.totalRatings}
              </Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {content.bookmarkCount}
              </Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>

          {/* Category and Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.tagsWrapper}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>
                  {content.category.replace('-', ' ')}
                </Text>
              </View>
              {content.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {content.description}
          </Text>

          {/* Content */}
          {content.content && (
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>
                {content.type === 'video' ? 'About this video' : 'Article'}
              </Text>
              <Text style={styles.articleContent}>
                {content.content}
              </Text>
            </View>
          )}

          {/* Rating Section */}
          {userProfile && content.createdBy !== userProfile.uid && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>
                Rate this {content.type}
              </Text>
              {renderStarRating(userRating, handleRate)}
              
              {/* Review Input */}
              {showReviewInput && (
                <View style={styles.reviewInputSection}>
                  <Text style={styles.reviewInputLabel}>
                    Add a review (optional)
                  </Text>
                  <TextInput
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Share your thoughts about this content..."
                    multiline
                    numberOfLines={3}
                    style={styles.reviewInput}
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>
                    {reviewText.length}/500 characters
                  </Text>
                  <View style={styles.reviewButtons}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowReviewInput(false);
                        setReviewText('');
                      }}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      style={styles.submitButton}
                    >
                      <Text style={styles.submitButtonText}>Submit Review</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {userRating > 0 && !showReviewInput && (
                <Text style={styles.ratingSuccessText}>
                  Thank you for your rating!
                </Text>
              )}
            </View>
          )}
          
          {/* Author's Own Content Message */}
          {userProfile && content.createdBy === userProfile.uid && (
            <View style={styles.ownContentSection}>
              <Text style={styles.ownContentTitle}>
                Your {content.type}
              </Text>
              <Text style={styles.ownContentText}>
                You cannot rate your own content, but you can view ratings from other users below.
              </Text>
            </View>
          )}

          {/* Reviews Section */}
          {ratings.length > 0 && (
            <View style={styles.reviewsSection}>
              <TouchableOpacity
                onPress={() => setShowRatings(!showRatings)}
                style={styles.reviewsHeader}
              >
                <Text style={styles.reviewsTitle}>
                  Reviews ({ratings.length})
                </Text>
                <Ionicons
                  name={showRatings ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
              
              {showRatings && (
                <View>
                  {ratings.slice(0, 5).map((rating) => (
                    <View key={rating.id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        {renderStarRating(rating.rating)}
                        <Text style={styles.reviewDate}>
                          {rating.createdAt.toLocaleDateString()}
                        </Text>
                      </View>
                      {rating.review && (
                        <Text style={styles.reviewText}>
                          {rating.review}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      <View style={styles.bottomSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
  },
  notFoundText: {
    fontSize: 18,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  mediaContainer: {
    position: 'relative',
  },
  mediaPlayer: {
    width: '100%',
  },
  thumbnail: {
    // Dynamic width and height are passed as style prop
  },
  thumbnailLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  contentContainer: {
    padding: 16,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadgeText: {
    color: '#9333ea',
    marginLeft: 8,
    textTransform: 'uppercase',
    fontSize: 14,
    fontWeight: '500',
  },
  durationText: {
    color: '#6b7280',
    marginLeft: 12,
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  authorDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryTagText: {
    color: '#7c3aed',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#374151',
    fontSize: 14,
  },
  description: {
    color: '#374151',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  articleContent: {
    color: '#1f2937',
    fontSize: 16,
    lineHeight: 28,
  },
  ratingSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  ratingSuccessText: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
  },
  reviewInputSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reviewInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#9333ea',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  ownContentSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  ownContentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0369a1',
  },
  ownContentText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  starRatingContainer: {
    flexDirection: 'row',
  },
  starButton: {
    marginRight: 4,
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  reviewItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewText: {
    color: '#374151',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 100,
  },
});