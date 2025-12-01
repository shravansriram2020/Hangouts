import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export interface GradientOption {
  name: string;
  color1: string;
  color2: string;
}

const GRADIENT_PRESETS: GradientOption[] = [
  { name: 'Blue', color1: '#1E3A5F', color2: '#2D5A8B' },
  { name: 'Purple', color1: '#6B46C1', color2: '#9333EA' },
  { name: 'Green', color1: '#059669', color2: '#10B981' },
  { name: 'Orange', color1: '#D97706', color2: '#F97316' },
  { name: 'Pink', color1: '#EC4899', color2: '#F472B6' },
];

interface Props {
  onSelect: (color1: string, color2: string) => void;
  selectedColor1?: string;
  selectedColor2?: string;
}

export default function GradientPicker({ onSelect, selectedColor1, selectedColor2 }: Props) {
  return (
    <View style={styles.container}>
      {GRADIENT_PRESETS.map((preset) => (
        <TouchableOpacity
          key={preset.name}
          style={styles.gradientButton}
          onPress={() => onSelect(preset.color1, preset.color2)}
        >
          <LinearGradient
            colors={[preset.color1, preset.color2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientPreview}
          >
            {selectedColor1 === preset.color1 && selectedColor2 === preset.color2 && (
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  gradientButton: {
    width: '30%',
  },
  gradientPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
