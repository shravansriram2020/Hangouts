import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  noPadding?: boolean;
}

export default function GlassCard({ children, style, intensity = 80, noPadding = false }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webGlass, noPadding ? null : styles.padding, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint="light"
      style={[styles.container, noPadding ? null : styles.padding, style]}
    >
      <View style={styles.overlay}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  padding: {
    padding: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.glassOverlay,
  },
  webGlass: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  } as any,
});
