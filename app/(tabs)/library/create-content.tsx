import React, { useState } from 'react';
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
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { createLibraryContent } from '../../../services/libraryService';
import { ContentType, ContentCategory } from '../../../types/library';

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

export default function CreateContentScreen() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<ContentType>('article');
  const [category, setCategory] = useState<ContentCategory>('leadership');
  const [tags, setTags] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string>('');
  const [videoUri, setVideoUri] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Redirect if not a mentor
  if (userProfile?.userType !== 'mentor') {
    router.replace('/library');
    return null;
  }

  const pickThumbnail = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setThumbnailUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
      Alert.alert('Error', 'Failed to pick thumbnail image.');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setVideoDuration(0); // Placeholder
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video file.');
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
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Please enter content.');
      return false;
    }
    if (type === 'video' && !videoUri) {
      Alert.alert('Validation Error', 'Please select a video file.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !userProfile) return;

    setLoading(true);
    try {
      // Convert URIs to File objects for upload
      let thumbnailFile: File | undefined;
      let videoFile: File | undefined;

      if (thumbnailUri) {
        const response = await fetch(thumbnailUri);
        const blob = await response.blob();
        thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
      }

      if (videoUri && type === 'video') {
        const response = await fetch(videoUri);
        const blob = await response.blob();
        videoFile = new File([blob], 'video.mp4', { type: 'video/mp4' });
      }

      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await createLibraryContent(
        userProfile.uid,
        userProfile.displayName || 'Unknown',
        userProfile.profilePicture,
        {
          title: title.trim(),
          description: description.trim(),
          content: content.trim(),
          type,
          category,
          tags: tagsArray,
          thumbnailFile,
          videoFile,
          duration: type === 'video' ? videoDuration : undefined,
        }
      );

      Alert.alert(
        'Success',
        'Content created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating content:', error);
      Alert.alert(
        'Error',
        'Failed to create content. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
            Create Content
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.publishButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Content Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Content Type
          </Text>
          <View style={styles.typeSelection}>
            <TouchableOpacity
              onPress={() => setType('article')}
              style={[
                styles.typeOption,
                type === 'article' ? styles.typeOptionActive : styles.typeOptionInactive
              ]}
            >
              <View style={styles.typeOptionContent}>
                <Ionicons
                  name="document-text"
                  size={32}
                  color={type === 'article' ? '#9333ea' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    type === 'article' ? styles.typeOptionTextActive : styles.typeOptionTextInactive
                  ]}
                >
                  Article
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType('video')}
              style={[
                styles.typeOption,
                type === 'video' ? styles.typeOptionActive : styles.typeOptionInactive
              ]}
            >
              <View style={styles.typeOptionContent}>
                <Ionicons
                  name="play-circle"
                  size={32}
                  color={type === 'video' ? '#9333ea' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    type === 'video' ? styles.typeOptionTextActive : styles.typeOptionTextInactive
                  ]}
                >
                  Video
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

        {/* Thumbnail */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Thumbnail Image
          </Text>
          <TouchableOpacity
            onPress={pickThumbnail}
            style={styles.imageUpload}
          >
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.uploadedImage}
                resizeMode="cover"
              />
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color="#6b7280" />
                <Text style={styles.uploadText}>Add Thumbnail</Text>
                <Text style={styles.uploadSubtext}>16:9 aspect ratio recommended</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Video Upload (for video type) */}
        {type === 'video' && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Video File *
            </Text>
            <TouchableOpacity
              onPress={pickVideo}
              style={styles.imageUpload}
            >
              {videoUri ? (
                <View style={styles.uploadedContent}>
                  <Ionicons name="videocam" size={32} color="#9333ea" />
                  <Text style={styles.uploadedText}>
                    Video Selected
                  </Text>
                  <Text style={styles.uploadedSubtext}>
                    {videoUri.split('/').pop()}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="videocam-outline" size={32} color="#6b7280" />
                  <Text style={styles.uploadText}>Upload Video</Text>
                  <Text style={styles.uploadSubtext}>MP4, MOV, AVI supported</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {type === 'article' ? 'Article Content' : 'Video Description'} *
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={
              type === 'article'
                ? 'Write your article content here...'
                : 'Describe your video content...'
            }
            multiline
            numberOfLines={10}
            style={[styles.input, styles.contentTextArea]}
            textAlignVertical="top"
          />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  publishButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publishButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  publishButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  typeSelection: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  typeOptionActive: {
    borderColor: '#9333ea',
    backgroundColor: '#f3e8ff',
  },
  typeOptionInactive: {
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  typeOptionContent: {
    alignItems: 'center',
  },
  typeOptionText: {
    marginTop: 8,
    fontWeight: '500',
  },
  typeOptionTextActive: {
    color: '#9333ea',
  },
  typeOptionTextInactive: {
    color: '#6b7280',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
    height: 200,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  helperText: {
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
  imageUpload: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 128,
    borderRadius: 8,
  },
  uploadText: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 16,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  uploadedContent: {
    alignItems: 'center',
  },
  uploadedText: {
    color: '#9333ea',
    marginTop: 8,
    fontWeight: '500',
  },
  uploadedSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 100,
  },
});