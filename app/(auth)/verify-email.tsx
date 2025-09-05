import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60); // Start with 60-second cooldown
  const [autoCheckCount, setAutoCheckCount] = useState(0);
  const [stopAutoCheck, setStopAutoCheck] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { currentUser, sendVerificationEmail, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;

    let checkEmailVerification: ReturnType<typeof setInterval>;
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const maxAutoChecks = 10; // 5 minutes worth of checks at 30-second intervals

    const startPolling = () => {
      setAutoCheckCount(0);
      checkEmailVerification = setInterval(async () => {
        if (!currentUser || !isMounted) {
          clearInterval(checkEmailVerification);
          return;
        }

        // Stop auto-checking if manually stopped
        if (stopAutoCheck) {
          clearInterval(checkEmailVerification);
          return;
        }

        // Show timeout message and restart after 5 minutes
        if (autoCheckCount >= maxAutoChecks) {
          clearInterval(checkEmailVerification);
          Alert.alert(
            'Still waiting?', 
            'Check your spam folder or resend the email. We\'ll continue checking for you.',
            [{ 
              text: 'OK', 
              onPress: () => {
                // Restart auto-checking after user acknowledges
                setTimeout(() => {
                  if (isMounted && !stopAutoCheck) {
                    startPolling();
                  }
                }, 1000);
              }
            }]
          );
          return;
        }

        try {
          await currentUser.reload();
          if (currentUser.emailVerified && isMounted) {
            clearInterval(checkEmailVerification);
            
            // Update Firestore document to reflect verification status
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), {
                emailVerified: true
              });
            } catch (firestoreError) {
              console.error('Failed to update Firestore verification status:', firestoreError);
            }
            
            router.replace('/(tabs)');
            return;
          }
          setAutoCheckCount(prev => prev + 1);
          retryCount = 0; // Reset retry count on success
        } catch (error: any) {
          retryCount++;
          
          if (error?.code === 'auth/network-request-failed') {
            // Network error - continue polling but with backoff
            if (retryCount >= maxRetries) {
              clearInterval(checkEmailVerification);
              // Restart polling after 10 seconds
              setTimeout(() => {
                if (isMounted) {
                  retryCount = 0;
                  startPolling();
                }
              }, 10000);
            }
          } else {
            // Other errors - stop polling
            clearInterval(checkEmailVerification);
          }
        }
      }, 30000); // Check every 30 seconds
    };

    // Start polling after a 3-second delay to avoid immediate navigation
    setTimeout(() => {
      if (isMounted) {
        startPolling();
      }
    }, 3000);

    return () => {
      isMounted = false;
      if (checkEmailVerification) {
        clearInterval(checkEmailVerification);
      }
    };
  }, [currentUser, router, autoCheckCount]);

  // Start initial cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const countdownInterval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, []);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setResendLoading(true);
    
    try {
      await sendVerificationEmail();
      Alert.alert('Success', 'Verification email sent! Please check your inbox and click the verification link.');
      
      // Start 60-second cooldown
      setResendCooldown(60);
      const countdownInterval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Reset auto-check count to restart 5-minute window
      setAutoCheckCount(0);
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
    if (currentUser && !isChecking) {
      setLoading(true);
      setIsChecking(true);
      // Stop auto-checking when user manually verifies
      setStopAutoCheck(true);
      try {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          // Update Firestore document to reflect verification status
          await updateDoc(doc(db, 'users', currentUser.uid), {
            emailVerified: true
          });
          router.replace('/(tabs)');
        } else {
          Alert.alert('Email Not Verified', 'Please verify your email before continuing.');
          // Resume auto-checking if verification failed
          setStopAutoCheck(false);
        }
      } catch (error: any) {
        Alert.alert('Error', 'Failed to verify email status. Please try again.');
        console.error('Error in handleContinue:', error);
        // Resume auto-checking on error
        setStopAutoCheck(false);
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={80} color="#8B5CF6" />
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.message}>
          We have sent a verification email to{'\n'}
          <Text style={styles.email}>{currentUser?.email}</Text>
          {'\n\n'}
          Please check your inbox and click the verification link to continue.
        </Text>

        <TouchableOpacity 
          style={[styles.primaryButton, loading && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Verifying...' : "I've Verified My Email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, (resendLoading || resendCooldown > 0) && styles.buttonDisabled]} 
          onPress={handleResendEmail}
          disabled={resendLoading || resendCooldown > 0}
        >
          <Text style={styles.secondaryButtonText}>
            {resendLoading ? 'Sending...' : 
             resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 
             'Resend Verification Email'}
          </Text>
        </TouchableOpacity>
        
        {resendCooldown > 0 && (
          <Text style={styles.cooldownMessage}>
            Didn't get the email? Resend in {resendCooldown} seconds.
          </Text>
        )}

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
  cooldownMessage: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});