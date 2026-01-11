import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { AdBox, AdBanner } from './AdComponents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ADMOB_BOX_ID = 'ca-app-pub-6700271097724179/7640768902';
const ADMOB_BANNER_ID = 'ca-app-pub-6700271097724179/1798427047';

interface SuggestedLocation {
  id: string;
  name: string;
  abbreviatedName: string;
  address: string;
  imageUrl?: string;
  lat: number;
  lng: number;
  category?: string;
  distance?: number;
  isUserHangout?: boolean;
  attendeeCount?: number;
}

interface SharedPhoto {
  id: string;
  imageUrl: string;
  username: string;
  locationName: string;
  locationAddress: string;
  lat: number;
  lng: number;
}

interface TrendingCategory {
  category: string;
  emoji: string;
  locations: SuggestedLocation[];
}

interface ExploreTabProps {
  onSelectLocation: (location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
}

export default function ExploreTab({ onSelectLocation }: ExploreTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [userHangouts, setUserHangouts] = useState<SuggestedLocation[]>([]);
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);

  useEffect(() => {
    requestLocationAndFetch();
  }, []);

  const requestLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to explore nearby places');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);
      setLocationError(null);
      await fetchExploreData(coords);
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Unable to get your location. Please enable location services.');
      setLoading(false);
    }
  };

  const fetchExploreData = async (coords: { lat: number; lng: number }) => {
    try {
      const params = new URLSearchParams({
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
      });

      const data = await api.get(`/explore/feed?${params}`);
      
      setSuggestedLocations(data.suggestedLocations || []);
      setUserHangouts(data.userHangouts || []);
      setSharedPhotos(data.sharedPhotos || []);
      setTrendingCategories(data.trendingCategories || []);
    } catch (error) {
      console.error('Failed to fetch explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchExploreData(userLocation);
    } else {
      await requestLocationAndFetch();
    }
    setRefreshing(false);
  }, [userLocation]);

  const handleLocationPress = (location: SuggestedLocation) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectLocation({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    });
  };

  const handleSharedPhotoPress = (photo: SharedPhoto) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectLocation({
      name: photo.locationName,
      address: photo.locationAddress,
      lat: photo.lat,
      lng: photo.lng,
    });
  };

  const formatDistance = (miles?: number): string => {
    if (!miles) return '';
    if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
    return `${Math.round(miles)} mi`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>Finding places near you...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={48} color={Colors.grayMedium} />
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorText}>{locationError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationAndFetch}>
          <Text style={styles.retryButtonText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const renderLocationCard = (location: SuggestedLocation, index: number, isHangout: boolean = false) => (
    <TouchableOpacity
      key={location.id || `loc-${index}`}
      style={styles.locationCard}
      onPress={() => handleLocationPress(location)}
      activeOpacity={0.8}
    >
      <View style={styles.locationIconContainer}>
        <Ionicons 
          name={isHangout ? "people" : "location"} 
          size={24} 
          color={Colors.secondary} 
        />
      </View>
      <View style={styles.locationInfo}>
        <Text style={styles.locationName} numberOfLines={1}>
          {location.abbreviatedName || location.name}
        </Text>
        {location.distance !== undefined && (
          <Text style={styles.locationDistance}>{formatDistance(location.distance)} away</Text>
        )}
        {isHangout && location.attendeeCount !== undefined && location.attendeeCount > 0 && (
          <Text style={styles.attendeeCount}>{location.attendeeCount} going</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.grayMedium} />
    </TouchableOpacity>
  );

  const renderPhotoCard = (photo: SharedPhoto, index: number) => (
    <TouchableOpacity
      key={photo.id || `photo-${index}`}
      style={styles.photoCard}
      onPress={() => handleSharedPhotoPress(photo)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: photo.imageUrl }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        <View style={styles.photoUserRow}>
          <Ionicons name="person-circle" size={16} color={Colors.white} />
          <Text style={styles.photoUsername}>{photo.username}</Text>
        </View>
        <Text style={styles.photoLocation} numberOfLines={1}>
          {photo.locationName.length > 20 ? photo.locationName.substring(0, 17) + '...' : photo.locationName}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (category: TrendingCategory, index: number) => (
    <View key={`cat-${category.category}-${index}`} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
        <Text style={styles.categoryTitle}>{category.category}</Text>
      </View>
      <View style={styles.categoryGrid}>
        {category.locations.slice(0, 4).map((location, locIndex) => (
          <TouchableOpacity
            key={location.id || `cat-loc-${locIndex}`}
            style={styles.categoryCard}
            onPress={() => handleLocationPress(location)}
            activeOpacity={0.8}
          >
            <View style={styles.categoryCardIcon}>
              <Ionicons name="location" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.categoryCardName} numberOfLines={2}>
              {location.abbreviatedName || location.name}
            </Text>
            {location.distance !== undefined && (
              <Text style={styles.categoryCardDistance}>{formatDistance(location.distance)}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const hasNoContent = suggestedLocations.length === 0 && userHangouts.length === 0 && trendingCategories.length === 0 && sharedPhotos.length === 0;

  if (hasNoContent && !loading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="compass-outline" size={48} color={Colors.secondary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Suggestions Available</Text>
          <Text style={styles.emptyStateText}>
            Location suggestions are temporarily unavailable. Create a hangout and enter your own location!
          </Text>
          <TouchableOpacity 
            style={styles.emptyStatePrimaryButton} 
            onPress={() => onSelectLocation({
              name: '',
              address: '',
              lat: userLocation?.lat || 0,
              lng: userLocation?.lng || 0,
            })}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.emptyStatePrimaryButtonText}>Create Hangout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyStateSecondaryButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color={Colors.secondary} />
            <Text style={styles.emptyStateSecondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <AdBox unitId={ADMOB_BOX_ID} />

      {userHangouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Where Others Are Hanging Out</Text>
          </View>
          {userHangouts.slice(0, 3).map((hangout, index) => 
            renderLocationCard(hangout, index, true)
          )}
        </View>
      )}

      {suggestedLocations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Suggested For You</Text>
          </View>
          {suggestedLocations.slice(0, 4).map((location, index) => 
            renderLocationCard(location, index)
          )}
        </View>
      )}

      <AdBanner unitId={ADMOB_BANNER_ID} />

      {sharedPhotos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>From the Community</Text>
          </View>
          <View style={styles.photosGrid}>
            {sharedPhotos.slice(0, 4).map((photo, index) => 
              renderPhotoCard(photo, index)
            )}
          </View>
        </View>
      )}

      {trendingCategories.map((category, index) => renderCategorySection(category, index))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStatePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 12,
  },
  emptyStatePrimaryButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginLeft: 8,
  },
  emptyStateSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyStateSecondaryButtonText: {
    fontSize: 13,
    fontFamily: 'Prompt-Medium',
    color: Colors.secondary,
    marginLeft: 6,
  },
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
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    marginLeft: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 15,
    fontFamily: 'Prompt-Medium',
    color: Colors.secondary,
  },
  locationDistance: {
    fontSize: 12,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    marginTop: 2,
  },
  attendeeCount: {
    fontSize: 11,
    fontFamily: 'Prompt-Medium',
    color: Colors.primary,
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  photoUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  photoUsername: {
    fontSize: 11,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
    marginLeft: 4,
  },
  photoLocation: {
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    marginLeft: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  categoryCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCardName: {
    fontSize: 13,
    fontFamily: 'Prompt-Medium',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryCardDistance: {
    fontSize: 11,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
