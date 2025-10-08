import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDefaultProfileImage } from '../utils/imageUtils';

interface ProfilePictureProps {
  imageUri?: string;
  userType: 'user' | 'mentor';
  size?: number;
  showEditButton?: boolean;
  onEdit?: () => void;
  loading?: boolean;
}

export default function ProfilePicture({ 
  imageUri, 
  userType, 
  size = 60, 
  showEditButton = false, 
  onEdit,
  loading = false
}: ProfilePictureProps) {
  const [imageLoading, setImageLoading] = useState(!!imageUri);
  const radius = size / 2;
  const editButtonSize = size * 0.3;
  const editButtonRadius = editButtonSize / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={
          imageUri 
            ? { uri: imageUri }
            : getDefaultProfileImage(userType)
        }
        style={[
          styles.image, 
          { 
            width: size, 
            height: size, 
            borderRadius: radius 
          }
        ]}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
        onError={() => setImageLoading(false)}
      />
      
      {/* Loading overlay */}
      {(loading || imageLoading) && (
        <View style={[
          styles.loadingOverlay, 
          { 
            width: size, 
            height: size, 
            borderRadius: radius 
          }
        ]}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      )}
      {showEditButton && onEdit && !loading && (
        <TouchableOpacity 
          style={[
            styles.editButton, 
            { 
              width: editButtonSize, 
              height: editButtonSize, 
              borderRadius: editButtonRadius,
              bottom: size * 0.05,
              right: size * 0.05
            }
          ]}
          onPress={onEdit}
          disabled={loading || imageLoading}
        >
          <Ionicons 
            name="camera" 
            size={editButtonSize * 0.6} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});