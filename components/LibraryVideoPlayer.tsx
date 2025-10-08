import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OfflineImage } from './OfflineImage';

interface LibraryVideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  duration?: number;
  isVisible: boolean;
  onPress?: () => void;
  style?: any;
}

export const LibraryVideoPlayer: React.FC<LibraryVideoPlayerProps> = ({
  uri,
  thumbnailUri,
  duration,
  isVisible,
  onPress,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  
  // Create video player instance
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = true;
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const muteButtonOpacity = useRef(new Animated.Value(0)).current;

  const startVideoPlayback = useCallback(async () => {
    try {
      setIsLoading(true);
      setShowVideo(true);
      
      // Fade in video
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (player) {
        player.play();
      }
    } catch (error) {
      console.error('Failed to start video playback:', error);
      setHasError(true);
      setShowVideo(false);
    }
  }, [player, fadeAnim]);

  const pauseVideo = useCallback(async () => {
    try {
      if (player && player.playing) {
        player.pause();
      }
    } catch (error) {
      console.error('Failed to pause video:', error);
    }
  }, [player]);

  // Auto-play when visible
  useEffect(() => {
    if (isVisible && !showVideo && !hasError) {
      // Small delay to ensure smooth scrolling
      const timer = setTimeout(() => {
        startVideoPlayback();
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isVisible && (() => {
      try {
        return player?.playing;
      } catch {
        return false;
      }
    })()) {
      pauseVideo();
    }
  }, [isVisible, showVideo, hasError, startVideoPlayback, pauseVideo]);

  // Hide mute button after showing it  
  useEffect(() => {
    // Check if opacity value is greater than 0 in a safer way
    const currentOpacity = (muteButtonOpacity as any)._value;
    if (currentOpacity > 0) {
      const timer = setTimeout(() => {
        Animated.timing(muteButtonOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }).start();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [muteButtonOpacity]);

  const handleVideoPress = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleMuteToggle = async () => {
    try {
      if (player) {
        const currentMuted = player.muted;
        player.muted = !currentMuted;
        
        // Show mute button feedback
        Animated.sequence([
          Animated.timing(muteButtonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(muteButtonOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  // Listen to player events
  useEffect(() => {
    if (!player) return;

    const statusUpdateListener = (status: any) => {
      if (status.error) {
        console.error('Video player error:', status.error);
        setHasError(true);
        setIsLoading(false);
      } else if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
      } else if (status.status === 'loading') {
        setIsLoading(true);
      }
    };

    // Add listeners
    const statusSubscription = player.addListener('statusChange', statusUpdateListener);
    
    return () => {
      // Remove listeners on cleanup
      statusSubscription?.remove();
    };
  }, [player]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail - always visible initially */}
      {thumbnailUri && (!showVideo || hasError) && (
        <OfflineImage
          uri={thumbnailUri}
          style={styles.thumbnail}
          resizeMode="cover"
          priority="medium"
          fallbackIcon="image-outline"
          placeholder={
            <View style={styles.thumbnailLoader}>
              <ActivityIndicator size="small" color="#9333ea" />
            </View>
          }
        />
      )}

      {/* Video Player - fades in when ready */}
      {showVideo && !hasError && (
        <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
          />
        </Animated.View>
      )}

      {/* Video Overlay */}
      <TouchableOpacity 
        style={styles.overlay} 
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        {/* Play Icon - shown on thumbnail */}
        {!showVideo && !hasError && (
          <View style={styles.playIconContainer}>
            <View style={styles.playIcon}>
              <Ionicons name="play" size={24} color="white" />
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}

        {/* Error State */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="white" />
          </View>
        )}

        {/* Duration Badge */}
        {duration && !showVideo && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(duration)}
            </Text>
          </View>
        )}

        {/* Mute Button - shows when video is playing */}
        {showVideo && !hasError && (
          <Animated.View style={[styles.muteButton, { opacity: muteButtonOpacity }]}>
            <TouchableOpacity onPress={handleMuteToggle} style={styles.muteButtonTouch}>
              <Ionicons 
                name={(() => {
                  try {
                    return player?.muted ? 'volume-mute' : 'volume-high';
                  } catch {
                    return 'volume-high';
                  }
                })()} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailLoader: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  muteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  muteButtonTouch: {
    padding: 4,
  },
});