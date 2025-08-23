import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { pickImage } from '../../../utils/imageUtils';
import ProfilePicture from '../../../components/ProfilePicture';

export default function AccountScreen() {
  const { userProfile, logout, updateProfilePicture, deleteProfilePicture, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/user-login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditProfilePicture = () => {
    const hasCustomPicture = userProfile?.profilePicture;
    
    const options = [
      { text: 'Choose from Library', onPress: handleSelectFromLibrary },
      ...(hasCustomPicture ? [{ text: 'Remove Photo', onPress: handleDeleteProfilePicture, style: 'destructive' as const }] : []),
      { text: 'Cancel', style: 'cancel' as const }
    ];

    Alert.alert('Profile Picture', 'What would you like to do?', options);
  };

  const handleSelectFromLibrary = async () => {
    try {
      const imageUri = await pickImage();
      if (imageUri) {
        await updateProfilePicture(imageUri);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile picture');
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
          onPress: async () => {
            try {
              await deleteProfilePicture();
              Alert.alert('Success', 'Profile picture removed successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove profile picture');
            }
          }
        }
      ]
    );
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: handleLogout }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Profile</Text>
        
        {userProfile && (
          <View style={styles.profileSection}>
            <View style={styles.profileInfo}>
              <ProfilePicture
                imageUri={userProfile.profilePicture}
                userType={userProfile.userType}
                size={100}
                showEditButton={true}
                onEdit={handleEditProfilePicture}
              />
              
              <Text style={styles.name}>{userProfile.displayName}</Text>
              <Text style={styles.email}>{userProfile.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {userProfile.userType === 'mentor' ? 'Mentor' : 'User'}
                </Text>
              </View>
              {!userProfile.emailVerified && (
                <View style={styles.warningBadge}>
                  <Text style={styles.warningText}>Email Not Verified</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Profile Settings</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Notifications</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Help & Support</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>About HerPower</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#8B5CF6',
  },
  profileSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  profileInfo: {
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuText: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 20,
    opacity: 0.5,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom:40
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});