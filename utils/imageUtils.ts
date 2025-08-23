import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const requestImagePickerPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'We need camera roll permissions to let you select a profile picture.'
    );
    return false;
  }
  
  return true;
};

export const pickImage = async (): Promise<string | null> => {
  const hasPermission = await requestImagePickerPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }
  
  return null;
};

export const getDefaultProfileImage = (userType: 'user' | 'mentor') => {
  // Return a default avatar based on user type
  return userType === 'mentor' 
    ? require('../assets/images/default-mentor-avatar.png')
    : require('../assets/images/default-user-avatar.png');
};

export const isCustomProfilePicture = (profilePicture?: string): boolean => {
  // Check if the user has uploaded a custom profile picture
  // If profilePicture is undefined or null, it means they're using the default
  return Boolean(profilePicture);
};