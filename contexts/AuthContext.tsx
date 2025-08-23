import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createUserProfile } from '../utils/auth';

export type UserType = 'user' | 'mentor';

export interface UserProfile {
  uid: string;
  email: string;
  userType: UserType;
  displayName?: string;
  profilePicture?: string;
  emailVerified: boolean;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, userType: UserType, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  deleteProfilePicture: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  const signup = async (email: string, password: string, userType: UserType, displayName?: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const profile = createUserProfile(user.uid, user.email!, userType, displayName);

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
            createdAt: data.createdAt?.toDate() || new Date()
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
      const updatedProfile = { ...userProfile, profilePicture: imageUri };
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
      // Use updateDoc with deleteField to properly remove the field from Firestore
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
            createdAt: data.createdAt?.toDate() || new Date()
          };
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
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
                createdAt: data.createdAt?.toDate() || new Date()
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
      if (currentUser && userProfile) {
        try {
          await currentUser.reload(); // Refresh Firebase Auth user
          if (currentUser.emailVerified !== userProfile.emailVerified) {
            // Update profile state with current verification status
            setUserProfile(prev => prev ? {
              ...prev,
              emailVerified: currentUser.emailVerified
            } : null);
          }
        } catch (error) {
          // Silently fail - don't interrupt user experience
          console.error('Error syncing email verification:', error);
        }
      }
    };

    // Sync immediately and then every 30 seconds while app is active
    if (currentUser && userProfile) {
      syncEmailVerification();
      const interval = setInterval(syncEmailVerification, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userProfile?.uid]); // Only depend on user existence and uid


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
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};