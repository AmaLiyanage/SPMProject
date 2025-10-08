import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OfflineImage } from './OfflineImage';

interface ContentVideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  title?: string;
  style?: any;
  onPlaybackStatusUpdate?: (status: any) => void;
}

const { width } = Dimensions.get('window');

export const ContentVideoPlayer: React.FC<ContentVideoPlayerProps> = ({
  uri,
  thumbnailUri,
  title,
  style,
  onPlaybackStatusUpdate,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  
  // Auto-hide controls timeout
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create video player instance only when needed
  const player = useVideoPlayer(showVideo ? uri : null, (player) => {
    player.loop = false;
    player.muted = false; // Content videos should have audio by default
  });

  // Listen to player events
  useEffect(() => {
    if (!player || !showVideo) return;

    const statusUpdateListener = (status: any) => {
      onPlaybackStatusUpdate?.(status);
      
      if (status.error) {
        console.error('Video player error:', status.error);
        let errorMsg = 'Failed to load video';
        
        // Provide more specific error messages
        const errorMessage = status.error.message || '';
        if (errorMessage.includes('timed out')) {
          errorMsg = 'Video loading timed out. Please check your internet connection.';
        } else if (errorMessage.includes('network')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          errorMsg = 'Video not found. It may have been moved or deleted.';
        } else if (errorMessage.includes('format')) {
          errorMsg = 'Video format not supported on this device.';
        } else if (errorMessage) {
          errorMsg = errorMessage;
        }
        
        setErrorMessage(errorMsg);
        setHasError(true);
        setIsLoading(false);
      } else if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
      } else if (status.status === 'loading') {
        setIsLoading(true);
        setHasError(false);
      }
    };

    const sourceChangeListener = () => {
      setIsLoading(false);
      setHasError(false);
    };

    // Add listeners
    const statusSubscription = player.addListener('statusChange', statusUpdateListener);
    const sourceSubscription = player.addListener('sourceChange', sourceChangeListener);

    return () => {
      statusSubscription?.remove();
      sourceSubscription?.remove();
    };
  }, [player, showVideo, onPlaybackStatusUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const showCloseButtonWithTimeout = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Clear existing timeout
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    // Auto-hide close button after 3 seconds
    hideControlsTimeoutRef.current = setTimeout(() => {
      hideCloseButton();
    }, 3000);
  }, [controlsOpacity]);

  const hideCloseButton = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startVideoPlayback = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setShowVideo(true);

      // Fade in video
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Add a timeout for loading
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading && showVideo && !hasError) {
          setErrorMessage('Video loading timed out. Please check your connection.');
          setHasError(true);
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout
    } catch (error) {
      console.error('Failed to start video playback:', error);
      setErrorMessage('Failed to initialize video player');
      setHasError(true);
      setIsLoading(false);
    }
  };


  const handleRetry = () => {
    setHasError(false);
    setErrorMessage('');
    setShowVideo(false);
    setIsLoading(false);
    
    // Small delay before retrying
    setTimeout(() => {
      startVideoPlayback();
    }, 500);
  };

  const handleThumbnailPress = () => {
    if (!showVideo) {
      startVideoPlayback();
    }
  };

  const handleVideoPress = () => {
    if (hasError) {
      handleRetry();
    } else {
      // Show close button when video area is tapped
      showCloseButtonWithTimeout();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail - shown initially or on error */}
      {(!showVideo || hasError) && thumbnailUri && (
        <TouchableOpacity onPress={handleThumbnailPress} activeOpacity={0.9}>
          <OfflineImage
            uri={thumbnailUri}
            style={styles.thumbnail}
            resizeMode="cover"
            priority="high"
            fallbackIcon="image-outline"
            placeholder={
              <View style={styles.thumbnailLoader}>
                <ActivityIndicator size="large" color="#9333ea" />
              </View>
            }
          />
          
          {/* Play Button Overlay */}
          {!showVideo && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={48} color="white" />
              </View>
              <Text style={styles.playText}>Tap to play video</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Video Player */}
      {showVideo && !hasError && (
        <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={handleVideoPress} activeOpacity={1}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={true}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}

            {/* Close Button - Centered at Top
            <Animated.View 
              style={[styles.closeButtonOverlay, { opacity: controlsOpacity }]}
              pointerEvents="box-none"
            >
              <TouchableOpacity 
                onPress={() => setShowVideo(false)} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </Animated.View> */}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Error State */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Unable to load video</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.backToThumbnailButton} 
              onPress={() => {
                setHasError(false);
                setShowVideo(false);
              }}
            >
              <Text style={styles.backToThumbnailText}>Show Thumbnail</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: width * 0.56, // 16:9 aspect ratio
  },
  thumbnailLoader: {
    width: '100%',
    height: width * 0.56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 12,
  },
  playText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  videoContainer: {
    position: 'relative',
  },
  video: {
    width: '100%',
    height: width * 0.56,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
  // 
//   closeButtonOverlay: {
//     position: 'absolute',
//     top: 15,
//     right: 10,           // ← distance from right edge
//     // remove left
//     alignItems: 'flex-end', // aligns child button inside
//     pointerEvents: 'box-none',
//  },
//  closeButton: {
//     padding: 12,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     borderRadius: 25,
//   },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    maxWidth: '80%',
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToThumbnailButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backToThumbnailText: {
    color: '#d1d5db',
    fontSize: 14,
  },
});