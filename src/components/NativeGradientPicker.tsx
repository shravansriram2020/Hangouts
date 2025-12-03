import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';

let ColorPicker: any = null;
let Panel1: any = null;
let HueSlider: any = null;
let Preview: any = null;

if (Platform.OS !== 'web') {
  try {
    const colorPickerModule = require('reanimated-color-picker');
    ColorPicker = colorPickerModule.default;
    Panel1 = colorPickerModule.Panel1;
    HueSlider = colorPickerModule.HueSlider;
    Preview = colorPickerModule.Preview;
  } catch (e) {
    console.log('Color picker not available');
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  title = 'Custom Background Gradient',
}: Props) {
  const [color1, setColor1] = useState(selectedColor1 || '');
  const [color2, setColor2] = useState(selectedColor2 || '');
  const [activeColorPicker, setActiveColorPicker] = useState<1 | 2 | null>(null);
  const [tempColor, setTempColor] = useState('#1E3A5F');
  
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const colorPickerOverlayOpacity = useRef(new Animated.Value(0)).current;
  const colorPickerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setColor1(selectedColor1 || '');
      setColor2(selectedColor2 || '');
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, selectedColor1, selectedColor2]);

  useEffect(() => {
    if (activeColorPicker !== null) {
      Animated.parallel([
        Animated.timing(colorPickerOverlayOpacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.spring(colorPickerSlideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(colorPickerSlideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(colorPickerOverlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeColorPicker]);

  const handleColorFieldPress = (field: 1 | 2) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const currentColor = field === 1 ? color1 : color2;
    setTempColor(currentColor || '#1E3A5F');
    setActiveColorPicker(field);
  };

  const onColorChange = useCallback((color: { hex: string }) => {
    setTempColor(color.hex);
  }, []);

  const handleColorConfirm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeColorPicker === 1) {
      setColor1(tempColor);
    } else if (activeColorPicker === 2) {
      setColor2(tempColor);
    }
    setActiveColorPicker(null);
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

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleColorPickerClose = () => {
    Animated.parallel([
      Animated.timing(colorPickerSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(colorPickerOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveColorPicker(null);
    });
  };

  const isColorPickerAvailable = Platform.OS !== 'web' && ColorPicker && Panel1 && HueSlider;

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible && activeColorPicker === null} transparent animationType="none" onRequestClose={handleClose}>
        <View style={styles.modalRoot}>
          <Animated.View 
            style={[styles.overlay, { opacity: overlayOpacity }]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.modalContainer,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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
                    disabled={!isColorPickerAvailable}
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
                    disabled={!isColorPickerAvailable}
                  >
                    {!color2 && (
                      <Ionicons name="add" size={24} color={Colors.gray} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {!isColorPickerAvailable && (
                <Text style={styles.webNotice}>
                  Custom color selection requires a native device. Please use the preset gradients below.
                </Text>
              )}

              {isColorPickerAvailable && (
                <Text style={styles.hintText}>
                  Tap a color box to open the color wheel. Both colors must be selected to apply custom gradient.
                </Text>
              )}

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
          </Animated.View>
        </View>
      </Modal>

      {isColorPickerAvailable && (
        <Modal 
          visible={activeColorPicker !== null} 
          animationType="none" 
          transparent
          onRequestClose={handleColorPickerClose}
        >
          <View style={styles.modalRoot}>
            <Animated.View 
              style={[styles.overlay, { opacity: colorPickerOverlayOpacity }]}
            >
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleColorPickerClose} activeOpacity={1} />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.colorPickerModal,
                { transform: [{ translateY: colorPickerSlideAnim }] }
              ]}
            >
              <View style={styles.colorPickerHeader}>
                <TouchableOpacity onPress={handleColorPickerClose} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.colorPickerTitle}>Select Color {activeColorPicker}</Text>
                <TouchableOpacity onPress={handleColorConfirm} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.colorPickerContent}>
                {ColorPicker && Panel1 && HueSlider && Preview && (
                  <ColorPicker
                    value={tempColor}
                    onComplete={onColorChange}
                    style={styles.colorWheel}
                  >
                    <Preview style={styles.colorPreviewBox} />
                    <Panel1 style={styles.colorPanel} />
                    <HueSlider style={styles.hueSlider} />
                  </ColorPicker>
                )}
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorFieldEmpty: {
    backgroundColor: '#E5E5EA',
    borderStyle: 'dashed',
    borderColor: Colors.gray,
  },
  hintText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 16,
  },
  webNotice: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#FF9500',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
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
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 16,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSelected: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  presetName: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  colorPickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  colorPickerContent: {
    padding: 20,
    alignItems: 'center',
  },
  colorWheel: {
    width: SCREEN_WIDTH - 40,
    gap: 20,
  },
  colorPreviewBox: {
    height: 60,
    borderRadius: 12,
    marginBottom: 10,
  },
  colorPanel: {
    height: 200,
    borderRadius: 12,
  },
  hueSlider: {
    height: 40,
    borderRadius: 12,
  },
});
