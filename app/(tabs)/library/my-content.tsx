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
import { OfflineImage } from '../../../components/OfflineImage';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../contexts/AuthContext';
import { getMentorContent, deleteLibraryContent } from '../../../services/libraryService';
import { LibraryContent } from '../../../types/library';

export default function MyContentScreen() {
  const { userProfile } = useAuth();
  const [content, setContent] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not a mentor
  if (userProfile?.userType !== 'mentor') {
    router.replace('/library');
    return null;
  }

  const loadContent = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const mentorContent = await getMentorContent(userProfile.uid);
      setContent(mentorContent);
    } catch (error) {
      console.error('Error loading mentor content:', error);
      Alert.alert('Error', 'Failed to load your content. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const handleDelete = (contentId: string, title: string) => {
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLibraryContent(contentId, userProfile.uid);
              setContent(prev => prev.filter(item => item.id !== contentId));
              Alert.alert('Success', 'Content deleted successfully.');
            } catch (error) {
              console.error('Error deleting content:', error);
              Alert.alert('Error', 'Failed to delete content. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderContentItem = ({ item }: { item: LibraryContent }) => (
    <View style={styles.contentCard}>
      <View style={styles.cardContent}>
{item.thumbnailUrl ? (
          <OfflineImage
            uri={item.thumbnailUrl}
            style={styles.thumbnail}
            resizeMode="cover"
            priority="medium"
            fallbackIcon={item.type === 'video' ? 'play-circle' : 'document-text'}
            placeholder={
              <View style={styles.thumbnailPlaceholder}>
                <ActivityIndicator size="small" color="#9333ea" />
              </View>
            }
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
            <View style={[styles.statusBadge, item.isPublished ? styles.statusBadgePublished : styles.statusBadgeDraft]}>
              <Text style={[styles.statusText, item.isPublished ? styles.statusTextPublished : styles.statusTextDraft]}>
                {item.isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.footer}>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.statText}>
                  {item.averageRating.toFixed(1)} ({item.totalRatings})
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={12} color="#6b7280" />
                <Text style={styles.statText}>
                  {item.views}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="bookmark" size={12} color="#6b7280" />
                <Text style={styles.statText}>
                  {item.bookmarkCount}
                </Text>
              </View>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => router.push(`/library/edit-content/${item.id}`)}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.title)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => router.push(`/library/content/${item.id}`)}
          style={styles.actionBarButton}
        >
          <Ionicons name="eye-outline" size={16} color="#6b7280" />
          <Text style={styles.actionBarText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/library/edit-content/${item.id}`)}
          style={[styles.actionBarButton, styles.actionBarButtonBorder]}
        >
          <Ionicons name="create-outline" size={16} color="#6b7280" />
          <Text style={styles.actionBarText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBarButton}
        >
          <Ionicons
            name={item.isPublished ? 'eye-off-outline' : 'eye-outline'}
            size={16}
            color="#6b7280"
          />
          <Text style={styles.actionBarText}>
            {item.isPublished ? 'Unpublish' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => {
    const totalViews = content.reduce((sum, item) => sum + item.views, 0);
    const totalBookmarks = content.reduce((sum, item) => sum + item.bookmarkCount, 0);
    const avgRating = content.length > 0 
      ? content.reduce((sum, item) => sum + item.averageRating, 0) / content.length 
      : 0;

    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>
          Content Overview
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {content.length}
            </Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberBlue]}>
              {totalViews}
            </Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberGreen]}>
              {totalBookmarks}
            </Text>
            <Text style={styles.statLabel}>Bookmarks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberYellow]}>
              {avgRating.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading your content...</Text>
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
            My Content
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/library/create-content')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={renderContentItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={content.length > 0 ? renderStats : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContent(true)}
            colors={['#9333ea']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              No content created yet
            </Text>
            <Text style={styles.emptySubtitle}>
              Start sharing your expertise with the HerPower community
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/library/create-content')}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>Create Your First Content</Text>
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
  addButton: {
    padding: 8,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgePublished: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeDraft: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextPublished: {
    color: '#166534',
  },
  statusTextDraft: {
    color: '#92400e',
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
  stats: {
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBarButton: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBarButtonBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f3f4f6',
  },
  actionBarText: {
    color: '#6b7280',
    marginLeft: 8,
    fontSize: 14,
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
  createButton: {
    marginTop: 24,
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});