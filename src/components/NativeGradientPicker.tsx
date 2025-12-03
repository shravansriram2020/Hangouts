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
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', 
  '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#A855F7',
  '#1E3A5F', '#2D5A8B', '#059669', '#D97706', '#BE185D',
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
  const [hexInput, setHexInput] = useState('');

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
    setHexInput(field === 1 ? (color1 || '') : (color2 || ''));
    setActiveColorPicker(field);
  };

  const handleQuickColorSelect = (hex: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHexInput(hex);
  };

  const handleColorConfirm = () => {
    const validHex = hexInput.match(/^#[0-9A-Fa-f]{6}$/) ? hexInput : '';
    if (activeColorPicker === 1) {
      setColor1(validHex);
    } else if (activeColorPicker === 2) {
      setColor2(validHex);
    }
    setActiveColorPicker(null);
    setHexInput('');
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
        transparent
        onRequestClose={() => setActiveColorPicker(null)}
      >
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerModal}>
            <View style={styles.colorPickerHeader}>
              <TouchableOpacity onPress={() => setActiveColorPicker(null)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.colorPickerTitle}>Select Color {activeColorPicker}</Text>
              <TouchableOpacity onPress={handleColorConfirm} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colorPickerContent}>
              {hexInput ? (
                <View style={[styles.colorPreviewBox, { backgroundColor: hexInput }]} />
              ) : (
                <View style={[styles.colorPreviewBox, styles.colorPreviewEmpty]}>
                  <Text style={styles.colorPreviewEmptyText}>Select a color</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Hex Color Code</Text>
              <TextInput
                style={styles.hexInput}
                value={hexInput}
                onChangeText={(text) => {
                  let formatted = text.toUpperCase();
                  if (!formatted.startsWith('#')) {
                    formatted = '#' + formatted;
                  }
                  if (formatted.length <= 7) {
                    setHexInput(formatted);
                  }
                }}
                placeholder="#000000"
                placeholderTextColor={Colors.gray}
                autoCapitalize="characters"
                maxLength={7}
              />

              <Text style={styles.quickColorsLabel}>Quick Colors</Text>
              <View style={styles.quickColorsGrid}>
                {QUICK_COLORS.map((hex) => (
                  <TouchableOpacity
                    key={hex}
                    style={[
                      styles.quickColorButton,
                      { backgroundColor: hex },
                      hexInput === hex && styles.quickColorSelected
                    ]}
                    onPress={() => handleQuickColorSelect(hex)}
                  >
                    {hexInput === hex && (
                      <Ionicons 
                        name="checkmark" 
                        size={18} 
                        color={hex === '#FFFFFF' || hex === '#F59E0B' ? '#000000' : '#FFFFFF'} 
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  colorPickerModal: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  colorPickerContent: {
    padding: 20,
  },
  colorPreviewBox: {
    height: 80,
    borderRadius: 12,
    marginBottom: 20,
  },
  colorPreviewEmpty: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPreviewEmptyText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginBottom: 8,
  },
  hexInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginBottom: 20,
  },
  quickColorsLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 12,
  },
  quickColorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickColorButton: {
    width: (SCREEN_WIDTH - 40 - 40) / 5,
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickColorSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
});
