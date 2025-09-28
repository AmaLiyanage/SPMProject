import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProfilePicture from '../../../components/ProfilePicture';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfilePicture } from '../../../hooks/useProfilePicture';

export default function AccountScreen() {
  const { userProfile, logout, refreshProfile } = useAuth();
  const { handleEditProfilePicture } = useProfilePicture();
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

  /** Navigate to the shared chat list */
  const handleOpenChats = () => {
    if (!userProfile) return;
    router.push('/mentors/chat/ChatListScreen');
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
          {/* Chats menu item */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleOpenChats}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
              <Text style={styles.menuText}>Chats</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Other menu items */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile/profile-settings')}
          >
            <Text style={styles.menuText}>Profile Settings</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Notifications</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile/privacy-security')}
          >
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30, color: '#8B5CF6' },
  profileSection: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 30 },
  profileInfo: { alignItems: 'center', gap: 12 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  email: { fontSize: 16, opacity: 0.7, marginBottom: 12 },
  badge: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  warningBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  warningText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  menuSection: { backgroundColor: '#f8f9fa', borderRadius: 12, overflow: 'hidden', marginBottom: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16 },
  arrow: { fontSize: 20, opacity: 0.5 },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
