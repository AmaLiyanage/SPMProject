import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createUserProfile } from '../utils/auth';
import { uploadImageToFirebase, deleteImageFromFirebase } from '../utils/imageUtils';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export type UserType = 'user' | 'mentor';

export interface UserProfile {
  // Basic fields - all users
  uid: string;
  email: string;
  userType: UserType;
  displayName?: string;
  profilePicture?: string;
  emailVerified: boolean;
  createdAt: Date;
  timeZone?: string; // Common field for both users and mentors
  
  // Mentor-specific fields - only for mentors
  jobTitle?: string;
  company?: string;
  industry?: string;
  yearsOfExperience?: string;
  linkedinUrl?: string;
  bio?: string;
  expertise?: string[];
  mentorshipAreas?: string[];
  availability?: string;
}

interface MentorData {
  jobTitle?: string;
  company?: string;
  industry?: string;
  yearsOfExperience?: string;
  linkedinUrl?: string;
  bio?: string;
  expertise?: string[];
  mentorshipAreas?: string[];
  availability?: string;
  timeZone?: string;
}

interface UserData {
  timeZone?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, userType: UserType, displayName?: string, userData?: UserData | MentorData) => Promise<void>;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  deleteProfilePicture: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateMentorProfile: (mentorData: Partial<MentorData>) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to delete all user files from Firebase Storage
  const deleteAllUserFiles = async (userId: string) => {
    try {
      const userStorageRef = ref(storage, `users/${userId}`);
      const listResult = await listAll(userStorageRef);
      
      // Delete all files in the user's folder
      const deletePromises = listResult.items.map(item => deleteObject(item));
      
      // Delete all files in subfolders recursively
      const subfolderPromises = listResult.prefixes.map(async (prefix) => {
        const subItems = await listAll(prefix);
        return Promise.all(subItems.items.map(item => deleteObject(item)));
      });
      
      await Promise.all([...deletePromises, ...subfolderPromises]);
    } catch (error) {
      console.warn('Error deleting user files from Storage:', error);
      throw error;
    }
  };

  // Helper function to delete files from specific folder structure
  const deleteUserFilesFromFolder = async (folderName: string, userId: string) => {
    try {
      const folderRef = ref(storage, `${folderName}/${userId}`);
      const listResult = await listAll(folderRef);
      
      if (listResult.items.length > 0) {
        const deletePromises = listResult.items.map(item => deleteObject(item));
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.warn(`Error deleting ${folderName} files:`, error);
      // Don't throw error, just warn - this folder might not exist
    }
  };

  const signup = async (email: string, password: string, userType: UserType, displayName?: string, userData?: UserData | MentorData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const profile = createUserProfile(user.uid, user.email!, userType, displayName, userData as MentorData);

      // Save to Firestore - this must succeed
      await setDoc(doc(db, 'users', user.uid), profile);

      try {
        await sendEmailVerification(user);
      } catch (emailError) {
        // Continue anyway - user can request verification later
        console.warn('Failed to send verification email:', emailError);
      }
      
      setUserProfile(profile);
    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        if (data && data.email && data.userType) {
          const profile: UserProfile = {
            uid: user.uid,
            email: data.email,
            userType: data.userType,
            displayName: data.displayName,
            profilePicture: data.profilePicture,
            emailVerified: user.emailVerified,
            createdAt: data.createdAt?.toDate() || new Date(),
            timeZone: data.timeZone, // Common field for all users
            // Include mentor-specific fields if they exist
            ...(data.userType === 'mentor' && {
              jobTitle: data.jobTitle,
              company: data.company,
              industry: data.industry,
              yearsOfExperience: data.yearsOfExperience,
              linkedinUrl: data.linkedinUrl,
              bio: data.bio,
              expertise: data.expertise || [],
              mentorshipAreas: data.mentorshipAreas || [],
              availability: data.availability,
            })
          };
          setUserProfile(profile);
          return profile;
        } else {
          throw new Error('Invalid user profile data');
        }
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (currentUser && !currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
      } catch (error) {
        throw error;
      }
    } else if (currentUser?.emailVerified) {
      throw new Error('Email is already verified');
    } else {
      throw new Error('No user found');
    }
  };

  const updateProfilePicture = async (imageUri: string) => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    try {
      // Delete old profile picture from Firebase Storage if it exists
      if (userProfile.profilePicture) {
        await deleteImageFromFirebase(userProfile.profilePicture);
      }

      // Upload new image to Firebase Storage
      const downloadURL = await uploadImageToFirebase(imageUri, currentUser.uid);
      
      // Update Firestore with the new download URL
      const updatedProfile = { ...userProfile, profilePicture: downloadURL };
      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const deleteProfilePicture = async () => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    try {
      // Delete image from Firebase Storage if it exists
      if (userProfile.profilePicture) {
        await deleteImageFromFirebase(userProfile.profilePicture);
      }

      // Remove the profilePicture field from Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profilePicture: deleteField()
      });
      
      // Update local state by removing the profilePicture field
      const updatedProfile = { ...userProfile };
      delete updatedProfile.profilePicture;
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return;

    try {
      await currentUser.reload(); // Refresh Firebase Auth user
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data && data.email && data.userType) {
          const profile: UserProfile = {
            uid: currentUser.uid,
            email: data.email,
            userType: data.userType,
            displayName: data.displayName,
            profilePicture: data.profilePicture,
            emailVerified: currentUser.emailVerified, // This gets the fresh verification status
            createdAt: data.createdAt?.toDate() || new Date(),
            timeZone: data.timeZone, // Common field for all users
            // Include mentor-specific fields if they exist
            ...(data.userType === 'mentor' && {
              jobTitle: data.jobTitle,
              company: data.company,
              industry: data.industry,
              yearsOfExperience: data.yearsOfExperience,
              linkedinUrl: data.linkedinUrl,
              bio: data.bio,
              expertise: data.expertise || [],
              mentorshipAreas: data.mentorshipAreas || [],
              availability: data.availability,
            })
          };
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const deleteAccount = async (password: string) => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    if (!password || password.trim() === '') {
      throw new Error('Password is required for account deletion');
    }

    try {
      // Step 1: Re-authenticate user with their password to refresh token
      const credential = EmailAuthProvider.credential(currentUser.email!, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Step 2: Delete all user files from Firebase Storage
      try {
        // Delete profile picture specifically (stored in /profile-pictures/)
        if (userProfile.profilePicture) {
          await deleteImageFromFirebase(userProfile.profilePicture);
        }
        
        // Delete any other files in user folder (stored in /users/{userId}/)
        await deleteAllUserFiles(currentUser.uid);
        
        // Delete voice files if they exist (stored in /voice/{userId}/)
        await deleteUserFilesFromFolder('voice', currentUser.uid);
        
        // Delete video files if they exist (stored in /video/{userId}/)
        await deleteUserFilesFromFolder('video', currentUser.uid);
      } catch (storageError) {
        console.warn('Failed to delete user files from Storage:', storageError);
        // Don't fail the entire deletion if Storage deletion fails
      }
      
      // Step 3: Delete Firestore document (while user is still authenticated)
      await deleteDoc(doc(db, 'users', currentUser.uid));
      
      // Step 4: Delete Firebase Auth user (this removes authentication)
      await deleteUser(currentUser);
      
      // Step 5: Clear local state
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error: any) {
      // Handle specific Firebase Auth errors
      if (error?.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error?.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error?.code === 'auth/requires-recent-login') {
        throw new Error('Session expired. Please sign out and sign back in.');
      }
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    try {
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const updateMentorProfile = async (mentorData: Partial<MentorData>) => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    if (userProfile.userType !== 'mentor') {
      throw new Error('Only mentors can update mentor profile data');
    }

    try {
      // Update Firestore with the new mentor data
      await updateDoc(doc(db, 'users', currentUser.uid), mentorData);
      
      // Update local state
      const updatedProfile = { ...userProfile, ...mentorData };
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const updateDisplayName = async (displayName: string) => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    try {
      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName });
      
      // Update local state
      const updatedProfile = { ...userProfile, displayName };
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data && data.email && data.userType) {
              const profile: UserProfile = {
                uid: user.uid,
                email: data.email,
                userType: data.userType,
                displayName: data.displayName,
                profilePicture: data.profilePicture,
                emailVerified: user.emailVerified,
                createdAt: data.createdAt?.toDate() || new Date(),
                timeZone: data.timeZone, // Common field for all users
                // Include mentor-specific fields if they exist
                ...(data.userType === 'mentor' && {
                  jobTitle: data.jobTitle,
                  company: data.company,
                  industry: data.industry,
                  yearsOfExperience: data.yearsOfExperience,
                  linkedinUrl: data.linkedinUrl,
                  bio: data.bio,
                  expertise: data.expertise || [],
                  mentorshipAreas: data.mentorshipAreas || [],
                  availability: data.availability,
                })
              };
              setUserProfile(profile);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);



  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    sendVerificationEmail,
    updateProfilePicture,
    deleteProfilePicture,
    refreshProfile,
    deleteAccount,
    changePassword,
    updateMentorProfile,
    updateDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};