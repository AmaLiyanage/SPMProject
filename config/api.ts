// config/api.ts
export const API_CONFIG = {
  ASSEMBLYAI: {
    API_KEY: 'a046c13c374d4c0394ee0a99c5a0d0e2', // Replace with your actual API key
    UPLOAD_ENDPOINT: 'https://api.assemblyai.com/v2/upload',
    TRANSCRIPT_ENDPOINT: 'https://api.assemblyai.com/v2/transcript',
  }
};

// For production, you should use environment variables:
// API_KEY: process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY || 'fallback_key'