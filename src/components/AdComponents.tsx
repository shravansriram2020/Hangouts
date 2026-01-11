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
    alignItems: 'center',
    marginBottom: 20,
  },
  sponsoredLabel: {
    fontSize: 9,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  adBox: {
    width: 300,
    height: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  adBannerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  adBanner: {
    width: SCREEN_WIDTH - 32,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  adPlaceholderText: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    marginTop: 8,
  },
});
