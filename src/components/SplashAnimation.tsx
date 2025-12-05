import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

export default function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasEndedRef = useRef(false);
  const soundPlayedRef = useRef(false);

  const videoSource = require('../../assets/splash/splash-video.mp4');

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.muted = true;
    player.play();
  });

  const handleVideoEnd = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onAnimationComplete();
    });
  }, [fadeAnim, onAnimationComplete]);

  useEffect(() => {
    const loadAndPlaySound = async () => {
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

    loadAndPlaySound();

    const soundTimeout = setTimeout(async () => {
      if (soundRef.current && !soundPlayedRef.current) {
        soundPlayedRef.current = true;
        try {
          await soundRef.current.playAsync();
        } catch (error) {
          console.log('Error playing sound:', error);
        }
      }
    }, 1000);

    const fallbackTimeout = setTimeout(() => {
      handleVideoEnd();
    }, 4000);

    return () => {
      clearTimeout(soundTimeout);
      clearTimeout(fallbackTimeout);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [handleVideoEnd]);

  useEffect(() => {
    const subscription = player.addListener('playingChange', (playing) => {
      if (!playing && player.currentTime > 0.5) {
        handleVideoEnd();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player, handleVideoEnd]);

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
