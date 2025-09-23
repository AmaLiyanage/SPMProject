import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as Haptics from 'expo-haptics';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60); // Start with 60-second cooldown
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheckCount, setAutoCheckCount] = useState(0);
  const [verificationStartTime] = useState(Date.now());
  const [showHelpSuggestions, setShowHelpSuggestions] = useState(false);
  const [pollingStarted, setPollingStarted] = useState(false);
  const { currentUser, sendVerificationEmail, logout, refreshProfile } = useAuth();
  const router = useRouter();
  
  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const checkingOpacity = useRef(new Animated.Value(0)).current;
  
  // Use refs to avoid stale closures
  const autoCheckCountRef = useRef(0);
  const stopAutoCheckRef = useRef(false);
  const isCheckingRef = useRef(false);
  const cooldownIntervalRef = useRef<number | null>(null);
  
  // Progressive messaging and smart polling
  const getProgressiveMessage = useMemo(() => {
    const elapsed = Math.floor((Date.now() - verificationStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    
    if (minutes === 0) {
      return {
        title: "Checking for verification...",
        subtitle: "This usually takes 1-2 minutes",
        showSpinner: true
      };
    } else if (minutes < 2) {
      return {
        title: "Still checking...",
        subtitle: "Check your inbox and spam folder",
        showSpinner: true
      };
    } else if (minutes < 4) {
      return {
        title: "Taking longer than usual",
        subtitle: "You can verify manually when ready",
        showSpinner: false
      };
    } else {
      return {
        title: "Ready when you are",
        subtitle: "Click below once you've verified your email",
        showSpinner: false
      };
    }
  }, [verificationStartTime, autoCheckCount]);
  
  // Smart polling intervals - faster initially, slower later
  const getPollingInterval = (checkCount: number): number => {
    if (checkCount < 4) return 15000; // First 1 minute: check every 15 seconds
    if (checkCount < 8) return 30000; // Next 2 minutes: check every 30 seconds
    return 45000; // After 3 minutes: check every 45 seconds
  };

  useEffect(() => {
    if (!currentUser) return;

    let checkEmailVerification: ReturnType<typeof setInterval>;
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const maxAutoChecks = 10; // 5 minutes worth of checks at 30-second intervals

    const startPolling = () => {
      autoCheckCountRef.current = 0;
      setAutoCheckCount(0);
      const scheduleNextCheck = () => {
        const interval = getPollingInterval(autoCheckCountRef.current);
        checkEmailVerification = setTimeout(async () => {
          if (!currentUser || !isMounted) {
            return;
          }

          // Stop auto-checking if manually stopped
          if (stopAutoCheckRef.current) {
            return;
          }

          // Show timeout message and restart after 5 minutes
          if (autoCheckCountRef.current >= maxAutoChecks) {
            clearTimeout(checkEmailVerification);
            Alert.alert(
              'Still waiting?', 
              'Check your spam folder or resend the email. We\'ll continue checking for you.',
              [{ 
                text: 'OK', 
                onPress: () => {
                  // Restart auto-checking after user acknowledges
                  setTimeout(() => {
                    if (isMounted && !stopAutoCheckRef.current) {
                      startPolling();
                    }
                  }, 1000);
                }
              }]
            );
            return;
          }

          // Prevent parallel checks
          if (isCheckingRef.current) return;
          isCheckingRef.current = true;
          setIsChecking(true);

          try {
            await currentUser.reload();
            if (currentUser.emailVerified && isMounted) {
              clearTimeout(checkEmailVerification);
              
              // Success haptic feedback
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Update Firestore document to reflect verification status
              try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  emailVerified: true
                });
                
                // Refresh the user profile in AuthContext to sync verification status
                await refreshProfile();
                
                router.replace('/(tabs)');
              } catch (firestoreError) {
                console.error('Failed to update Firestore verification status:', firestoreError);
                Alert.alert(
                  'Update Failed',
                  'Email verified but failed to update profile. Please try again or contact support.',
                  [{ text: 'OK' }]
                );
              }
              return;
            }
            autoCheckCountRef.current += 1;
            setAutoCheckCount(autoCheckCountRef.current);
            
            // Show help suggestions after 2 minutes
            if (autoCheckCountRef.current === 8) {
              setShowHelpSuggestions(true);
            }
            
            retryCount = 0; // Reset retry count on success
        } catch (error: any) {
          retryCount++;
          
          if (error?.code === 'auth/network-request-failed') {
            // Network error - continue polling but with backoff
            if (retryCount >= maxRetries) {
              clearTimeout(checkEmailVerification);
              // Restart polling after 10 seconds
              setTimeout(() => {
                if (isMounted && !stopAutoCheckRef.current) {
                  retryCount = 0;
                  startPolling();
                }
              }, 10000);
            } else {
              // Schedule next check with backoff
              scheduleNextCheck();
            }
          } else {
            // Other errors - stop polling
            clearTimeout(checkEmailVerification);
          }
        } finally {
          isCheckingRef.current = false;
          setIsChecking(false);
        }
        
        // Schedule next check if not stopped
        if (isMounted && !stopAutoCheckRef.current && autoCheckCountRef.current < maxAutoChecks) {
          scheduleNextCheck();
        }
        }, getPollingInterval(autoCheckCountRef.current));
      };
      
      scheduleNextCheck();
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
        clearTimeout(checkEmailVerification);
      }
    };
  }, [currentUser, router]);

  // Optimized cooldown countdown with proper cleanup
  useEffect(() => {
    const startCooldownTimer = () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
      
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    if (resendCooldown > 0) {
      startCooldownTimer();
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);
  
  // Start polling status immediately when screen loads
  useEffect(() => {
    setPollingStarted(true);
  }, []);

  // Animation effects
  useEffect(() => {
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.95,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    if (pollingStarted || isChecking || autoCheckCount > 0) {
      startPulseAnimation();
      Animated.timing(checkingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(checkingOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [pollingStarted, isChecking, autoCheckCount]);
  
  // App state handling for better focus detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && !stopAutoCheckRef.current && currentUser) {
        // Check verification status when app becomes active
        handleContinue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentUser]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setResendLoading(true);
    
    // Light haptic feedback on button press
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await sendVerificationEmail();
      
      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Success', 'Verification email sent! Please check your inbox and click the verification link.');
      
      // Start 60-second cooldown with proper cleanup
      setResendCooldown(60);
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
      
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Reset auto-check count to restart 5-minute window
      autoCheckCountRef.current = 0;
      setAutoCheckCount(0);
      setShowHelpSuggestions(false);
    } catch (error: any) {
      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    if (currentUser && !isCheckingRef.current) {
      setLoading(true);
      isCheckingRef.current = true;
      setIsChecking(true);
      
      // Light haptic feedback on button press
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Stop auto-checking when user manually verifies
      stopAutoCheckRef.current = true;
      
      try {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          // Success haptic feedback
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Update Firestore document to reflect verification status
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              emailVerified: true
            });
            
            // Refresh the user profile in AuthContext to sync verification status
            await refreshProfile();
            
            router.replace('/(tabs)');
          } catch (firestoreError) {
            console.error('Failed to update Firestore verification status:', firestoreError);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              'Update Failed',
              'Email verified but failed to update profile. Please try again or contact support.',
              [{ text: 'OK' }]
            );
          }
        } else {
          // Warning haptic feedback
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert('Email Not Verified', 'Please verify your email before continuing.');
          // Resume auto-checking if verification failed
          stopAutoCheckRef.current = false;
        }
      } catch (error: any) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to verify email status. Please try again.');
        console.error('Error in handleContinue:', error);
        // Resume auto-checking on error
        stopAutoCheckRef.current = false;
      } finally {
        setLoading(false);
        isCheckingRef.current = false;
        setIsChecking(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnimation }] }]}>
          <Ionicons name="mail" size={80} color="#8B5CF6" />
        </Animated.View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        
        {/* Progressive status indicator */}
        <Animated.View style={[styles.statusContainer, { opacity: checkingOpacity }]}>
          {getProgressiveMessage.showSpinner && (
            <ActivityIndicator size="small" color="#8B5CF6" style={styles.spinner} />
          )}
          <Text style={styles.statusTitle}>{getProgressiveMessage.title}</Text>
          <Text style={styles.statusSubtitle}>{getProgressiveMessage.subtitle}</Text>
        </Animated.View>
        
        <Text style={styles.message}>
          We have sent a verification email to{'\n'}
          <Text style={styles.email}>{currentUser?.email}</Text>
          {'\n\n'}
          Please check your inbox and click the verification link to continue.
        </Text>
        
        {/* Help suggestions after 2+ minutes */}
        {showHelpSuggestions && (
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Need help?</Text>
            <Text style={styles.helpText}>
              -Check your spam/junk folder{'\n'}
              -Make sure you clicked the verification link{'\n'}
              -Try resending the email if it's been a while
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryButton, loading && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={loading}
          accessibilityLabel="Check email verification status"
          accessibilityHint="Tap to verify if you have clicked the verification link in your email"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'verifying...' : "I've Verified My Email"}
          </Text>
          {/* {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />} */}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, (resendLoading || resendCooldown > 0) && styles.buttonDisabled]} 
          onPress={handleResendEmail}
          disabled={resendLoading || resendCooldown > 0}
          accessibilityLabel="Resend verification email"
          accessibilityHint={resendCooldown > 0 ? `Wait ${resendCooldown} seconds before resending` : "Tap to send another verification email"}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>
            {resendLoading ? 'Sending...' : 
             resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 
             'Resend Verification Email'}
          </Text>
          {resendLoading && <ActivityIndicator size="small" color="#8B5CF6" style={{ marginLeft: 8 }} />}
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
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  spinner: {
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  helpContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});