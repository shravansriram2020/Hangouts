import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoadingDotsProps {
  size?: number;
}

export default function LoadingDots({ size = 12 }: LoadingDotsProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounceAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -10,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createBounceAnimation(dot1, 0);
    const animation2 = createBounceAnimation(dot2, 150);
    const animation3 = createBounceAnimation(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.dot, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: '#D54848',
            transform: [{ translateY: dot1 }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: '#FFE14D',
            transform: [{ translateY: dot2 }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: '#24B1C5',
            transform: [{ translateY: dot3 }] 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
