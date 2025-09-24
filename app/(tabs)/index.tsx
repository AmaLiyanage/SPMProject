import { ScrollView, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePicture from '../../components/ProfilePicture';

export default function HomeScreen() {
  const { userProfile } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {userProfile && (
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Hello, {userProfile.displayName}!
            </Text>
            <ProfilePicture
              imageUri={userProfile.profilePicture}
              userType={userProfile.userType}
              size={40}
            />
          </View>
        )}

        <View style={styles.featuresContainer}>
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="book" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Share Your Story</Text>
            </View>
            <Text style={styles.featureDescription}>
              Inspire others by sharing your leadership journey and experiences
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Find a Mentor</Text>
            </View>
            <Text style={styles.featureDescription}>
              Connect with experienced leaders who can guide your growth
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="star" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Join Community</Text>
            </View>
            <Text style={styles.featureDescription}>
              Be part of a supportive network of empowering women
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureTitleContainer}>
              <Ionicons name="library" size={20} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Learn & Grow</Text>
            </View>
            <Text style={styles.featureDescription}>
              Access resources, workshops, and educational content
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1K+</Text>
            <Text style={styles.statLabel}>Stories Shared</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Mentors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5K+</Text>
            <Text style={styles.statLabel}>Community Members</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  featuresContainer: {
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
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
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom:80
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});
