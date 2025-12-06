import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const VIDEO_DURATION_MS = 3400;

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

export default function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasCompletedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const videoSource = require('../../assets/splash/splash-video.mp4');

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.muted = true;
  });

  const completeAnimation = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      onAnimationComplete();
    });
  };

  useEffect(() => {
    const setupAudio = async () => {
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
        console.log('Audio setup error:', error);
      }
    };

    setupAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay' && !isReady) {
        setIsReady(true);
        player.play();
        
        (async () => {
          try {
            if (soundRef.current) {
              await soundRef.current.setPositionAsync(0);
              await soundRef.current.playAsync();
            }
          } catch (error) {
            console.log('Sound play error:', error);
          }
        })();

        setTimeout(() => {
          completeAnimation();
        }, VIDEO_DURATION_MS);
      }
    });

    const fallbackTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        completeAnimation();
      }
    }, 6000);

    return () => {
      subscription.remove();
      clearTimeout(fallbackTimeout);
    };
  }, [player, isReady]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      </View>
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
  videoWrapper: {
    width: width * 0.75,
    height: height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
