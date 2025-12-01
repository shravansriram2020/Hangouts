import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  SafeAreaView,
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

const QUICK_COLORS = [
  '#000000', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#F97316', '#EC4899', '#A855F7', '#6366F1', '#8B5CF6',
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
  title = 'Custom Background Gradient',
}: Props) {
  const [color1, setColor1] = useState(selectedColor1 || '');
  const [color2, setColor2] = useState(selectedColor2 || '');
  const [activeColorPicker, setActiveColorPicker] = useState<1 | 2 | null>(null);
  const [tempColor, setTempColor] = useState('#3B82F6');

  useEffect(() => {
    if (visible) {
      setColor1(selectedColor1 || '');
      setColor2(selectedColor2 || '');
    }
  }, [visible, selectedColor1, selectedColor2]);

  const handleColorFieldPress = (field: 1 | 2) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTempColor(field === 1 ? (color1 || '#3B82F6') : (color2 || '#3B82F6'));
    setActiveColorPicker(field);
  };

  const handleColorConfirm = () => {
    if (activeColorPicker === 1) {
      setColor1(tempColor);
    } else if (activeColorPicker === 2) {
      setColor2(tempColor);
    }
    setActiveColorPicker(null);
  };

  const handleQuickColorSelect = (selectedColor: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTempColor(selectedColor);
  };

  const handleApply = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (color1 && color2) {
      onSelect(color1, color2);
    } else {
      onSelect('#D4EDFC', '#A8D8F0');
    }
    onClose();
  };

  const handlePresetSelect = (preset: GradientPreset) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setColor1(preset.color1);
    setColor2(preset.color2);
  };

  const handleClear = () => {
    setColor1('');
    setColor2('');
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible && activeColorPicker === null} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {(color1 && color2) && (
                <LinearGradient
                  colors={[color1, color2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.previewGradient}
                >
                  <Text style={styles.previewText}>Preview</Text>
                </LinearGradient>
              )}

              <View style={styles.colorFieldsContainer}>
                <View style={styles.colorFieldWrapper}>
                  <Text style={styles.colorFieldLabel}>Color 1</Text>
                  <TouchableOpacity 
                    style={[
                      styles.colorField, 
                      color1 ? { backgroundColor: color1 } : styles.colorFieldEmpty
                    ]}
                    onPress={() => handleColorFieldPress(1)}
                  >
                    {!color1 && (
                      <Ionicons name="add" size={24} color={Colors.gray} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.colorFieldWrapper}>
                  <Text style={styles.colorFieldLabel}>Color 2</Text>
                  <TouchableOpacity 
                    style={[
                      styles.colorField, 
                      color2 ? { backgroundColor: color2 } : styles.colorFieldEmpty
                    ]}
                    onPress={() => handleColorFieldPress(2)}
                  >
                    {!color2 && (
                      <Ionicons name="add" size={24} color={Colors.gray} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.hintText}>
                Leave empty to use the default gradient. Both colors must be selected to apply custom gradient.
              </Text>

              {(color1 || color2) && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                  <Text style={styles.clearButtonText}>Clear Colors</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionTitle}>Preset Gradients</Text>
              <View style={styles.presetsGrid}>
                {GRADIENT_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={styles.presetItem}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <LinearGradient
                      colors={[preset.color1, preset.color2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.presetGradient,
                        (color1 === preset.color1 && color2 === preset.color2) && styles.presetSelected
                      ]}
                    >
                      {(color1 === preset.color1 && color2 === preset.color2) && (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      )}
                    </LinearGradient>
                    <Text style={styles.presetName}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal 
        visible={activeColorPicker !== null} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveColorPicker(null)}
      >
        <SafeAreaView style={styles.colorPickerModal}>
          <View style={styles.colorPickerHeader}>
            <TouchableOpacity onPress={() => setActiveColorPicker(null)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.colorPickerTitle}>Colors</Text>
            <TouchableOpacity onPress={handleColorConfirm} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectedColorPreview}>
            <View style={[styles.selectedColorBox, { backgroundColor: tempColor }]} />
            <Text style={styles.selectedColorHex}>{tempColor.toUpperCase()}</Text>
          </View>

          <View style={styles.colorPickerContainer}>
            <ColorPicker
              color={tempColor}
              onColorChangeComplete={setTempColor}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
              swatches={false}
            />
          </View>

          <View style={styles.quickColorsSection}>
            <Text style={styles.quickColorsLabel}>Quick Colors</Text>
            <View style={styles.quickColorsRow}>
              {QUICK_COLORS.map((qc) => (
                <TouchableOpacity
                  key={qc}
                  style={[
                    styles.quickColorButton,
                    { backgroundColor: qc },
                    tempColor.toLowerCase() === qc.toLowerCase() && styles.quickColorSelected
                  ]}
                  onPress={() => handleQuickColorSelect(qc)}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
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
    backgroundColor: '#F5F5F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  closeButton: {
    padding: 4,
  },
  applyButton: {
    padding: 4,
  },
  applyButtonText: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: '#007AFF',
  },
  content: {
    padding: 20,
  },
  previewGradient: {
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  colorFieldsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  colorFieldWrapper: {
    flex: 1,
  },
  colorFieldLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginBottom: 8,
  },
  colorField: {
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorFieldEmpty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  hintText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  clearButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  clearButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#FF3B30',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 40,
  },
  presetItem: {
    width: (SCREEN_WIDTH - 40 - 36) / 4,
    alignItems: 'center',
  },
  presetGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  presetSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  presetName: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    marginTop: 6,
    textAlign: 'center',
  },
  colorPickerModal: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  colorPickerTitle: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  cancelButton: {
    padding: 4,
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: Fonts.regular,
    color: '#007AFF',
  },
  doneButton: {
    padding: 4,
  },
  doneButtonText: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: '#007AFF',
  },
  selectedColorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  selectedColorBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedColorHex: {
    fontSize: 17,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  colorPickerContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    height: 300,
  },
  quickColorsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  quickColorsLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    marginBottom: 12,
  },
  quickColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickColorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickColorSelected: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
});
