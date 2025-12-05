import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

export default function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasStartedRef = useRef(false);

  const videoSource = require('../../assets/splash/splash-video.mp4');

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.muted = true;
  });

  useEffect(() => {
    loadSound();
    
    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay' && !hasStartedRef.current) {
        hasStartedRef.current = true;
        startPlayback();
      }
    });

    const endSubscription = player.addListener('playingChange', (isPlaying) => {
      if (!isPlaying && hasStartedRef.current && player.currentTime > 0) {
        handleVideoEnd();
      }
    });

    return () => {
      subscription.remove();
      endSubscription.remove();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [player]);

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

  const startPlayback = async () => {
    setIsPlaying(true);
    
    player.play();
    
    setTimeout(async () => {
      try {
        if (soundRef.current) {
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
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
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
    width: width,
    height: height,
  },
});
