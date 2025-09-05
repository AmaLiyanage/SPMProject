import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      setIsFirstTime(hasSeenOnboarding === null);
    } catch (error) {
      setIsFirstTime(true);
    }
  };

  useEffect(() => {
    if (!loading && isFirstTime !== null) {
      if (currentUser && userProfile) {
        // User is logged in
        if (!userProfile.emailVerified) {
          router.replace('/(auth)/verify-email');
        } else {
          // Logged in and verified -> Go to Home
          router.replace('/(tabs)');
        }
      } else {
        // User not logged in
        if (isFirstTime) {
          // Fresh install -> Show onboarding first
          router.replace('/(onboarding)');
        } else {
          // Returning user -> Show welcome/auth
          router.replace('/(auth)/welcome');
        }
      }
    }
  }, [currentUser, userProfile, loading, isFirstTime, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 18,
    color: '#8B5CF6',
  },
});
