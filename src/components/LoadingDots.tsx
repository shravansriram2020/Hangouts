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
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  const barWidth = size * 0.35;
  const barMaxHeight = size * 1.5;

  useEffect(() => {
    const createStretch = (animatedValue: Animated.Value, delay: number, minScale: number, maxScale: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: maxScale,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: minScale,
            duration: 350,
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

    const anim1 = createStretch(bar1, 0, 0.3, 1);
    const anim2 = createStretch(bar2, 120, 0.4, 1);
    const anim3 = createStretch(bar3, 240, 0.35, 1);

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
      <View style={[styles.barsContainer, { height: barMaxHeight }]}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              height: barMaxHeight,
              borderRadius: barWidth / 2,
              backgroundColor: BRAND_COLORS.red,
              transform: [{ scaleY: bar1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              height: barMaxHeight,
              borderRadius: barWidth / 2,
              backgroundColor: BRAND_COLORS.yellow,
              transform: [{ scaleY: bar2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              height: barMaxHeight,
              borderRadius: barWidth / 2,
              backgroundColor: BRAND_COLORS.cyan,
              transform: [{ scaleY: bar3 }],
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
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bar: {
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
