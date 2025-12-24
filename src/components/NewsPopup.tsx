import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface NewsItem {
  id: string;
  title?: string;
  caption: string;
  image_url?: string;
  published_at: string;
}

interface Props {
  visible: boolean;
  news: NewsItem | null;
  onDismiss: (newsId: string) => void;
}

export default function NewsPopup({ visible, news, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      translateYAnim.setValue(50);
    }
  }, [visible]);

  const handleDismiss = () => {
    if (news) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onDismiss(news.id);
    }
  };

  if (!news) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDismiss}
        />
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: translateYAnim },
              ],
            },
          ]}
        >
          <BlurView intensity={80} tint="light" style={styles.blurContainer}>
            <View style={styles.content}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>

              {news.image_url && (
                <Image
                  source={{ uri: news.image_url }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
              )}

              {news.title && (
                <Text style={styles.title}>{news.title}</Text>
              )}

              <Text style={styles.caption}>{news.caption}</Text>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
              >
                <Text style={styles.dismissButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width - 48,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 24,
  },
  content: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  caption: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  dismissButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
