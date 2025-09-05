import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged,
  deleteUser,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createUserProfile } from '../utils/auth';
import { uploadImageToFirebase, deleteImageFromFirebase } from '../utils/imageUtils';

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
  deleteAccount: () => Promise<void>;
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
            emailVerified: currentUser.emailVerified,
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

  const deleteAccount = async () => {
    if (!currentUser || !userProfile) {
      throw new Error('No authenticated user found');
    }

    try {
      // First delete the Firestore document
      await deleteDoc(doc(db, 'users', currentUser.uid));
      
      // Then delete the Firebase Auth user
      await deleteUser(currentUser);
      
      // Clear local state
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
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
                  timeZone: data.timeZone,
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

  // Sync email verification status when user navigates between tabs
  useEffect(() => {
    const syncEmailVerification = async () => {
      if (currentUser && userProfile && !userProfile.emailVerified) {
        try {
          await currentUser.reload(); // Refresh Firebase Auth user
          if (currentUser.emailVerified !== userProfile.emailVerified) {
            // Update profile state with current verification status
            setUserProfile(prev => prev ? {
              ...prev,
              emailVerified: currentUser.emailVerified
            } : null);
          }
        } catch (error: any) {
          // Only log network errors, ignore others to reduce noise
          if (error?.code === 'auth/network-request-failed') {
            // Network error - silently ignore, will retry later
            return;
          }
          console.error('Error syncing email verification:', error);
        }
      }
    };

    // Only sync if user is not verified yet
    if (currentUser && userProfile && !userProfile.emailVerified) {
      syncEmailVerification();
      const interval = setInterval(syncEmailVerification, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userProfile?.uid, userProfile?.emailVerified]); // Stop syncing once verified


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