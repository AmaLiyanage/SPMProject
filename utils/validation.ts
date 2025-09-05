export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const getFirebaseErrorMessage = (error: any): string => {
  // Handle Firebase error objects
  if (error && typeof error === 'object') {
    const errorCode = error.code || error.name;
    
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/operation-not-allowed':
        return 'This operation is not allowed';
      default:
        // If we have a custom message, use it
        if (error.message && !error.message.includes('Firebase:')) {
          return error.message;
        }
        return 'Login failed. Please check your credentials and try again';
    }
  }
  
  // Handle string error codes
  if (typeof error === 'string') {
    switch (error) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      default:
        return error;
    }
  }
  
  return 'An error occurred. Please try again';
};