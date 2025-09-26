import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';

interface FacebookVideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  autoPlay?: boolean;
  muted?: boolean;
  style?: any;
  onPlaybackStatusUpdate?: (status: any) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FacebookVideoPlayer: React.FC<FacebookVideoPlayerProps> = ({
  uri,
  thumbnailUri,
  autoPlay = false,
  muted = true,
  style,
  onPlaybackStatusUpdate,
}) => {
  // Create video player instance
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = muted;
    if (autoPlay) {
      player.play();
    }
  });
  
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Animation values
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  
  // Auto-hide controls
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Keep screen awake when playing
  useKeepAwake('FacebookVideoPlayer');

  // Listen to player events
  useEffect(() => {
    if (!player) return;

    const statusUpdateListener = (status: any) => {
      setCurrentTime(status.currentTime);
      setDuration(status.duration);
      setIsLoading(status.status === 'loading');
      setHasError(status.status === 'error');
      
      onPlaybackStatusUpdate?.(status);
      
      // Update progress bar
      if (status.duration > 0 && status.currentTime >= 0) {
        const progress = status.currentTime / status.duration;
        Animated.timing(progressBarWidth, {
          toValue: progress,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
    };

    const loadListener = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const errorListener = (error: any) => {
      console.error('Video player error:', error);
      setHasError(true);
      setIsLoading(false);
    };

    // Add listeners
    const statusSubscription = player.addListener('statusChange', statusUpdateListener);
    const loadSubscription = player.addListener('sourceChange', loadListener);

    return () => {
      // Remove listeners on cleanup
      statusSubscription?.remove();
      loadSubscription?.remove();
    };
  }, [player, onPlaybackStatusUpdate, progressBarWidth]);

  const showControlsWithTimeout = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Clear existing timeout
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    // Auto-hide after 3 seconds
    hideControlsTimeoutRef.current = setTimeout(() => {
      try {
        if (player && player.playing) {
          hideControls();
        }
      } catch (error) {
        // Ignore errors when checking player state after cleanup
        console.log('Player state check ignored after cleanup');
      }
    }, 3000);
  }, [player, controlsOpacity]);

  useEffect(() => {
    if (showControls) {
      showControlsWithTimeout();
    }
  }, [showControls, showControlsWithTimeout]);

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowControls(false);
    });
  };

  const handlePlayPause = () => {
    if (!player) return;
    
    try {
      const isPlaying = player.playing;
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
      showControlsWithTimeout();
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const handleMuteToggle = () => {
    if (!player) return;
    
    try {
      const currentMuted = player.muted;
      player.muted = !currentMuted;
      showControlsWithTimeout();
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    
    if (!isFullscreen) {
      StatusBar.setHidden(true, 'slide');
    } else {
      StatusBar.setHidden(false, 'slide');
    }
  };

  const handleVideoPress = () => {
    if (showControls) {
      handlePlayPause();
    } else {
      setShowControls(true);
      showControlsWithTimeout();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentTime = () => {
    return formatTime(currentTime);
  };

  const getDuration = () => {
    return formatTime(duration);
  };

  const containerStyle = isFullscreen 
    ? styles.fullscreenContainer 
    : [styles.container, style];

  const videoStyle = isFullscreen 
    ? styles.fullscreenVideo 
    : styles.video;

  return (
    <View style={containerStyle}>
      <TouchableOpacity 
        style={styles.videoContainer} 
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        <VideoView
          player={player}
          style={videoStyle}
          contentFit="contain"
        />

        {/* Loading Indicator */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingIndicator}>
              <Ionicons name="refresh" size={24} color="white" />
            </View>
          </View>
        )}

        {/* Error State */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color="white" />
              <Text style={styles.errorText}>Unable to load video</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setHasError(false);
                  setIsLoading(true);
                  player.replace(uri);
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Play/Pause Overlay */}
        {(() => {
          try {
            return !player?.playing && !isLoading;
          } catch {
            return !isLoading;
          }
        })() && (
          <View style={styles.playOverlay}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              <Ionicons name="play" size={48} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Controls Overlay */}
        <Animated.View 
          style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          {/* Top Controls */}
          <View style={styles.topControls}>
            {isFullscreen && (
              <TouchableOpacity onPress={handleFullscreenToggle}>
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressBarWidth.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                <Ionicons 
                  name={(() => {
                    try {
                      return player?.playing ? 'pause' : 'play';
                    } catch {
                      return 'play';
                    }
                  })()} 
                  size={20} 
                  color="white" 
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleMuteToggle} style={styles.controlButton}>
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

              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {getCurrentTime()} / {getDuration()}
                </Text>
              </View>

              {!isFullscreen && (
                <TouchableOpacity onPress={handleFullscreenToggle} style={styles.controlButton}>
                  <Ionicons name="expand" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: 200,
  },
  fullscreenVideo: {
    width: screenWidth,
    height: screenHeight,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 25,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: '500',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 40,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 12,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomControls: {
    padding: 12,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9333ea',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    padding: 8,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});