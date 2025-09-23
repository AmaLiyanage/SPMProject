import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getLibraryContent, 
  searchLibraryContent,
  bookmarkContent,
  removeBookmark,
  isContentBookmarked 
} from '../../../services/libraryService';
import { LibraryContent, ContentCategory, ContentType, LibrarySearchFilters } from '../../../types/library';

const CATEGORIES: { key: ContentCategory; label: string; icon: string }[] = [
  { key: 'leadership', label: 'Leadership', icon: 'star' },
  { key: 'gender-equality', label: 'Gender Equality', icon: 'people' },
  { key: 'career-development', label: 'Career Development', icon: 'trending-up' },
  { key: 'entrepreneurship', label: 'Entrepreneurship', icon: 'business' },
  { key: 'work-life-balance', label: 'Work-Life Balance', icon: 'home' },
  { key: 'communication', label: 'Communication', icon: 'chatbubbles' },
  { key: 'negotiation', label: 'Negotiation', icon: 'people-circle' },
  { key: 'networking', label: 'Networking', icon: 'share-social' },
  { key: 'personal-branding', label: 'Personal Branding', icon: 'person-circle' },
  { key: 'mentorship', label: 'Mentorship', icon: 'school' },
];

export default function LibraryScreen() {
  const { userProfile } = useAuth();
  const [content, setContent] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | undefined>();
  const [selectedType, setSelectedType] = useState<ContentType | undefined>();
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  const loadContent = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      let results: LibraryContent[];

      if (searchQuery.trim()) {
        results = await searchLibraryContent(searchQuery);
      } else {
        const filters: LibrarySearchFilters = {
          category: selectedCategory,
          type: selectedType,
          sortBy: 'newest',
        };
        const response = await getLibraryContent(filters, 50);
        results = response.content;
      }

      setContent(results);

      // Load bookmark status for current user
      if (userProfile) {
        const bookmarkPromises = results.map(item => 
          isContentBookmarked(userProfile.uid, item.id)
        );
        const bookmarkStatuses = await Promise.all(bookmarkPromises);
        const bookmarkedSet = new Set<string>();
        results.forEach((item, index) => {
          if (bookmarkStatuses[index]) {
            bookmarkedSet.add(item.id);
          }
        });
        setBookmarkedItems(bookmarkedSet);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Error', 'Failed to load library content. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [selectedCategory, selectedType]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim() || (!searchQuery && content.length === 0)) {
        loadContent();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const handleBookmark = async (contentId: string) => {
    if (!userProfile) {
      Alert.alert('Sign In Required', 'Please sign in to bookmark content.');
      return;
    }

    try {
      const isBookmarked = bookmarkedItems.has(contentId);
      
      if (isBookmarked) {
        await removeBookmark(userProfile.uid, contentId);
        setBookmarkedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      } else {
        await bookmarkContent(userProfile.uid, contentId);
        setBookmarkedItems(prev => new Set(prev).add(contentId));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    }
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ key: undefined, label: 'All', icon: 'grid' }, ...CATEGORIES]}
        keyExtractor={(item) => item.key || 'all'}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedCategory(item.key)}
            style={[
              styles.categoryButton,
              selectedCategory === item.key ? styles.categoryButtonActive : styles.categoryButtonInactive
            ]}
          >
            <View style={styles.categoryButtonContent}>
              <Ionicons
                name={item.icon as any}
                size={16}
                color={selectedCategory === item.key ? 'white' : 'gray'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === item.key ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                ]}
              >
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderTypeFilter = () => (
    <View style={styles.typeFilterContainer}>
      <TouchableOpacity
        onPress={() => setSelectedType(undefined)}
        style={[
          styles.typeButton,
          selectedType === undefined ? styles.typeButtonActive : styles.typeButtonInactive
        ]}
      >
        <Text
          style={[
            styles.typeButtonText,
            selectedType === undefined ? styles.typeButtonTextActive : styles.typeButtonTextInactive
          ]}
        >
          All Types
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSelectedType('article')}
        style={[
          styles.typeButton,
          selectedType === 'article' ? styles.typeButtonActive : styles.typeButtonInactive
        ]}
      >
        <Text
          style={[
            styles.typeButtonText,
            selectedType === 'article' ? styles.typeButtonTextActive : styles.typeButtonTextInactive
          ]}
        >
          Articles
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSelectedType('video')}
        style={[
          styles.typeButton,
          selectedType === 'video' ? styles.typeButtonActive : styles.typeButtonInactive
        ]}
      >
        <Text
          style={[
            styles.typeButtonText,
            selectedType === 'video' ? styles.typeButtonTextActive : styles.typeButtonTextInactive
          ]}
        >
          Videos
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContentItem = ({ item }: { item: LibraryContent }) => (
    <TouchableOpacity
      onPress={() => router.push(`/library/content/${item.id}`)}
      style={styles.contentCard}
    >
      {item.thumbnailUrl && (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.contentThumbnail}
          resizeMode="cover"
        />
      )}
      <View style={styles.contentBody}>
        <View style={styles.contentHeader}>
          <View style={styles.contentTypeContainer}>
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
            onPress={() => handleBookmark(item.id)}
            style={styles.bookmarkButton}
          >
            <Ionicons
              name={bookmarkedItems.has(item.id) ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarkedItems.has(item.id) ? '#9333ea' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.contentTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.contentDescription} numberOfLines={3}>
          {item.description}
        </Text>
        
        <View style={styles.contentFooter}>
          <View style={styles.authorContainer}>
            <Image
              source={{ 
                uri: item.authorProfilePicture || 'https://via.placeholder.com/32' 
              }}
              style={styles.authorImage}
            />
            <Text style={styles.authorName}>
              {item.authorName}
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
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
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading library content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Library</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/library/bookmarks')}
              style={styles.headerButton}
            >
              <Ionicons name="bookmark" size={24} color="#9333ea" />
            </TouchableOpacity>
            {userProfile?.userType === 'mentor' && (
              <TouchableOpacity
                onPress={() => router.push('/library/my-content')}
                style={styles.headerButton}
              >
                <Ionicons name="library" size={24} color="#9333ea" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search articles, videos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderCategoryFilter()}
        {renderTypeFilter()}
      </View>

      {/* Content List */}
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={renderContentItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContent(true)}
            colors={['#9333ea']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {searchQuery 
                ? `No content found for "${searchQuery}"`
                : 'No content available'
              }
            </Text>
            {userProfile?.userType === 'mentor' && (
              <TouchableOpacity
                onPress={() => router.push('/library/create-content')}
                style={styles.createButton}
              >
                <Text style={styles.createButtonText}>Create Content</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Floating Action Button for Mentors */}
      {userProfile?.userType === 'mentor' && (
        <TouchableOpacity
          onPress={() => router.push('/library/create-content')}
          style={styles.fab}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#111827',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryFilterContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  categoryButtonInactive: {
    backgroundColor: 'white',
    borderColor: '#d1d5db',
  },
  categoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryButtonTextInactive: {
    color: '#374151',
  },
  typeFilterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeButtonActive: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  typeButtonInactive: {
    backgroundColor: 'white',
    borderColor: '#d1d5db',
  },
  typeButtonText: {
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  typeButtonTextInactive: {
    color: '#374151',
  },
  listContainer: {
    padding: 16,
  },
  contentCard: {
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
  contentThumbnail: {
    width: '100%',
    height: 192,
  },
  contentBody: {
    padding: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentType: {
    fontSize: 12,
    color: '#9333ea',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  bookmarkButton: {
    padding: 8,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  contentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  contentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  authorName: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
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
  createButton: {
    marginTop: 16,
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#9333ea',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});