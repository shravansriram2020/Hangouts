import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';

export interface GradientPreset {
  name: string;
  color1: string;
  color2: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: 'Default', color1: '#D4EDFC', color2: '#A8D8F0' },
  { name: 'Blue', color1: '#1E3A5F', color2: '#2D5A8B' },
  { name: 'Purple', color1: '#6B46C1', color2: '#9333EA' },
  { name: 'Green', color1: '#059669', color2: '#10B981' },
  { name: 'Orange', color1: '#D97706', color2: '#F97316' },
  { name: 'Pink', color1: '#EC4899', color2: '#F472B6' },
  { name: 'Sunset', color1: '#F59E0B', color2: '#EF4444' },
  { name: 'Ocean', color1: '#0EA5E9', color2: '#6366F1' },
  { name: 'Forest', color1: '#10B981', color2: '#064E3B' },
  { name: 'Berry', color1: '#BE185D', color2: '#7C3AED' },
  { name: 'Slate', color1: '#475569', color2: '#1E293B' },
  { name: 'Coral', color1: '#FB7185', color2: '#F472B6' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (color1: string, color2: string) => void;
  selectedColor1?: string;
  selectedColor2?: string;
  title?: string;
}

export default function NativeGradientPicker({
  visible,
  onClose,
  onSelect,
  selectedColor1,
  selectedColor2,
  title = 'Choose Background',
}: Props) {
  const handleSelect = (preset: GradientPreset) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(preset.color1, preset.color2);
    onClose();
  };

  const isSelected = (preset: GradientPreset) => {
    return selectedColor1 === preset.color1 && selectedColor2 === preset.color2;
  };

  if (Platform.OS === 'ios') {
    const showIOSActionSheet = () => {
      const options = [...GRADIENT_PRESETS.map(p => p.name), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title,
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const preset = GRADIENT_PRESETS[buttonIndex];
            handleSelect(preset);
          } else {
            onClose();
          }
        }
      );
    };

    if (visible) {
      showIOSActionSheet();
    }

    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          >
            {GRADIENT_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.gradientOption}
                onPress={() => handleSelect(preset)}
              >
                <LinearGradient
                  colors={[preset.color1, preset.color2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.gradientPreview,
                    isSelected(preset) && styles.gradientSelected,
                  ]}
                >
                  {isSelected(preset) && (
                    <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                  )}
                </LinearGradient>
                <Text style={[
                  styles.gradientName,
                  isSelected(preset) && styles.gradientNameSelected,
                ]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  gradientOption: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradientPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientName: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    textAlign: 'center',
  },
  gradientNameSelected: {
    color: Colors.secondary,
    fontFamily: Fonts.semiBold,
  },
});
