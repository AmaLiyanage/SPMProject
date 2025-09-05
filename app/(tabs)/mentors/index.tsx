import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../../config/firebase';

interface Mentor {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  company: string;
  bio?: string;
  mentorshipAreas?: string[];
  photoURL?: string;
}

// Predefined expertise areas
const expertiseAreas = [
  'Leadership Development', 'Career Advancement', 'Entrepreneurship',
  'Work-Life Balance', 'Technical Skills', 'Communication', 'Networking',
  'Public Speaking', 'Team Management', 'Strategic Planning'
];

const expertiseAreasWithAll = ['All', ...expertiseAreas];

export default function MentorsScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  // Fetch mentors from Firestore
  const fetchMentors = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('userType', '==', 'mentor'));
      const snapshot = await getDocs(q);

      const mentorsList: Mentor[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
        photoURL: (doc.data() as any).profilePicture || null,
      }));

      setMentors(mentorsList);
      setFilteredMentors(mentorsList);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  // Filter mentors by category and search
  useEffect(() => {
    let filtered = [...mentors];

    if (selectedArea !== 'All') {
      filtered = filtered.filter(
        m => (m.mentorshipAreas || []).some(a => a.toLowerCase() === selectedArea.toLowerCase())
      );
    }

    if (searchQuery.trim() !== '') {
      const queryLower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        m => (m.mentorshipAreas || []).some(a => a.toLowerCase().includes(queryLower))
      );
    }

    setFilteredMentors(filtered);
  }, [selectedArea, searchQuery, mentors]);

  // Navigate to mentor details
  const openMentorProfile = (id: string) => {
    router.push(`/mentors/mentor-details?id=${id}`);
  };

  const renderMentor = ({ item }: { item: Mentor }) => (
    <TouchableOpacity style={styles.mentorCard} onPress={() => openMentorProfile(item.id)}>
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.profileImage} />
      ) : (
        <View style={styles.profilePlaceholder}>
          <Text style={styles.profileInitial}>{item.displayName.charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.mentorName}>{item.displayName}</Text>
        <Text style={styles.mentorJob}>{item.jobTitle} @ {item.company}</Text>
        {item.bio && <Text style={styles.mentorBio}>{item.bio}</Text>}
        <View style={styles.areasContainer}>
          {(item.mentorshipAreas || []).map(area => (
            <View key={area} style={styles.areaChip}>
              <Text style={styles.areaText}>{area}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mentors</Text>
      <Text style={styles.subtitle}>Connect with inspiring mentors</Text>

      {/* Expertise Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areasScroll}>
        {expertiseAreasWithAll.map(area => (
          <TouchableOpacity
            key={area}
            style={[
              styles.areaFilterChip,
              selectedArea === area && styles.areaFilterChipSelected
            ]}
            onPress={() => setSelectedArea(area)}
          >
            <Text style={[
              styles.areaFilterText,
              selectedArea === area && styles.areaFilterTextSelected
            ]}>
              {area}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search mentorship areas..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#8B5CF6' }}>Loading...</Text>
      ) : filteredMentors.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No mentors found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMentors}
          renderItem={renderMentor}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 60, backgroundColor: '#fdf6fb' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#9b5de5' },
  subtitle: { fontSize: 16, marginBottom: 12, opacity: 0.8, color: '#9b5de5' },
  searchInput: { borderWidth: 1, borderColor: '#e0b3ff', borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 16, backgroundColor: '#f9e6ff', color:'#333' },
  areasScroll: { flexDirection: 'row', marginBottom: 12 },
  areaFilterChip: { backgroundColor: '#fce6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e0b3ff' },
  areaFilterChipSelected: { backgroundColor: '#9b5de5', borderColor: '#9b5de5' },
  areaFilterText: { fontSize: 13, color: '#6b2a96' },
  areaFilterTextSelected: { color: '#fff', fontWeight: '600' },
  mentorCard: { flexDirection: 'row', backgroundColor: '#f3e6ff', borderRadius: 12, padding: 20, marginBottom: 15, shadowColor:'#9b5de5', shadowOpacity:0.1, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:3 },
  profileImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  profilePlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#9b5de5', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  mentorName: { fontSize: 18, fontWeight: 'bold', color: '#6b2a96' },
  mentorJob: { fontSize: 14, color: '#8446c1', marginBottom: 4 },
  mentorBio: { fontSize: 14, color: '#5e2ca5', marginBottom: 10 },
  areasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaChip: { backgroundColor: '#e27cd1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 6 },
  areaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  placeholder: { alignItems: 'center', padding: 40 },
  placeholderText: { fontSize: 16, color: '#6b2a96' },
});
