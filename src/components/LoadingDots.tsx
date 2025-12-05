import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(0.8)).current;
  const pulse2 = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(0.4)).current;
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const createPulseAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.4,
            duration: 600,
            easing: Easing.in(Easing.ease),
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

    spinAnimation.start();
    createPulseAnimation(pulse1, 0).start();
    createPulseAnimation(pulse2, 200).start();
    createPulseAnimation(pulse3, 400).start();
    textPulse.start();

    return () => {
      spinAnimation.stop();
    };
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const arcSize = size;
  const strokeWidth = size * 0.12;

  return (
    <View style={styles.container}>
      <View style={[styles.loaderContainer, { width: arcSize, height: arcSize }]}>
        <Animated.View
          style={[
            styles.arc,
            {
              width: arcSize,
              height: arcSize,
              borderWidth: strokeWidth,
              borderRadius: arcSize / 2,
              borderTopColor: BRAND_COLORS.red,
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: spin }],
              opacity: pulse1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.arc,
            styles.arcMiddle,
            {
              width: arcSize * 0.75,
              height: arcSize * 0.75,
              borderWidth: strokeWidth * 0.9,
              borderRadius: (arcSize * 0.75) / 2,
              borderTopColor: 'transparent',
              borderRightColor: BRAND_COLORS.yellow,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: spin }, { scaleX: -1 }],
              opacity: pulse2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.arc,
            styles.arcInner,
            {
              width: arcSize * 0.5,
              height: arcSize * 0.5,
              borderWidth: strokeWidth * 0.8,
              borderRadius: (arcSize * 0.5) / 2,
              borderTopColor: BRAND_COLORS.cyan,
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: spin }],
              opacity: pulse3,
            },
          ]}
        />
        <View style={styles.centerDot}>
          <View style={[styles.dot, { backgroundColor: BRAND_COLORS.red }]} />
          <View style={[styles.dot, { backgroundColor: BRAND_COLORS.yellow }]} />
          <View style={[styles.dot, { backgroundColor: BRAND_COLORS.cyan }]} />
        </View>
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
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    position: 'absolute',
  },
  arcMiddle: {
    position: 'absolute',
  },
  arcInner: {
    position: 'absolute',
  },
  centerDot: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
});
