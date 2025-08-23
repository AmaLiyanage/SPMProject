import { UserProfile } from '../contexts/AuthContext';

export const validateUserType = (userProfile: UserProfile, expectedType: 'user' | 'mentor'): boolean => {
  return userProfile.userType === expectedType;
};

export const getUserTypeErrorMessage = (expectedType: 'user' | 'mentor'): string => {
  if (expectedType === 'user') {
    return 'This login is for users only. Please use the mentor login if you are a mentor.';
  } else {
    return 'This account is not registered as a mentor. Please use the user login.';
  }
};

export const createUserProfile = (
  uid: string, 
  email: string, 
  userType: 'user' | 'mentor', 
  displayName?: string
): UserProfile => {
  const profile: UserProfile = {
    uid,
    email,
    userType,
    emailVerified: false,
    createdAt: new Date()
  };

  // Only add displayName if it's provided
  if (displayName) {
    profile.displayName = displayName;
  }

  // Don't add profilePicture field at all if undefined
  return profile;
};