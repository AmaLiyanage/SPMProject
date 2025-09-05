import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../../config/firebase';
import { createOrGetChat } from '../../../services/chatService';

interface Mentor {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  company: string;
  industry: string;
  yearsOfExperience: string;
  linkedinUrl?: string;
  bio: string;
  expertise: string[];
  mentorshipAreas?: string[];
  availability: string;
  timeZone: string;
  photoURL?: string;
}

export default function MentorDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mentorId = params.id;

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const fetchMentor = async () => {
    try {
      const docRef = doc(db, 'users', mentorId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMentor({
          id: docSnap.id,
          displayName: data.displayName,
          email: data.email,
          jobTitle: data.jobTitle,
          company: data.company,
          industry: data.industry,
          yearsOfExperience: data.yearsOfExperience,
          linkedinUrl: data.linkedinUrl,
          bio: data.bio,
          expertise: data.expertise,
          mentorshipAreas: data.mentorshipAreas,
          availability: data.availability,
          timeZone: data.timeZone,
          photoURL: data.profilePicture || null,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentor();
  }, [mentorId]);

  const handleStartChat = async () => {
    if (!userId) return;

    const chatId = await createOrGetChat(userId, mentorId);

    router.push({
      pathname: '/mentors/chat/[chatId]',
      params: { chatId },
    });
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  if (!mentor) return <Text style={{ marginTop: 50, textAlign: 'center' }}>Mentor not found</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf6fb' }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile */}
        {mentor.photoURL ? (
          <Image source={{ uri: mentor.photoURL }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profileInitial}>{mentor.displayName.charAt(0)}</Text>
          </View>
        )}

        <Text style={styles.name}>{mentor.displayName}</Text>

        <View style={styles.infoRow}>
          <FontAwesome name="briefcase" size={18} color="#8446c1" />
          <Text style={styles.infoText}>{mentor.jobTitle} @ {mentor.company}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="email" size={18} color="#f472b6" />
          <Text style={styles.infoText}>{mentor.email}</Text>
        </View>

        {/* Bio */}
        <GradientBox title="Bio">
          <Text style={styles.boxText}>{mentor.bio}</Text>
        </GradientBox>

        {/* Expertise */}
        <GradientBox title="Expertise">
          <View style={styles.badgesContainer}>
            {mentor.expertise.map(exp => (
              <LinearGradient key={exp} colors={['#f472b6', '#9b5de5']} style={styles.badge}>
                <Text style={styles.badgeText}>{exp}</Text>
              </LinearGradient>
            ))}
          </View>
        </GradientBox>

        {/* Mentorship Areas */}
        {mentor.mentorshipAreas && (
          <GradientBox title="Mentorship Areas">
            <View style={styles.badgesContainer}>
              {mentor.mentorshipAreas.map(area => (
                <LinearGradient key={area} colors={['#f9a8d4', '#a78bfa']} style={styles.badge}>
                  <Text style={styles.badgeText}>{area}</Text>
                </LinearGradient>
              ))}
            </View>
          </GradientBox>
        )}

        {/* Availability & Time Zone */}
        <GradientBox title="Availability">
          <Text style={styles.boxText}>{mentor.availability}</Text>
        </GradientBox>
        <GradientBox title="Time Zone">
          <Text style={styles.boxText}>{mentor.timeZone}</Text>
        </GradientBox>

        {/* LinkedIn */}
        {mentor.linkedinUrl && (
          <GradientBox title="LinkedIn">
            <View style={styles.infoRow}>
              <FontAwesome name="linkedin-square" size={20} color="#0077b5" />
              <Text style={styles.infoText}>{mentor.linkedinUrl}</Text>
            </View>
          </GradientBox>
        )}

        {/* Start Chat */}
        <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
          <Text style={styles.chatButtonText}>Start Chat</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Gradient Box Component
function GradientBox({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <LinearGradient
      colors={['#f9e6ff', '#f3e6ff']}
      style={styles.box}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={styles.boxTitle}>{title}</Text>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 20 },
  profileImage: { width: 130, height: 130, borderRadius: 65, alignSelf: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#9b5de5' },
  profilePlaceholder: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#9b5de5', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileInitial: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#9b5de5', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoText: { fontSize: 14, color: '#6b2a96', marginLeft: 6 },
  box: { padding: 14, borderRadius: 14, marginBottom: 12, shadowColor: '#9b5de5', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
  boxTitle: { fontWeight: 'bold', color: '#9b5de5', fontSize: 16, marginBottom: 6 },
  boxText: { fontSize: 14, color: '#5e2ca5' },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chatButton: { backgroundColor: '#9b5de5', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  chatButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
