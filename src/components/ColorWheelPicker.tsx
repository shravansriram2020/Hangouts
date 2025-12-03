import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  PanResponder,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = SCREEN_WIDTH - 80;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

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

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getColorFromPosition(x: number, y: number, centerX: number, centerY: number): string {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const maxDistance = WHEEL_RADIUS - 10;
  
  const saturation = Math.min(distance / maxDistance, 1);
  let hue = Math.atan2(dy, dx) * (180 / Math.PI);
  if (hue < 0) hue += 360;
  
  return hsvToHex(hue, saturation, 1);
}

export default function ColorWheelPicker({
  visible,
  onClose,
  onSelect,
  selectedColor1,
  selectedColor2,
  title = 'Custom Background Gradient',
}: Props) {
  const [color1, setColor1] = useState(selectedColor1 || '');
  const [color2, setColor2] = useState(selectedColor2 || '');
  const [activeColor, setActiveColor] = useState<1 | 2>(1);
  const [showWheel, setShowWheel] = useState(false);
  const wheelRef = useRef<View>(null);
  const [wheelLayout, setWheelLayout] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (visible) {
      setColor1(selectedColor1 || '');
      setColor2(selectedColor2 || '');
    }
  }, [visible, selectedColor1, selectedColor2]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleColorSelection(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        handleColorSelection(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  const handleColorSelection = (x: number, y: number) => {
    const centerX = WHEEL_RADIUS;
    const centerY = WHEEL_RADIUS;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= WHEEL_RADIUS) {
      const hex = getColorFromPosition(x, y, centerX, centerY);
      if (activeColor === 1) {
        setColor1(hex);
      } else {
        setColor2(hex);
      }
    }
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (color1 && color2) {
      onSelect(color1, color2);
    } else {
      onSelect('#D4EDFC', '#A8D8F0');
    }
    onClose();
  };

  const handlePresetSelect = (preset: GradientPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColor1(preset.color1);
    setColor2(preset.color2);
  };

  const handleClear = () => {
    setColor1('');
    setColor2('');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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

          <View style={styles.content}>
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

            <View style={styles.colorSelectors}>
              <TouchableOpacity
                style={[
                  styles.colorSelector,
                  activeColor === 1 && styles.colorSelectorActive,
                  color1 ? { backgroundColor: color1 } : styles.colorSelectorEmpty
                ]}
                onPress={() => setActiveColor(1)}
              >
                {!color1 ? (
                  <View style={styles.colorSelectorContent}>
                    <Ionicons name="add" size={20} color={Colors.gray} />
                    <Text style={styles.colorSelectorLabel}>Color 1</Text>
                  </View>
                ) : (
                  <Text style={[styles.colorSelectorLabel, { color: isLightColor(color1) ? '#000' : '#FFF' }]}>
                    Color 1
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.colorSelector,
                  activeColor === 2 && styles.colorSelectorActive,
                  color2 ? { backgroundColor: color2 } : styles.colorSelectorEmpty
                ]}
                onPress={() => setActiveColor(2)}
              >
                {!color2 ? (
                  <View style={styles.colorSelectorContent}>
                    <Ionicons name="add" size={20} color={Colors.gray} />
                    <Text style={styles.colorSelectorLabel}>Color 2</Text>
                  </View>
                ) : (
                  <Text style={[styles.colorSelectorLabel, { color: isLightColor(color2) ? '#000' : '#FFF' }]}>
                    Color 2
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.wheelContainer}>
              <View
                ref={wheelRef}
                style={styles.colorWheel}
                {...panResponder.panHandlers}
              >
                <View style={styles.wheelGradient}>
                  {Array.from({ length: 360 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.wheelSlice,
                        {
                          transform: [{ rotate: `${i}deg` }],
                          backgroundColor: hsvToHex(i, 1, 1),
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.wheelCenter} />
              </View>
              <Text style={styles.wheelHint}>Drag on the wheel to pick a color for Color {activeColor}</Text>
            </View>

            {(color1 || color2) && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear Colors</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.presetsTitle}>Quick Presets</Text>
            <View style={styles.presetsGrid}>
              {GRADIENT_PRESETS.slice(0, 8).map((preset) => (
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
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
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
    maxHeight: '90%',
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
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  colorSelectors: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  colorSelector: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorSelectorActive: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  colorSelectorEmpty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  colorSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorSelectorLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  colorWheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  wheelGradient: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    position: 'absolute',
  },
  wheelSlice: {
    position: 'absolute',
    width: 2,
    height: WHEEL_RADIUS,
    left: WHEEL_RADIUS - 1,
    top: 0,
    transformOrigin: 'bottom center',
  },
  wheelCenter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wheelHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 10,
    textAlign: 'center',
  },
  clearButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#FF3B30',
  },
  presetsTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  presetItem: {
    width: (SCREEN_WIDTH - 40 - 30) / 4,
  },
  presetGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  presetSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
