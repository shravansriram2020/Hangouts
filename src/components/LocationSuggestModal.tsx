import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
  category?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationSuggestion) => void;
  eventTitle: string;
  currentLocation: { lat: number; lng: number } | null;
  locationEnabled: boolean;
}

export default function LocationSuggestModal({
  visible,
  onClose,
  onSelectLocation,
  eventTitle,
  currentLocation,
  locationEnabled,
}: Props) {
  const [radius, setRadius] = useState(5);
  const [suggestion, setSuggestion] = useState<LocationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<LocationSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
      
      if (locationEnabled && currentLocation) {
        fetchSuggestion();
      }
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      setSuggestion(null);
      setAllSuggestions([]);
      setCurrentIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && locationEnabled && currentLocation) {
      fetchSuggestion();
    }
  }, [radius]);

  const fetchSuggestion = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        title: eventTitle || '',
        lat: currentLocation.lat.toString(),
        lng: currentLocation.lng.toString(),
        radius: radius.toString(),
      });

      const results = await api.get(`/location/suggest?${params}`);
      
      if (results && results.length > 0) {
        setAllSuggestions(results);
        setCurrentIndex(0);
        setSuggestion(results[0]);
      } else {
        setSuggestion(null);
        setAllSuggestions([]);
      }
    } catch (error) {
      console.error('Location suggestion failed:', error);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (allSuggestions.length > 1) {
      const nextIndex = (currentIndex + 1) % allSuggestions.length;
      setCurrentIndex(nextIndex);
      setSuggestion(allSuggestions[nextIndex]);
    } else {
      fetchSuggestion();
    }
  };

  const handleUseLocation = () => {
    if (suggestion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelectLocation(suggestion);
      handleClose();
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} mi away`;
  };

  const getCategoryIcon = (category?: string): string => {
    if (!category) return 'location';
    const cat = category.toLowerCase();
    if (cat.includes('cinema') || cat.includes('movie') || cat.includes('theater')) return 'film';
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return 'restaurant';
    if (cat.includes('bar') || cat.includes('pub') || cat.includes('nightlife')) return 'beer';
    if (cat.includes('park') || cat.includes('garden')) return 'leaf';
    if (cat.includes('museum') || cat.includes('gallery')) return 'image';
    if (cat.includes('gym') || cat.includes('fitness') || cat.includes('sport')) return 'fitness';
    if (cat.includes('shop') || cat.includes('mall') || cat.includes('store')) return 'cart';
    if (cat.includes('cafe') || cat.includes('coffee')) return 'cafe';
    if (cat.includes('hotel') || cat.includes('lodging')) return 'bed';
    if (cat.includes('beach')) return 'umbrella';
    if (cat.includes('bowling')) return 'bowling-ball';
    if (cat.includes('amusement') || cat.includes('theme park')) return 'happy';
    return 'location';
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <View style={styles.handle} />

          <Text style={styles.title}>Suggest a Location</Text>
          <Text style={styles.subtitle}>
            {eventTitle 
              ? `Finding places for "${eventTitle}"`
              : 'Finding fun places nearby'}
          </Text>

          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Search Radius</Text>
              <Text style={styles.sliderValue}>{radius} miles</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={25}
              step={1}
              value={radius}
              onValueChange={(value: number) => {
                setRadius(value);
                Haptics.selectionAsync();
              }}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.grayLight}
              thumbTintColor={Colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderMinMax}>1 mi</Text>
              <Text style={styles.sliderMinMax}>25 mi</Text>
            </View>
          </View>

          <View style={styles.suggestionSection}>
            {!locationEnabled ? (
              <View style={styles.disabledState}>
                <Ionicons name="location-outline" size={48} color={Colors.grayMedium} />
                <Text style={styles.disabledText}>Location access is required</Text>
                <Text style={styles.disabledSubtext}>
                  Enable location services to get suggestions
                </Text>
              </View>
            ) : loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding the perfect spot...</Text>
              </View>
            ) : suggestion ? (
              <View style={styles.suggestionCard}>
                <View style={styles.suggestionIconContainer}>
                  <Ionicons
                    name={getCategoryIcon(suggestion.category) as any}
                    size={32}
                    color={Colors.white}
                  />
                </View>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName} numberOfLines={2}>
                    {suggestion.name}
                  </Text>
                  <Text style={styles.suggestionAddress} numberOfLines={2}>
                    {suggestion.address}
                  </Text>
                  {suggestion.distance && (
                    <Text style={styles.suggestionDistance}>
                      {formatDistance(suggestion.distance)}
                    </Text>
                  )}
                  {suggestion.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>
                        {suggestion.category.split(' > ').pop() || suggestion.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noResultState}>
                <Ionicons name="search-outline" size={48} color={Colors.grayMedium} />
                <Text style={styles.noResultText}>No places found</Text>
                <Text style={styles.noResultSubtext}>
                  Try increasing the search radius
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.suggestAgainButton,
                (!locationEnabled || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSuggestAgain}
              disabled={!locationEnabled || loading}
            >
              <Ionicons name="refresh" size={20} color={Colors.secondary} />
              <Text style={styles.suggestAgainText}>Suggest Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.useLocationButton,
                (!suggestion || loading) && styles.buttonDisabled,
              ]}
              onPress={handleUseLocation}
              disabled={!suggestion || loading}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.useLocationText}>Use This Location</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.grayMedium,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  sliderSection: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  sliderValue: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderMinMax: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
  },
  suggestionSection: {
    minHeight: 160,
    marginBottom: 24,
  },
  disabledState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  disabledText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginTop: 12,
  },
  disabledSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 4,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  suggestionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginBottom: 6,
  },
  suggestionDistance: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.primary,
    marginBottom: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  noResultState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noResultText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginTop: 12,
  },
  noResultSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  suggestAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  suggestAgainText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  useLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  useLocationText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
});
