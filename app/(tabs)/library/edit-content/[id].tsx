import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../contexts/AuthContext';
import { getContentById, updateLibraryContent } from '../../../../services/libraryService';
import { ContentCategory, LibraryContent } from '../../../../types/library';

const CATEGORIES: { key: ContentCategory; label: string }[] = [
  { key: 'leadership', label: 'Leadership' },
  { key: 'gender-equality', label: 'Gender Equality' },
  { key: 'career-development', label: 'Career Development' },
  { key: 'entrepreneurship', label: 'Entrepreneurship' },
  { key: 'work-life-balance', label: 'Work-Life Balance' },
  { key: 'communication', label: 'Communication' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'networking', label: 'Networking' },
  { key: 'personal-branding', label: 'Personal Branding' },
  { key: 'mentorship', label: 'Mentorship' },
];

export default function EditContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<LibraryContent | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentText, setContentText] = useState('');
  const [category, setCategory] = useState<ContentCategory>('leadership');
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Redirect if not a mentor
  if (userProfile?.userType !== 'mentor') {
    router.replace('/library');
    return null;
  }

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

      // Check if user owns this content
      if (contentData.createdBy !== userProfile?.uid) {
        Alert.alert('Permission Denied', 'You can only edit your own content.');
        router.back();
        return;
      }

      setContent(contentData);
      setTitle(contentData.title);
      setDescription(contentData.description);
      setContentText(contentData.content);
      setCategory(contentData.category);
      setTags(contentData.tags.join(', '));
      setIsPublished(contentData.isPublished);
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description.');
      return false;
    }
    if (!contentText.trim()) {
      Alert.alert('Validation Error', 'Please enter content.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !userProfile || !content) return;

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await updateLibraryContent(
        content.id,
        userProfile.uid,
        {
          title: title.trim(),
          description: description.trim(),
          content: contentText.trim(),
          category,
          tags: tagsArray,
          isPublished,
        }
      );

      Alert.alert(
        'Success',
        'Content updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating content:', error);
      Alert.alert(
        'Error',
        'Failed to update content. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            Edit {content.type}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Current Thumbnail */}
        {content.thumbnailUrl && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Current Thumbnail
            </Text>
            <Image
              source={{ uri: content.thumbnailUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <Text style={styles.helperText}>
              Note: Thumbnail editing will be available in a future update
            </Text>
          </View>
        )}

        {/* Publish Status */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Publication Status
          </Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              onPress={() => setIsPublished(true)}
              style={[
                styles.statusOption,
                isPublished ? styles.statusOptionActiveGreen : styles.statusOptionInactive
              ]}
            >
              <View style={styles.statusOptionContent}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={isPublished ? '#16a34a' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    isPublished ? styles.statusOptionTextGreen : styles.statusOptionTextInactive
                  ]}
                >
                  Published
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPublished(false)}
              style={[
                styles.statusOption,
                !isPublished ? styles.statusOptionActiveYellow : styles.statusOptionInactive
              ]}
            >
              <View style={styles.statusOptionContent}>
                <Ionicons
                  name="time"
                  size={24}
                  color={!isPublished ? '#ca8a04' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    !isPublished ? styles.statusOptionTextYellow : styles.statusOptionTextInactive
                  ]}
                >
                  Draft
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a compelling title..."
            style={styles.input}
            maxLength={100}
          />
          <Text style={styles.characterCount}>
            {title.length}/100 characters
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description *
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of your content..."
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {description.length}/300 characters
          </Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Category *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={[
                    styles.categoryButton,
                    category === cat.key ? styles.categoryButtonActive : styles.categoryButtonInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat.key ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Tags
          </Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags separated by commas..."
            style={styles.input}
          />
          <Text style={styles.helperText}>
            Example: leadership, women in tech, career growth
          </Text>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {content.type === 'article' ? 'Article Content' : 'Video Description'} *
          </Text>
          <TextInput
            value={contentText}
            onChangeText={setContentText}
            placeholder={
              content.type === 'article'
                ? 'Write your article content here...'
                : 'Describe your video content...'
            }
            multiline
            numberOfLines={15}
            style={[styles.input, styles.contentTextArea]}
            textAlignVertical="top"
          />
        </View>

        {/* Content Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>
            Content Statistics
          </Text>
          <View style={styles.statsGrid}>
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
              <Text style={styles.statLabel}>Bookmarks</Text>
            </View>
          </View>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  notFoundText: {
    fontSize: 18,
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
  saveButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: 128,
    borderRadius: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionActiveGreen: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  statusOptionActiveYellow: {
    borderColor: '#ca8a04',
    backgroundColor: '#fefce8',
  },
  statusOptionInactive: {
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  statusOptionContent: {
    alignItems: 'center',
  },
  statusOptionText: {
    marginTop: 4,
    fontWeight: '500',
  },
  statusOptionTextGreen: {
    color: '#16a34a',
  },
  statusOptionTextYellow: {
    color: '#ca8a04',
  },
  statusOptionTextInactive: {
    color: '#6b7280',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  contentTextArea: {
    height: 300,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
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
  categoryButtonText: {
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryButtonTextInactive: {
    color: '#374151',
  },
  statsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  bottomSpacer: {
    height: 100,
  },
});