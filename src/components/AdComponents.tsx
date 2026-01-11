import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdBoxProps {
  unitId?: string;
}

interface AdBannerProps {
  unitId?: string;
}

export function AdBox({ unitId }: AdBoxProps) {
  return (
    <View style={styles.adBoxContainer}>
      <Text style={styles.sponsoredLabel}>SPONSORED</Text>
      <View style={styles.adBox}>
        <Ionicons name="megaphone-outline" size={32} color={Colors.grayMedium} />
        <Text style={styles.adPlaceholderText}>Ad Space</Text>
      </View>
    </View>
  );
}

export function AdBanner({ unitId }: AdBannerProps) {
  return (
    <View style={styles.adBannerContainer}>
      <Text style={styles.sponsoredLabel}>SPONSORED</Text>
      <View style={styles.adBanner}>
        <Text style={styles.adPlaceholderText}>Ad Space</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adBoxContainer: {
    flex: 1,
    height: 180,
  },
  sponsoredLabel: {
    fontSize: 9,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  adBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  adBannerContainer: {
    alignItems: 'center',
  },
  adBanner: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  adPlaceholderText: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
  },
});
