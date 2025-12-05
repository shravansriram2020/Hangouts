import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

export default function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/splash/splash-sound.mp3'),
        { volume: 0.3 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error loading sound:', error);
    }
  };

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setVideoLoaded(true);
  };

  const handleVideoError = (error: any) => {
    console.log('Video error:', error);
    // If video fails, skip to app after a delay
    setTimeout(() => {
      onAnimationComplete();
    }, 1000);
  };

  useEffect(() => {
    if (videoLoaded && !isPlaying) {
      startPlayback();
    }
  }, [videoLoaded]);

  const startPlayback = async () => {
    setIsPlaying(true);
    
    // Start video immediately
    if (videoRef.current) {
      await videoRef.current.playAsync();
    }
    
    // Delay sound by 1 second
    setTimeout(async () => {
      try {
        if (soundRef.current) {
          // Reset to beginning before playing to ensure it plays each time
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.playAsync();
        }
      } catch (error) {
        console.log('Error playing sound:', error);
      }
    }, 1000);
  };

  const handleVideoEnd = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onAnimationComplete();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Video
        ref={videoRef}
        source={require('../../assets/splash/splash-animation.mov')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        onLoad={handleVideoLoad}
        onError={handleVideoError}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            handleVideoEnd();
          }
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(180, 222, 242)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    width: width * 2.5,
    height: height * 2.5,
  },
});
