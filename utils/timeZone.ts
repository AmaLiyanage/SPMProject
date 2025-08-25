/**
 * Auto-detect user's time zone
 */
export const getAutoTimeZone = (): string => {
  try {
    // Get the user's time zone using Intl API
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone; // e.g., "America/New_York", "Europe/London", "Asia/Tokyo"
  } catch (error) {
    console.error('Failed to detect time zone:', error);
    return 'UTC'; // Fallback to UTC
  }
};

/**
 * Get a user-friendly time zone name
 */
export const getTimeZoneDisplayName = (timeZone?: string): string => {
  try {
    const tz = timeZone || getAutoTimeZone();
    const now = new Date();
    
    // Get the short time zone name (e.g., "EST", "PST", "GMT+5")
    const shortName = now.toLocaleString('en-US', { 
      timeZone: tz,
      timeZoneName: 'short' 
    }).split(' ').pop() || tz;
    
    return shortName;
  } catch (error) {
    return timeZone || 'UTC';
  }
};

/**
 * Auto-update time zone in user profile data
 */
export const ensureTimeZoneInProfile = (profileData: any) => {
  if (!profileData.timeZone) {
    profileData.timeZone = getAutoTimeZone();
  }
  return profileData;
};