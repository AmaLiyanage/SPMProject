import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';

export default function EditMentorProfileScreen() {
  const { userProfile, updateMentorProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Professional Background State
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || '');
  const [company, setCompany] = useState(userProfile?.company || '');
  const [industry, setIndustry] = useState(userProfile?.industry || '');
  const [yearsOfExperience, setYearsOfExperience] = useState(userProfile?.yearsOfExperience || '');
  const [linkedinUrl, setLinkedinUrl] = useState(userProfile?.linkedinUrl || '');

  // Mentorship Profile State
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [expertise, setExpertise] = useState<string[]>(userProfile?.expertise || []);
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>(userProfile?.mentorshipAreas || []);
  const [availability, setAvailability] = useState(userProfile?.availability || '');

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing', 
    'Consulting', 'Non-profit', 'Government', 'Retail', 'Manufacturing', 'Other'
  ];

  const experienceRanges = [
    '3-5 years', '5-10 years', '10-15 years', '15-20 years', '20+ years'
  ];

  const expertiseAreas = [
    'Leadership Development', 'Career Advancement', 'Entrepreneurship', 
    'Work-Life Balance', 'Technical Skills', 'Communication', 'Networking', 
    'Public Speaking', 'Team Management', 'Strategic Planning'
  ];

  const availabilityOptions = [
    '1-2 hours/week', '2-4 hours/week', '4-6 hours/week', '6+ hours/week'
  ];

  const toggleArrayField = (field: 'expertise' | 'mentorshipAreas', value: string) => {
    if (field === 'expertise') {
      setExpertise(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value)
          : [...prev, value]
      );
    } else {
      setMentorshipAreas(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value)
          : [...prev, value]
      );
    }
  };

  const handleSave = async () => {
    // Validation
    if (!jobTitle.trim() || !company.trim() || !industry || !yearsOfExperience) {
      Alert.alert('Error', 'Please fill in all required professional background fields');
      return;
    }

    if (!bio.trim() || bio.length < 50) {
      Alert.alert('Error', 'Please provide a bio of at least 50 characters');
      return;
    }

    if (expertise.length === 0 || mentorshipAreas.length === 0 || !availability) {
      Alert.alert('Error', 'Please complete all mentorship profile fields');
      return;
    }

    setLoading(true);
    try {
      const mentorData = {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        industry,
        yearsOfExperience,
        linkedinUrl: linkedinUrl.trim(),
        bio: bio.trim(),
        expertise,
        mentorshipAreas,
        availability,
      };

      await updateMentorProfile(mentorData);
      Alert.alert('Success', 'Mentor profile updated successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (userProfile?.userType !== 'mentor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>This screen is only available for mentors.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Mentor Profile</Text>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Professional Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Background</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your current job title"
              placeholderTextColor="#666"
              value={jobTitle}
              onChangeText={setJobTitle}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Company *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your company name"
              placeholderTextColor="#666"
              value={company}
              onChangeText={setCompany}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.sectionLabel}>Industry *</Text>
          <View style={styles.categoryContainer}>
            {industries.map(industryOption => (
              <TouchableOpacity
                key={industryOption}
                style={[
                  styles.categoryTab,
                  industry === industryOption && styles.categoryTabSelected
                ]}
                onPress={() => setIndustry(industryOption)}
              >
                <Text style={[
                  styles.categoryTabText,
                  industry === industryOption && styles.categoryTabTextSelected
                ]}>
                  {industryOption}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Years of Experience *</Text>
          <View style={styles.categoryContainer}>
            {experienceRanges.map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.categoryTab,
                  yearsOfExperience === range && styles.categoryTabSelected
                ]}
                onPress={() => setYearsOfExperience(range)}
              >
                <Text style={[
                  styles.categoryTabText,
                  yearsOfExperience === range && styles.categoryTabTextSelected
                ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>LinkedIn Profile URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://linkedin.com/in/yourprofile"
              placeholderTextColor="#666"
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Mentorship Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentorship Profile</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself, your journey, and what you're passionate about mentoring (min 50 characters)"
              placeholderTextColor="#666"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.charCount}>{bio.length}/50 minimum</Text>
          </View>

          <Text style={styles.sectionLabel}>Areas of Expertise * (Select multiple)</Text>
          <View style={styles.expertiseContainer}>
            {expertiseAreas.map(area => (
              <TouchableOpacity
                key={area}
                style={[
                  styles.expertiseChip,
                  expertise.includes(area) && styles.expertiseChipSelected
                ]}
                onPress={() => toggleArrayField('expertise', area)}
              >
                <Text style={[
                  styles.expertiseChipText,
                  expertise.includes(area) && styles.expertiseChipTextSelected
                ]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Mentorship Focus Areas * (Select multiple)</Text>
          <View style={styles.expertiseContainer}>
            {expertiseAreas.map(area => (
              <TouchableOpacity
                key={area}
                style={[
                  styles.expertiseChip,
                  mentorshipAreas.includes(area) && styles.expertiseChipSelected
                ]}
                onPress={() => toggleArrayField('mentorshipAreas', area)}
              >
                <Text style={[
                  styles.expertiseChipText,
                  mentorshipAreas.includes(area) && styles.expertiseChipTextSelected
                ]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Time Availability *</Text>
          <View style={styles.categoryContainer}>
            {availabilityOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.categoryTab,
                  availability === option && styles.categoryTabSelected
                ]}
                onPress={() => setAvailability(option)}
              >
                <Text style={[
                  styles.categoryTabText,
                  availability === option && styles.categoryTabTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBackButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  categoryTab: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 4,
    minWidth: '45%',
    alignItems: 'center',
  },
  categoryTabSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTabTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  expertiseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 25,
    justifyContent: 'space-between',
    rowGap: 4,
  },
  expertiseChip: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    margin: 3,
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expertiseChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  expertiseChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  expertiseChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});