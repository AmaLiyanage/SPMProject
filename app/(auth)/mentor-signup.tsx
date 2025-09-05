import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, sanitizeInput, getFirebaseErrorMessage } from '../../utils/validation';
import { getAutoTimeZone } from '../../utils/timeZone';

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
    expertise: [] as string[],
    mentorshipAreas: [] as string[],
    availability: '',
    timeZone: '',
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      // Prepare mentor-specific data
      const mentorData = {
        jobTitle: sanitizeInput(formData.jobTitle),
        company: sanitizeInput(formData.company),
        industry: sanitizeInput(formData.industry),
        yearsOfExperience: sanitizeInput(formData.yearsOfExperience),
        linkedinUrl: sanitizeInput(formData.linkedinUrl),
        bio: sanitizeInput(formData.bio),
        expertise: formData.expertise,
        mentorshipAreas: formData.mentorshipAreas,
        availability: sanitizeInput(formData.availability),
        timeZone: getAutoTimeZone(),
      };

      await signup(sanitizedEmail, formData.password, 'mentor', sanitizedDisplayName, mentorData);
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
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#666"
          value={formData.displayName}
          onChangeText={(value) => updateFormData('displayName', value)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email address"
          placeholderTextColor="#666"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Create a password"
            placeholderTextColor="#666"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm your password"
            placeholderTextColor="#666"
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Background</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Job Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your current job title"
          placeholderTextColor="#666"
          value={formData.jobTitle}
          onChangeText={(value) => updateFormData('jobTitle', value)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Company *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your company name"
          placeholderTextColor="#666"
          value={formData.company}
          onChangeText={(value) => updateFormData('company', value)}
          autoCapitalize="words"
        />
      </View>

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

      <View style={styles.inputContainer}>
        <Text style={styles.label}>LinkedIn Profile URL (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your LinkedIn profile URL"
          placeholderTextColor="#666"
          value={formData.linkedinUrl}
          onChangeText={(value) => updateFormData('linkedinUrl', value)}
          autoCapitalize="none"
        />
      </View>
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
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
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

        <View style={[
          styles.buttonContainer,
          currentStep === 1 && styles.buttonContainerStep1,
          currentStep === 3 && styles.buttonContainerStep3
        ]}>
          {currentStep > 1 && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Ionicons name="chevron-back" size={18} color="#666" style={styles.buttonIcon} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 3 ? (
            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  inputContainer: {
    marginBottom: 20,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20
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
    flexDirection: 'row',
    justifyContent: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonContainerStep1: {
    justifyContent: 'flex-end',
  },
  buttonIcon: {
    marginHorizontal: 4,
  },
  buttonContainerStep3: {
    gap: 15,
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
    flex: 0.6,
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