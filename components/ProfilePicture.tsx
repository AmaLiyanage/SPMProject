import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDefaultProfileImage } from '../utils/imageUtils';

interface ProfilePictureProps {
  imageUri?: string;
  userType: 'user' | 'mentor';
  size?: number;
  showEditButton?: boolean;
  onEdit?: () => void;
}

export default function ProfilePicture({ 
  imageUri, 
  userType, 
  size = 60, 
  showEditButton = false, 
  onEdit 
}: ProfilePictureProps) {
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
      />
      {showEditButton && onEdit && (
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
  editButton: {
    position: 'absolute',
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});