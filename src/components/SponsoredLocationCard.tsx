import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

const NATIVE_AD_UNIT_ID = __DEV__ 
  ? 'ca-app-pub-3940256099942544/2247696110'
  : 'ca-app-pub-6700271097724179/1949458528';

interface LocationData {
  name: string;
  address: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface SponsoredLocationCardProps {
  onPress: (location: LocationData) => void;
  onDismiss: () => void;
}

export default function SponsoredLocationCard({ onPress, onDismiss }: SponsoredLocationCardProps) {
  const [adData, setAdData] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    loadNativeAd();
  }, []);

  const loadNativeAd = async () => {
    setIsLoading(true);
    try {
      if (isExpoGo) {
        setTimeout(() => {
          setAdData({
            name: 'Sponsored Location Preview',
            address: 'Real ads will appear in production builds',
            imageUrl: undefined,
          });
          setIsLoading(false);
        }, 1000);
        return;
      }
      
      setTimeout(() => {
        setAdData({
          name: 'Sponsored Location Preview',
          address: 'Real ads will appear in production builds',
          imageUrl: undefined,
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.log('Ad failed to load:', error);
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (adData) {
      onPress(adData);
    }
  };

  const handleDismiss = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsDismissed(true);
    onDismiss();
  };

  if (isDismissed || isLoading || !adData) {
    return null;
  }

  const CardContent = () => (
    <View style={styles.cardContent}>
      <View style={styles.headerRow}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Ionicons name="close" size={12} color={Colors.grayMedium} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.mainContent} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.imageContainer}>
          {adData.imageUrl ? (
            <Image source={{ uri: adData.imageUrl }} style={styles.locationImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="location" size={24} color={Colors.secondary} />
            </View>
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.locationName} numberOfLines={1}>{adData.name}</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>{adData.address}</Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webGlass}>
          <CardContent />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.overlay}>
          <CardContent />
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  overlay: {
    backgroundColor: Colors.glassOverlay,
  },
  webGlass: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sponsoredText: {
    fontSize: 9,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  dismissButton: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  locationImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  locationName: {
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
