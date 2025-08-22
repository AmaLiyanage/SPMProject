import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type UserType = 'user' | 'mentor';

export interface UserProfile {
  uid: string;
  email: string;
  userType: UserType;
  displayName?: string;
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
      console.log('✅ User created successfully:', user.uid);
      
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        userType,
        displayName,
        emailVerified: false,
        createdAt: new Date()
      };

      try {
        // Try to save to Firestore with timeout
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), profile),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          )
        ]);
        console.log('✅ User profile saved to Firestore');
      } catch (firestoreError) {
        console.warn('⚠️ Failed to save user profile to Firestore:', firestoreError);
        // Continue anyway - we can save the profile later
      }

      try {
        await sendEmailVerification(user);
        console.log('✅ Verification email sent');
      } catch (emailError) {
        console.warn('⚠️ Failed to send verification email:', emailError);
        // Continue anyway - user can request verification later
      }
      
      setUserProfile(profile);
      console.log('✅ Signup completed successfully');
    } catch (error) {
      console.error('❌ Signup failed:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        profile.emailVerified = user.emailVerified;
        setUserProfile(profile);
        return profile;
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
        console.log('📧 Sending verification email to:', currentUser.email);
        await sendEmailVerification(currentUser);
        console.log('✅ Verification email sent successfully');
      } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        throw error;
      }
    } else if (currentUser?.emailVerified) {
      console.log('ℹ️ Email is already verified');
      throw new Error('Email is already verified');
    } else {
      console.log('⚠️ No current user found');
      throw new Error('No user found');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            profile.emailVerified = user.emailVerified;
            setUserProfile(profile);
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
    sendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};