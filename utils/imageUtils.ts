import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

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

export const uploadImageToFirebase = async (imageUri: string, userId: string): Promise<string> => {
  try {
    // Convert image to blob
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Create a reference to the file location
    const fileName = `${Date.now()}_${userId}.jpg`;
    const imageRef = ref(storage, `profile-pictures/${fileName}`);
    
    // Upload the file
    await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(imageRef);
    
    return downloadURL;
  } catch (error: any) {
    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage access denied. Please check Firebase Storage rules.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error.code === 'storage/unknown') {
      throw new Error('Unknown storage error. Please check your Firebase configuration and try again.');
    } else if (error.code === 'storage/object-not-found') {
      throw new Error('File not found.');
    } else if (error.code === 'storage/bucket-not-found') {
      throw new Error('Storage bucket not found. Please check your Firebase configuration.');
    } else if (error.code === 'storage/project-not-found') {
      throw new Error('Firebase project not found.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Storage quota exceeded.');
    } else if (error.code === 'storage/invalid-format') {
      throw new Error('Invalid file format.');
    } else if (error.code === 'storage/invalid-event-name') {
      throw new Error('Invalid storage event.');
    } else {
      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  }
};

export const deleteImageFromFirebase = async (imageUrl: string): Promise<void> => {
  try {
    // Create a reference to the file to delete
    const imageRef = ref(storage, imageUrl);
    
    // Delete the file
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for deletion failures - it's not critical
  }
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