import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

const BRAND_COLORS = {
  red: '#D54848',
  yellow: '#FFE14D',
  cyan: '#24B1C5',
};

interface LoadingDotsProps {
  size?: number;
  showText?: boolean;
}

export default function LoadingDots({ size = 60, showText = false }: LoadingDotsProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  const dotSize = size * 0.55;

  useEffect(() => {
    const createBounce = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -size * 0.25,
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

    const textPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 150);
    const anim3 = createBounce(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();
    textPulse.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      textPulse.stop();
    };
  }, [size]);

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: BRAND_COLORS.red,
              transform: [{ translateY: dot1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: BRAND_COLORS.yellow,
              transform: [{ translateY: dot2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: BRAND_COLORS.cyan,
              transform: [{ translateY: dot3 }],
            },
          ]}
        />
      </View>
      {showText && (
        <Animated.Text style={[styles.loadingText, { opacity: textOpacity }]}>
          Loading Hangout
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
});
