import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { currentUser, sendVerificationEmail, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkEmailVerification = setInterval(async () => {
      if (currentUser) {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          clearInterval(checkEmailVerification);
          router.replace('/(tabs)');
        }
      }
    }, 3000);

    return () => clearInterval(checkEmailVerification);
  }, [currentUser, router]);

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      await sendVerificationEmail();
      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace('/(auth)/user-login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (currentUser) {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Email Not Verified', 'Please verify your email before continuing.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📧</Text>
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.message}>
          We've sent a verification email to{'\n'}
          <Text style={styles.email}>{currentUser?.email}</Text>
          {'\n\n'}
          Please check your inbox and click the verification link to continue.
        </Text>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>
            I've Verified My Email
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, resendLoading && styles.buttonDisabled]} 
          onPress={handleResendEmail}
          disabled={resendLoading}
        >
          <Text style={styles.secondaryButtonText}>
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.logoutButton, loading && styles.buttonDisabled]} 
          onPress={handleLogout}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>
            {loading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  email: {
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});