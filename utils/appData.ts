import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all app data from AsyncStorage
 * This includes onboarding status, cache, preferences, and any other stored data
 */
export const clearAppData = async (): Promise<void> => {
  try {
    // Get all keys first
    const keys = await AsyncStorage.getAllKeys();
    
    // Clear all stored data (including onboarding status)
    await AsyncStorage.multiRemove(keys);
    
    console.log('App data cleared successfully (including onboarding reset)');
  } catch (error) {
    console.error('Error clearing app data:', error);
    throw new Error('Failed to clear app data');
  }
};

/**
 * Clear only onboarding data to force show onboarding screens again
 */
export const clearOnboardingData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('Onboarding data cleared successfully');
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
    throw new Error('Failed to clear onboarding data');
  }
};

/**
 * Get all stored keys for debugging purposes
 */
export const getStoredKeys = async (): Promise<string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting stored keys:', error);
    return [];
  }
};