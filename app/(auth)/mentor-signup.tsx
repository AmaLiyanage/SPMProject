import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, sanitizeInput, getFirebaseErrorMessage } from '../../utils/validation';

export default function MentorSignupScreen() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    company: '',
    industry: '',
    yearsOfExperience: '',
    linkedinUrl: '',
    bio: '',
    expertise: [],
    mentorshipAreas: [],
    availability: '',
    timeZone: '',
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

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

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: 'expertise' | 'mentorshipAreas', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const validateStep1 = () => {
    const sanitizedEmail = sanitizeInput(formData.email);
    const sanitizedDisplayName = sanitizeInput(formData.displayName);

    if (!sanitizedDisplayName || !sanitizedEmail || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all basic information fields');
      return false;
    }

    if (!validateEmail(sanitizedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.errors.join('\n'));
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.jobTitle || !formData.company || !formData.industry || !formData.yearsOfExperience) {
      Alert.alert('Error', 'Please fill in all professional information fields');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.expertise.length === 0 || formData.mentorshipAreas.length === 0 || !formData.availability) {
      Alert.alert('Error', 'Please complete your mentorship preferences');
      return false;
    }
    if (!formData.bio || formData.bio.length < 50) {
      Alert.alert('Error', 'Please provide a bio of at least 50 characters');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    const sanitizedEmail = sanitizeInput(formData.email);
    const sanitizedDisplayName = sanitizeInput(formData.displayName);

    setLoading(true);
    try {
      await signup(sanitizedEmail, formData.password, 'mentor', sanitizedDisplayName);
      // TODO: Save additional mentor data to Firestore
      Alert.alert(
        'Success', 
        'Mentor account created! Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(auth)/verify-email')
          }
        ]
      );
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code) || error.message;
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        placeholderTextColor="#666"
        value={formData.displayName}
        onChangeText={(value) => updateFormData('displayName', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Email Address *"
        placeholderTextColor="#666"
        value={formData.email}
        onChangeText={(value) => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password *"
        placeholderTextColor="#666"
        value={formData.password}
        onChangeText={(value) => updateFormData('password', value)}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password *"
        placeholderTextColor="#666"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData('confirmPassword', value)}
        secureTextEntry
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Background</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Job Title *"
        placeholderTextColor="#666"
        value={formData.jobTitle}
        onChangeText={(value) => updateFormData('jobTitle', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Company *"
        placeholderTextColor="#666"
        value={formData.company}
        onChangeText={(value) => updateFormData('company', value)}
      />

      <Text style={styles.sectionLabel}>Industry *</Text>
      <View style={styles.categoryContainer}>
        {industries.map(industry => (
          <TouchableOpacity
            key={industry}
            style={[
              styles.categoryTab,
              formData.industry === industry && styles.categoryTabSelected
            ]}
            onPress={() => updateFormData('industry', industry)}
          >
            <Text style={[
              styles.categoryTabText,
              formData.industry === industry && styles.categoryTabTextSelected
            ]}>
              {industry}
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
              formData.yearsOfExperience === range && styles.categoryTabSelected
            ]}
            onPress={() => updateFormData('yearsOfExperience', range)}
          >
            <Text style={[
              styles.categoryTabText,
              formData.yearsOfExperience === range && styles.categoryTabTextSelected
            ]}>
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="LinkedIn Profile URL (optional)"
        placeholderTextColor="#666"
        value={formData.linkedinUrl}
        onChangeText={(value) => updateFormData('linkedinUrl', value)}
        autoCapitalize="none"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Mentorship Profile</Text>
      
      <Text style={styles.sectionLabel}>Your Bio *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell us about yourself, your journey, and what you're passionate about mentoring (min 50 characters)"
        placeholderTextColor="#666"
        value={formData.bio}
        onChangeText={(value) => updateFormData('bio', value)}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.sectionLabel}>Areas of Expertise * (Select multiple)</Text>
      <View style={styles.expertiseContainer}>
        {expertiseAreas.map(area => (
          <TouchableOpacity
            key={area}
            style={[
              styles.expertiseChip,
              formData.expertise.includes(area) && styles.expertiseChipSelected
            ]}
            onPress={() => toggleArrayField('expertise', area)}
          >
            <Text style={[
              styles.expertiseChipText,
              formData.expertise.includes(area) && styles.expertiseChipTextSelected
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
              formData.mentorshipAreas.includes(area) && styles.expertiseChipSelected
            ]}
            onPress={() => toggleArrayField('mentorshipAreas', area)}
          >
            <Text style={[
              styles.expertiseChipText,
              formData.mentorshipAreas.includes(area) && styles.expertiseChipTextSelected
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
              formData.availability === option && styles.categoryTabSelected
            ]}
            onPress={() => updateFormData('availability', option)}
          >
            <Text style={[
              styles.categoryTabText,
              formData.availability === option && styles.categoryTabTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Join as Mentor</Text>
          <Text style={styles.subtitle}>Share your expertise and guide the next generation</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Step {currentStep} of 3</Text>
          </View>
        </View>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating Account...' : 'Create Mentor Account'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.linkContainer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/mentor-login')}>
            <Text style={styles.linkText}>
              Already have a mentor account? Sign in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/user-signup')}>
            <Text style={styles.linkText}>
              Want to be a mentee? Join here
            </Text>
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
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
    flex: 0.4,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 15,
    flex: 0.4,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  linkContainer: {
    padding: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});