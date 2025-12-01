import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ColorPicker from 'react-native-wheel-color-picker';
import { Colors, Fonts } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColor1, setCustomColor1] = useState(selectedColor1 || '#D4EDFC');
  const [customColor2, setCustomColor2] = useState(selectedColor2 || '#A8D8F0');
  const [activeColorPicker, setActiveColorPicker] = useState<1 | 2>(1);

  const handleSelect = (preset: GradientPreset) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(preset.color1, preset.color2);
    onClose();
  };

  const handleCustomSelect = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(customColor1, customColor2);
    setShowCustomPicker(false);
    onClose();
  };

  const isSelected = (preset: GradientPreset) => {
    return selectedColor1 === preset.color1 && selectedColor2 === preset.color2;
  };

  const isCustomSelected = () => {
    return !GRADIENT_PRESETS.some(p => p.color1 === selectedColor1 && p.color2 === selectedColor2);
  };

  const handleColorChange = (color: string) => {
    if (activeColorPicker === 1) {
      setCustomColor1(color);
    } else {
      setCustomColor2(color);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible && !showCustomPicker} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
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

              <TouchableOpacity
                style={styles.gradientOption}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setCustomColor1(selectedColor1 || '#D4EDFC');
                  setCustomColor2(selectedColor2 || '#A8D8F0');
                  setShowCustomPicker(true);
                }}
              >
                <View style={[styles.customPreview, isCustomSelected() && styles.gradientSelected]}>
                  <LinearGradient
                    colors={[selectedColor1 || '#D4EDFC', selectedColor2 || '#A8D8F0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.customGradientInner}
                  >
                    <Ionicons name="color-palette" size={28} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={[styles.gradientName, isCustomSelected() && styles.gradientNameSelected]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCustomPicker} transparent animationType="slide" onRequestClose={() => setShowCustomPicker(false)}>
        <View style={styles.customPickerOverlay}>
          <View style={styles.customPickerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowCustomPicker(false)} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={Colors.secondary} />
              </TouchableOpacity>
              <Text style={styles.title}>Custom Gradient</Text>
              <TouchableOpacity onPress={handleCustomSelect} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={[customColor1, customColor2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientPreviewLarge}
            >
              <Text style={styles.previewText}>Preview</Text>
            </LinearGradient>

            <View style={styles.colorSelectorsRow}>
              <TouchableOpacity 
                style={[styles.colorSelectorButton, activeColorPicker === 1 && styles.colorSelectorActive]}
                onPress={() => setActiveColorPicker(1)}
              >
                <View style={[styles.colorSwatch, { backgroundColor: customColor1 }]} />
                <Text style={[styles.colorSelectorLabel, activeColorPicker === 1 && styles.colorSelectorLabelActive]}>
                  Top Color
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.colorSelectorButton, activeColorPicker === 2 && styles.colorSelectorActive]}
                onPress={() => setActiveColorPicker(2)}
              >
                <View style={[styles.colorSwatch, { backgroundColor: customColor2 }]} />
                <Text style={[styles.colorSelectorLabel, activeColorPicker === 2 && styles.colorSelectorLabelActive]}>
                  Bottom Color
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colorPickerWrapper}>
              <ColorPicker
                color={activeColorPicker === 1 ? customColor1 : customColor2}
                onColorChangeComplete={handleColorChange}
                thumbSize={30}
                sliderSize={30}
                noSnap={true}
                row={false}
                swatches={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  doneButton: {
    padding: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
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
  customPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.grayLight,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  customGradientInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPickerOverlay: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  customPickerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  gradientPreviewLarge: {
    height: 120,
    marginHorizontal: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewText: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  colorSelectorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  colorSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.grayLight,
    gap: 10,
  },
  colorSelectorActive: {
    backgroundColor: Colors.secondary,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  colorSelectorLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  colorSelectorLabelActive: {
    color: Colors.white,
  },
  colorPickerWrapper: {
    flex: 1,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
});
