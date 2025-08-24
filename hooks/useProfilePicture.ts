import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { pickImage } from '../utils/imageUtils';

export const useProfilePicture = () => {
  const { userProfile, updateProfilePicture, deleteProfilePicture } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEditProfilePicture = () => {
    const hasCustomPicture = userProfile?.profilePicture;
    
    const options = [
      { text: 'Choose from Library', onPress: handleSelectFromLibrary },
      ...(hasCustomPicture ? [{ 
        text: 'Remove Photo', 
        onPress: handleDeleteProfilePicture, 
        style: 'destructive' as const 
      }] : []),
      { text: 'Cancel', style: 'cancel' as const }
    ];

    Alert.alert('Profile Picture', 'What would you like to do?', options);
  };

  const handleSelectFromLibrary = async () => {
    setLoading(true);
    try {
      const imageUri = await pickImage();
      if (imageUri) {
        await updateProfilePicture(imageUri);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfilePicture = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture? This will revert to the default image.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: executeDeleteProfilePicture
        }
      ]
    );
  };

  const executeDeleteProfilePicture = async () => {
    setLoading(true);
    try {
      await deleteProfilePicture();
      Alert.alert('Success', 'Profile picture removed successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove profile picture');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    userProfile,
    handleEditProfilePicture,
    handleSelectFromLibrary,
    handleDeleteProfilePicture: executeDeleteProfilePicture
  };
};