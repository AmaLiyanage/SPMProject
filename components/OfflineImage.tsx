import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  ImageProps,
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { offlineCacheService } from '../services/offlineCacheService';

interface OfflineImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  placeholder?: React.ReactNode;
  showDownloadButton?: boolean;
  priority?: 'high' | 'medium' | 'low';
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  onCacheComplete?: (localPath: string) => void;
  onCacheError?: (error: Error) => void;
}

export const OfflineImage: React.FC<OfflineImageProps> = ({
  uri,
  style,
  placeholder,
  showDownloadButton = false,
  priority = 'medium',
  fallbackIcon = 'image-outline',
  onCacheComplete,
  onCacheError,
  ...imageProps
}) => {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showDownloadOption, setShowDownloadOption] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadImage();
    
    // Cleanup timeout on unmount or URI change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [uri]);

  const loadImage = async () => {
    if (!uri) {
      setIsLoading(false);
      setHasError(true);
      setIsImageReady(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      setIsImageReady(false);
      setHasStartedLoading(false);

      // First, try to get cached image
      const cachedPath = await offlineCacheService.getCachedImagePath(uri);
      
      if (cachedPath) {
        // Use cached image - add file:// prefix for React Native Image component
        const fileUri = `file://${cachedPath}`;
        setImageSource(fileUri);
        onCacheComplete?.(cachedPath);
      } else {
        // No cached image, use original URI and start caching in background
        setImageSource(uri);
        
        // Cache image in background for next time (but don't await it)
        offlineCacheService.cacheImage(uri, priority).catch(console.error);
        
        // Show download option if requested
        if (showDownloadButton) {
          setShowDownloadOption(true);
        }
      }

      // Set a fallback in case load events don't fire (common with cached files)
      if (cachedPath) {
        // For cached images, we can assume they're valid since we checked file existence
        // Set a short timeout to transition out of loading state
        setTimeout(() => {
          if (isLoading && !isImageReady) {
            setIsLoading(false);
            setIsImageReady(true);
          }
        }, 100);
      }
      
      // Important: Don't set isLoading to false here - let onLoad handle it
    } catch (error) {
      console.error('Failed to load image:', error);
      setHasError(true);
      setIsLoading(false);
      setIsImageReady(false);
      onCacheError?.(error as Error);
    }
  };

  const downloadImage = async () => {
    if (isDownloading || !uri) return;

    try {
      setIsDownloading(true);
      
      const cachedPath = await offlineCacheService.cacheImage(uri, priority);
      
      if (cachedPath) {
        setImageSource(`file://${cachedPath}`);
        setShowDownloadOption(false);
        onCacheComplete?.(cachedPath);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      onCacheError?.(error as Error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImageError = (error: any) => {
    // Clear timeout since image failed to load
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // If this was a cached image that failed, try the original network URL as fallback
    if (imageSource?.startsWith('file://') && uri && uri !== imageSource) {
      setImageSource(uri);
      setIsLoading(true);
      setHasError(false);
      setIsImageReady(false);
      
      // Remove the broken cached file
      offlineCacheService.removeBrokenCachedImage(uri).catch(console.error);
      
      return; // Don't set error state yet, give network image a chance
    }
    
    setHasError(true);
    setIsLoading(false);
    setIsImageReady(false);
  };

  const handleImageLoad = () => {
    // Clear timeout since image loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    setIsLoading(false);
    setIsImageReady(true);
    setHasError(false);
  };

  const handleImageLoadStart = () => {
    // Prevent infinite loops - only set loading state if we haven't started yet
    if (!hasStartedLoading) {
      setHasStartedLoading(true);
      setIsLoading(true);
      setIsImageReady(false);
      setHasError(false);
      
      // Set a timeout to prevent infinite loading states
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
        setIsImageReady(false);
      }, 10000); // 10 second timeout
    }
  };

  // Only show placeholder if we're loading AND don't have an image source yet
  if (isLoading && !imageSource && placeholder) {
    return <View style={style}>{placeholder}</View>;
  }

  if (hasError && !imageSource) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Ionicons 
          name={fallbackIcon} 
          size={32} 
          color="#9ca3af" 
        />
        <Text style={styles.errorText}>Image unavailable</Text>
        {showDownloadButton && uri && (
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadImage}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Determine what components to render
  const showLoadingPlaceholder = (isLoading && !isImageReady);
  const showImage = !!imageSource;
  const showErrorState = hasError && !imageSource;

  return (
    <View style={styles.container}>
      {/* Show loading placeholder when loading and no image is ready */}
      {showLoadingPlaceholder && (
        <View style={[styles.loadingPlaceholder, style]}>
          <ActivityIndicator size="small" color="#9333ea" />
          <Text style={{fontSize: 10, color: '#666', marginTop: 4}}>Loading...</Text>
        </View>
      )}
      
      {/* Image - show when we have a source */}
      {showImage && (
        <>
          <Image
            {...imageProps}
            source={{ uri: imageSource }}
            style={[
              style,
              // Hide image while loading but keep it in DOM for onLoad events
              (isLoading && !isImageReady) ? styles.imageHidden : undefined
            ]}
            onLoadStart={handleImageLoadStart}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      )}
      
      {/* Show error state */}
      {showErrorState && (
        <View style={[styles.loadingPlaceholder, style]}>
          <Text style={{fontSize: 10, color: 'red'}}>Error loading image</Text>
        </View>
      )}
      
      {showDownloadOption && isImageReady && (
        <View style={styles.downloadContainer}>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={downloadImage}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="white" />
                <Text style={styles.downloadText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Component for progressive image loading with blur effect
export const ProgressiveImage: React.FC<OfflineImageProps & {
  lowResUri?: string;
  blurRadius?: number;
}> = ({
  uri,
  lowResUri,
  blurRadius = 5,
  style,
  ...props
}) => {
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [lowResSource, setLowResSource] = useState<string | null>(null);
  const [highResSource, setHighResSource] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, [uri, lowResUri]);

  const loadImages = async () => {
    // Load low-res image first
    if (lowResUri) {
      const cachedLowRes = await offlineCacheService.getCachedImagePath(lowResUri);
      setLowResSource(cachedLowRes ? `file://${cachedLowRes}` : lowResUri);
    }

    // Load high-res image
    const cachedHighRes = await offlineCacheService.getCachedImagePath(uri);
    setHighResSource(cachedHighRes ? `file://${cachedHighRes}` : uri);
  };

  return (
    <View style={style}>
      {/* Low-res background image */}
      {lowResSource && (
        <Image
          source={{ uri: lowResSource }}
          style={[style, styles.absoluteFill]}
          blurRadius={highResLoaded ? 0 : blurRadius}
        />
      )}
      
      {/* High-res image */}
      {highResSource && (
        <OfflineImage
          {...props}
          uri={highResSource}
          style={[style, !lowResSource ? undefined : styles.absoluteFill]}
          onLoad={() => setHighResLoaded(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    zIndex: 2,
  },
  imageHidden: {
    opacity: 0,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#9333ea',
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  downloadContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  downloadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});