import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserBookmarks, removeBookmark } from '../../../services/libraryService';
import { LibraryContent } from '../../../types/library';

export default function BookmarksScreen() {
  const { userProfile } = useAuth();
  const [bookmarks, setBookmarks] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not logged in
  if (!userProfile) {
    router.replace('/library');
    return null;
  }

  const loadBookmarks = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const userBookmarks = await getUserBookmarks(userProfile.uid);
      setBookmarks(userBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemoveBookmark = (contentId: string, title: string) => {
    Alert.alert(
      'Remove Bookmark',
      `Remove "${title}" from your bookmarks?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBookmark(userProfile.uid, contentId);
              setBookmarks(prev => prev.filter(item => item.id !== contentId));
            } catch (error) {
              console.error('Error removing bookmark:', error);
              Alert.alert('Error', 'Failed to remove bookmark. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderBookmarkItem = ({ item }: { item: LibraryContent }) => (
    <TouchableOpacity
      onPress={() => router.push(`/library/content/${item.id}`)}
      style={styles.bookmarkCard}
    >
      <View style={styles.cardContent}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons
              name={item.type === 'video' ? 'play-circle' : 'document-text'}
              size={32}
              color="#9ca3af"
            />
          </View>
        )}
        
        <View style={styles.contentInfo}>
          <View style={styles.contentHeader}>
            <View style={styles.typeContainer}>
              <Ionicons
                name={item.type === 'video' ? 'play-circle' : 'document-text'}
                size={16}
                color="#9333ea"
              />
              <Text style={styles.contentType}>
                {item.type}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveBookmark(item.id, item.title)}
              style={styles.removeButton}
            >
              <Ionicons name="bookmark" size={20} color="#9333ea" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.footer}>
            <View style={styles.authorInfo}>
              <Image
                source={{ 
                  uri: item.authorProfilePicture || 'https://via.placeholder.com/24' 
                }}
                style={styles.authorImage}
              />
              <Text style={styles.authorName}>
                {item.authorName}
              </Text>
            </View>
            
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.statText}>
                  {item.averageRating.toFixed(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={12} color="#6b7280" />
                <Text style={styles.statText}>
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      {/* Category Tag */}
      <View style={styles.categoryContainer}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>
            {item.category.replace('-', ' ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStats = () => {
    const articleCount = bookmarks.filter(item => item.type === 'article').length;
    const videoCount = bookmarks.filter(item => item.type === 'video').length;
    const categories = [...new Set(bookmarks.map(item => item.category))];

    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>
          Your Reading List
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {bookmarks.length}
            </Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberBlue]}>
              {articleCount}
            </Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberGreen]}>
              {videoCount}
            </Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberYellow]}>
              {categories.length}
            </Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading your bookmarks...</Text>
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
          <Text style={styles.headerTitle}>
            Saved Content
          </Text>
          <View style={styles.spacer} />
        </View>
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmarkItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={bookmarks.length > 0 ? renderStats : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBookmarks(true)}
            colors={['#9333ea']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              No saved content yet
            </Text>
            <Text style={styles.emptySubtitle}>
              Explore the library and save articles and videos for later reading
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/library')}
              style={styles.browseButton}
            >
              <Text style={styles.browseButtonText}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={styles.bottomSpacer} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  header: {
    backgroundColor: 'white',
    paddingTop: 48,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  spacer: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9333ea',
  },
  statNumberBlue: {
    color: '#3b82f6',
  },
  statNumberGreen: {
    color: '#10b981',
  },
  statNumberYellow: {
    color: '#f59e0b',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookmarkCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 96,
    height: 96,
  },
  thumbnailPlaceholder: {
    width: 96,
    height: 96,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
    padding: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentType: {
    fontSize: 12,
    color: '#9333ea',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  removeButton: {
    padding: 8,
    margin: -8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  authorName: {
    fontSize: 12,
    color: '#6b7280',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryTag: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#7c3aed',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});