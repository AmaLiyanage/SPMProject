import { ScrollView, StyleSheet, View, TouchableOpacity, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePicture from '../../components/ProfilePicture';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    stories: 0,
    mentors: 0,
    communityMembers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    try {
      // Fetch stories count
      const storiesSnapshot = await getDocs(collection(db, 'stories'));
      const storiesCount = storiesSnapshot.size;

      // Fetch mentors count
      const mentorsQuery = query(collection(db, 'users'), where('userType', '==', 'mentor'));
      const mentorsSnapshot = await getDocs(mentorsQuery);
      const mentorsCount = mentorsSnapshot.size;

      // Fetch total community members count
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const communityCount = usersSnapshot.size;

      setStats({
        stories: storiesCount,
        mentors: mentorsCount,
        communityMembers: communityCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRealStats();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleShareStoryPress = () => {
    router.push('/(tabs)/stories');
  };

  const handleFindMentorPress = () => {
    router.push('/(tabs)/mentors');
  };

  const handleJournalPress = () => {
    router.push('/(tabs)/journal');
  };

  const handleLearnGrowPress = () => {
    router.push('/(tabs)/library');
  };

  return (
    <View style={styles.container}>
      {userProfile && (
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello, {userProfile.displayName}!
          </Text>
          <TouchableOpacity onPress={handleProfilePress}>
            <ProfilePicture
              imageUri={userProfile.profilePicture}
              userType={userProfile.userType}
              size={40}
            />
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >

        {refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            {/* <Text style={styles.loadingText}>Refreshing...</Text> */}
          </View>
        )}
        
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.featureCard} onPress={handleShareStoryPress}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="book" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Share Your Story</Text>
            </View>
            <Text style={styles.featureDescription}>
              Inspire others by sharing your leadership journey and experiences
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" style={styles.featureArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleFindMentorPress}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Find a Mentor</Text>
            </View>
            <Text style={styles.featureDescription}>
              Connect with experienced leaders who can guide your growth
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" style={styles.featureArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleJournalPress}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="journal" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Leadership Journal</Text>
            </View>
            <Text style={styles.featureDescription}>
              Track your leadership development and reflect on your growth journey
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" style={styles.featureArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleLearnGrowPress}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="library" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Learn & Grow</Text>
            </View>
            <Text style={styles.featureDescription}>
              Access resources, workshops, and educational content
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" style={styles.featureArrow} />
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Community Impact</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="book" size={24} color="#fff" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.stories}</Text>
              <Text style={styles.statLabel}>Stories Shared</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color="#fff" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.mentors}</Text>
              <Text style={styles.statLabel}>Mentors</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={24} color="#fff" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.communityMembers}</Text>
              <Text style={styles.statLabel}>Community Members</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 100, // Account for fixed header height (60px top padding + 20px bottom padding + extra space)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    marginTop: 10,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  featureTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  featureDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 8,
  },
  featureArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#986df7',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#e5e7eb',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 15,
  },
});
