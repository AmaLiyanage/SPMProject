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
      await Share.share({
        message: `Check out this ${content.type}: "${content.title}" by ${content.authorName} on HerPower`,
        url: `herpower://library/content/${content.id}`, // Deep link
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

    try {
      await rateContent(userProfile.uid, content.id, rating);
      setUserRating(rating);
      
      // Refresh content to get updated rating
      await loadContent();
    } catch (error) {
      console.error('Error rating content:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const renderStarRating = (rating: number, onPress?: (rating: number) => void) => (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onPress?.(star)}
          disabled={!onPress}
          className="mr-1"
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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#9333ea" />
        <Text className="mt-4 text-gray-600">Loading content...</Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-500">Content not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity
              onPress={handleShare}
              className="p-2"
            >
              <Ionicons name="share-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            
            {userProfile && (
              <TouchableOpacity
                onPress={handleBookmark}
                className="p-2"
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

      <ScrollView className="flex-1">
        {/* Thumbnail */}
        {content.thumbnailUrl && (
          <Image
            source={{ uri: content.thumbnailUrl }}
            style={{ width, height: width * 0.56 }} // 16:9 aspect ratio
            resizeMode="cover"
          />
        )}

        <View className="p-4">
          {/* Content Type Badge */}
          <View className="flex-row items-center mb-3">
            <Ionicons
              name={content.type === 'video' ? 'play-circle' : 'document-text'}
              size={20}
              color="#9333ea"
            />
            <Text className="text-purple-600 ml-2 uppercase text-sm font-medium">
              {content.type}
            </Text>
            {content.type === 'video' && content.duration && (
              <Text className="text-gray-500 ml-3 text-sm">
                {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
              </Text>
            )}
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-3">
            {content.title}
          </Text>

          {/* Author Info */}
          <View className="flex-row items-center mb-4">
            <Image
              source={{ 
                uri: content.authorProfilePicture || 'https://via.placeholder.com/40' 
              }}
              className="w-10 h-10 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">
                {content.authorName}
              </Text>
              <Text className="text-sm text-gray-500">
                {content.createdAt.toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {content.views}
              </Text>
              <Text className="text-xs text-gray-500">Views</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {content.averageRating.toFixed(1)}
              </Text>
              <Text className="text-xs text-gray-500">Rating</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {content.totalRatings}
              </Text>
              <Text className="text-xs text-gray-500">Reviews</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {content.bookmarkCount}
              </Text>
              <Text className="text-xs text-gray-500">Saved</Text>
            </View>
          </View>

          {/* Category and Tags */}
          <View className="mb-4">
            <View className="flex-row flex-wrap">
              <View className="bg-purple-100 px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-purple-700 text-sm capitalize">
                  {content.category.replace('-', ' ')}
                </Text>
              </View>
              {content.tags.map((tag, index) => (
                <View key={index} className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-gray-700 text-sm">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <Text className="text-gray-700 text-base mb-4 leading-6">
            {content.description}
          </Text>

          {/* Video Player or Article Content */}
          {content.type === 'video' && content.videoUrl ? (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3 text-gray-900">
                Video Content
              </Text>
              {/* Note: You'd integrate a proper video player here */}
              <View className="bg-gray-200 rounded-lg p-4 items-center">
                <Ionicons name="play-circle" size={48} color="#9333ea" />
                <Text className="text-gray-600 mt-2">Video Player Coming Soon</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  URL: {content.videoUrl}
                </Text>
              </View>
            </View>
          ) : (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3 text-gray-900">
                Article
              </Text>
              <Text className="text-gray-800 text-base leading-7">
                {content.content}
              </Text>
            </View>
          )}

          {/* Rating Section */}
          {userProfile && (
            <View className="mb-6 p-4 bg-gray-50 rounded-lg">
              <Text className="text-lg font-semibold mb-3 text-gray-900">
                Rate this {content.type}
              </Text>
              {renderStarRating(userRating, handleRate)}
              {userRating > 0 && (
                <Text className="text-sm text-green-600 mt-2">
                  Thank you for your rating!
                </Text>
              )}
            </View>
          )}

          {/* Reviews Section */}
          {ratings.length > 0 && (
            <View className="mb-6">
              <TouchableOpacity
                onPress={() => setShowRatings(!showRatings)}
                className="flex-row items-center justify-between mb-3"
              >
                <Text className="text-lg font-semibold text-gray-900">
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
                    <View key={rating.id} className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <View className="flex-row items-center justify-between mb-2">
                        {renderStarRating(rating.rating)}
                        <Text className="text-xs text-gray-500">
                          {rating.createdAt.toLocaleDateString()}
                        </Text>
                      </View>
                      {rating.review && (
                        <Text className="text-gray-700 text-sm">
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
    </View>
  );
}