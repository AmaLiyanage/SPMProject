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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">
            Edit {content.type}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg ${
              saving ? 'bg-gray-400' : 'bg-purple-600'
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Current Thumbnail */}
        {content.thumbnailUrl && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Current Thumbnail
            </Text>
            <Image
              source={{ uri: content.thumbnailUrl }}
              className="w-full h-32 rounded-lg"
              resizeMode="cover"
            />
            <Text className="text-xs text-gray-500 mt-1">
              Note: Thumbnail editing will be available in a future update
            </Text>
          </View>
        )}

        {/* Publish Status */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Publication Status
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setIsPublished(true)}
              className={`flex-1 p-3 rounded-lg border ${
                isPublished
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <View className="items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={isPublished ? '#16a34a' : '#6b7280'}
                />
                <Text
                  className={`mt-1 font-medium ${
                    isPublished ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  Published
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPublished(false)}
              className={`flex-1 p-3 rounded-lg border ${
                !isPublished
                  ? 'border-yellow-600 bg-yellow-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <View className="items-center">
                <Ionicons
                  name="time"
                  size={24}
                  color={!isPublished ? '#ca8a04' : '#6b7280'}
                />
                <Text
                  className={`mt-1 font-medium ${
                    !isPublished ? 'text-yellow-600' : 'text-gray-600'
                  }`}
                >
                  Draft
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a compelling title..."
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
            maxLength={100}
          />
          <Text className="text-xs text-gray-500 mt-1">
            {title.length}/100 characters
          </Text>
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Description *
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of your content..."
            multiline
            numberOfLines={3}
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
            maxLength={300}
            textAlignVertical="top"
          />
          <Text className="text-xs text-gray-500 mt-1">
            {description.length}/300 characters
          </Text>
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Category *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
          >
            <View className="flex-row space-x-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  className={`px-4 py-2 rounded-full border ${
                    category === cat.key
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      category === cat.key ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tags */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Tags
          </Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags separated by commas..."
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
          />
          <Text className="text-xs text-gray-500 mt-1">
            Example: leadership, women in tech, career growth
          </Text>
        </View>

        {/* Content */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
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
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
            textAlignVertical="top"
          />
        </View>

        {/* Content Stats */}
        <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <Text className="text-sm font-medium text-gray-700 mb-3">
            Content Statistics
          </Text>
          <View className="flex-row justify-between">
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
              <Text className="text-xs text-gray-500">Bookmarks</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}