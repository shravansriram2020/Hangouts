import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

export default function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [soundLoaded, setSoundLoaded] = useState(false);
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
      setSoundLoaded(true);
    } catch (error) {
      console.log('Error loading sound:', error);
      setSoundLoaded(true); // Mark as loaded even on error to not block video
    }
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  // Only start playback when BOTH video AND sound are loaded
  useEffect(() => {
    if (videoLoaded && soundLoaded && !isPlaying) {
      startPlayback();
    }
  }, [videoLoaded, soundLoaded]);

  const startPlayback = async () => {
    setIsPlaying(true);
    
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.setStatusAsync({ shouldPlay: true });
      }
      if (videoRef.current) {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error during playback:', error);
    }
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
        source={require('../../assets/splash/splash-video.mov')}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onLoad={handleVideoLoad}
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
  },
  video: {
    position: 'absolute',
    width: width * 1.15,
    height: height * 1.15,
  },
});
