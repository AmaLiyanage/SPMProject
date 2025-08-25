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
  displayName?: string,
  mentorData?: {
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

  // Add user/mentor-specific fields if provided
  if (mentorData) {
    // Time zone is common for both users and mentors
    if (mentorData.timeZone) profile.timeZone = mentorData.timeZone;
    
    // Mentor-specific fields (only for mentors)
    if (userType === 'mentor') {
      if (mentorData.jobTitle) profile.jobTitle = mentorData.jobTitle;
      if (mentorData.company) profile.company = mentorData.company;
      if (mentorData.industry) profile.industry = mentorData.industry;
      if (mentorData.yearsOfExperience) profile.yearsOfExperience = mentorData.yearsOfExperience;
      if (mentorData.linkedinUrl) profile.linkedinUrl = mentorData.linkedinUrl;
      if (mentorData.bio) profile.bio = mentorData.bio;
      if (mentorData.expertise && mentorData.expertise.length > 0) profile.expertise = mentorData.expertise;
      if (mentorData.mentorshipAreas && mentorData.mentorshipAreas.length > 0) profile.mentorshipAreas = mentorData.mentorshipAreas;
      if (mentorData.availability) profile.availability = mentorData.availability;
    }
  }

  return profile;
};