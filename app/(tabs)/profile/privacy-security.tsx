import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { validatePassword, getFirebaseErrorMessage } from '../../../utils/validation';

export default function PrivacySecurityScreen() {
  const { deleteAccount, changePassword, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error: any) {
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please sign out and sign back in, then try changing your password again.';
      } else {
        errorMessage = getFirebaseErrorMessage(error) || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      `⚠️ WARNING: This action is PERMANENT and IRREVERSIBLE\n\nDeleting your account will:\n• Remove all your profile data\n• Delete you from our database\n• Remove your Firebase Authentication\n• Cannot be undone\n\nAccount: ${userProfile?.email}\n\nAre you absolutely sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: confirmDeleteAccount
        }
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      '🚨 LAST WARNING 🚨\n\nThis is your final chance to cancel.\n\nYour account and ALL DATA will be permanently deleted and CANNOT be recovered.\n\nTap "DELETE FOREVER" only if you are 100% sure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE FOREVER',
          style: 'destructive',
          onPress: executeDeleteAccount
        }
      ]
    );
  };

  const executeDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted from our systems.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/welcome')
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = 'Failed to delete account. Please try again.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please sign out and sign back in, then try deleting your account again.';
      } else {
        errorMessage = getFirebaseErrorMessage(error) || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password Management</Text>
          <Text style={styles.sectionDescription}>
            Keep your account secure by changing your password regularly
          </Text>

          {!showChangePassword ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowChangePassword(true)}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed" size={24} color="#059669" />
                <View>
                  <Text style={styles.menuItemTitle}>Change Password</Text>
                  <Text style={styles.menuItemSubtitle}>Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <View style={styles.changePasswordContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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

              <View style={styles.passwordActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setShowChangePassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.sectionDescription}>
            These actions are permanent and cannot be undone
          </Text>

          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <View style={styles.warningContent}>
              <Text style={styles.warningText}>
                Account deletion is permanent and irreversible
              </Text>
              <Text style={styles.warningSubtext}>
                All your data will be completely removed from our servers and cannot be recovered.
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.deleteButton, loading && styles.deleteButtonDisabled]} 
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>
              {loading ? 'Deleting Account...' : 'Delete My Account'}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    marginBottom: 8,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  changePasswordContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 20,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});