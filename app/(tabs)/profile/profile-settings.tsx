import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfilePicture } from '../../../hooks/useProfilePicture';
import { clearAppData } from '../../../utils/appData';

export default function ProfileSettingsScreen() {
  const { userProfile, updateDisplayName } = useAuth();
  const { handleEditProfilePicture, loading: profilePictureLoading } = useProfilePicture();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [nameLoading, setNameLoading] = useState(false);
  const router = useRouter();

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    setNameLoading(true);
    try {
      await updateDisplayName(displayName.trim());
      setEditingName(false);
      Alert.alert('Success', 'Display name updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update display name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleClearAppData = () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all app cache, temporary files, preferences, and reset onboarding. Your account data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAppData();
              Alert.alert(
                'Success', 
                'App data cleared successfully. The onboarding screens will show on next app launch. Please restart the app to see changes.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to clear app data');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Edit Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, profilePictureLoading && styles.menuItemDisabled]} 
            onPress={handleEditProfilePicture}
            disabled={profilePictureLoading}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="image" size={24} color="#8B5CF6" />
              <View>
                <Text style={styles.menuItemTitle}>Profile Picture</Text>
                <Text style={styles.menuItemSubtitle}>
                  {profilePictureLoading ? 'Updating...' : 'Change or remove your photo'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <View style={styles.nameContainer}>
                <Text style={styles.menuItemTitle}>Display Name</Text>
                {editingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={styles.nameInput}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Enter your display name"
                      autoFocus
                    />
                    <View style={styles.nameActions}>
                      <TouchableOpacity 
                        onPress={() => {
                          setEditingName(false);
                          setDisplayName(userProfile?.displayName || '');
                        }}
                        disabled={nameLoading}
                      >
                        <Ionicons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={handleSaveDisplayName}
                        disabled={nameLoading}
                      >
                        <Ionicons 
                          name={nameLoading ? "hourglass" : "checkmark"} 
                          size={20} 
                          color="#059669" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.menuItemSubtitle}>{userProfile?.displayName || 'Not set'}</Text>
                )}
              </View>
            </View>
            {!editingName && (
              <TouchableOpacity onPress={() => setEditingName(true)}>
                <Ionicons name="pencil" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail" size={24} color="#666" />
              <View>
                <Text style={styles.menuItemTitle}>Email</Text>
                <Text style={styles.menuItemSubtitle}>{userProfile?.email}</Text>
              </View>
            </View>
            <Text style={styles.readOnlyText}>Read-only</Text>
          </View>

          {/* Mentor-specific profile editing */}
          {userProfile?.userType === 'mentor' && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/profile/edit-mentor-profile')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="briefcase" size={24} color="#059669" />
                <View>
                  <Text style={styles.menuItemTitle}>Mentor Profile</Text>
                  <Text style={styles.menuItemSubtitle}>Edit professional & mentorship info</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications" size={24} color="#f59e0b" />
              <View>
                <Text style={styles.menuItemTitle}>Push Notifications</Text>
                <Text style={styles.menuItemSubtitle}>Receive app notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e5e7eb', true: '#8B5CF6' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={24} color="#059669" />
              <View>
                <Text style={styles.menuItemTitle}>Email Notifications</Text>
                <Text style={styles.menuItemSubtitle}>Receive updates via email</Text>
              </View>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#e5e7eb', true: '#8B5CF6' }}
              thumbColor={emailNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleClearAppData}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="refresh" size={24} color="#f59e0b" />
              <View>
                <Text style={styles.menuItemTitle}>Clear App Data</Text>
                <Text style={styles.menuItemSubtitle}>Clear cache, reset preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  nameContainer: {
    flex: 1,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  nameActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readOnlyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});