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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isExpoGo = Constants.appOwnership === 'expo';

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
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);
  const [trendingLocations, setTrendingLocations] = useState<SuggestedLocation[]>([]);

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
      setSharedPhotos(data.sharedPhotos || []);
      setTrendingCategories(data.trendingCategories || []);
      setTrendingLocations(data.trendingLocations || []);
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

  const abbreviateName = (name: string): string => {
    if (name.length <= 25) return name;
    return name.substring(0, 22) + '...';
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

  const renderAdPlaceholder = (size: 'banner' | 'box') => {
    if (isExpoGo) {
      return (
        <View style={[styles.adPlaceholder, size === 'box' ? styles.adBox : styles.adBanner]}>
          <Text style={styles.adPlaceholderText}>Admob Ad</Text>
        </View>
      );
    }
    return (
      <View style={[styles.adPlaceholder, size === 'box' ? styles.adBox : styles.adBanner]}>
        <Text style={styles.adPlaceholderText}>Admob Ad</Text>
      </View>
    );
  };

  const renderSuggestedLocation = (location: SuggestedLocation, index: number) => (
    <TouchableOpacity
      key={location.id || index}
      style={styles.suggestedCard}
      onPress={() => handleLocationPress(location)}
      activeOpacity={0.8}
    >
      <View style={styles.suggestedImageContainer}>
        {location.imageUrl ? (
          <Image source={{ uri: location.imageUrl }} style={styles.suggestedImage} />
        ) : (
          <View style={styles.suggestedImagePlaceholder}>
            <Ionicons name="location" size={32} color={Colors.white} />
          </View>
        )}
      </View>
      <View style={styles.suggestedOverlay}>
        <Text style={styles.suggestedLabel}>Suggested Location Nearby</Text>
        <View style={styles.suggestedNameRow}>
          <Text style={styles.suggestedName} numberOfLines={1}>
            {abbreviateName(location.name)}
          </Text>
          <View style={styles.suggestedArrow}>
            <Ionicons name="chevron-forward" size={16} color={Colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSharedPhoto = (photo: SharedPhoto, index: number) => (
    <TouchableOpacity
      key={photo.id || index}
      style={styles.sharedPhotoCard}
      onPress={() => handleSharedPhotoPress(photo)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: photo.imageUrl }} style={styles.sharedPhotoImage} />
      <View style={styles.sharedPhotoOverlay}>
        <View style={styles.sharedPhotoUser}>
          <Ionicons name="person-circle" size={20} color={Colors.white} />
          <Text style={styles.sharedPhotoUsername}>{photo.username}</Text>
        </View>
        <View style={styles.sharedPhotoLocation}>
          <Text style={styles.sharedPhotoLabel}>Hangout Location</Text>
          <View style={styles.sharedPhotoNameRow}>
            <Text style={styles.sharedPhotoName} numberOfLines={1}>
              {abbreviateName(photo.locationName)}
            </Text>
            <View style={styles.sharedPhotoArrow}>
              <Ionicons name="chevron-forward" size={14} color={Colors.white} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingCategory = (category: TrendingCategory, index: number) => (
    <View key={category.category + index} style={styles.trendingSection}>
      <View style={styles.trendingSectionHeader}>
        <Text style={styles.trendingEmoji}>{category.emoji}</Text>
        <Text style={styles.trendingSectionTitle}>Trending - {category.category}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingScrollContent}
      >
        {category.locations.map((location, locIndex) => (
          <TouchableOpacity
            key={location.id || locIndex}
            style={styles.trendingCard}
            onPress={() => handleLocationPress(location)}
            activeOpacity={0.8}
          >
            {location.imageUrl ? (
              <Image source={{ uri: location.imageUrl }} style={styles.trendingImage} />
            ) : (
              <View style={[styles.trendingImage, styles.trendingImagePlaceholder]}>
                <Ionicons name="location" size={24} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const hasNoContent = suggestedLocations.length === 0 && trendingLocations.length === 0 && trendingCategories.length === 0 && sharedPhotos.length === 0;

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
      <View style={styles.topRow}>
        {renderAdPlaceholder('box')}
        {suggestedLocations.length > 0 && renderSuggestedLocation(suggestedLocations[0], 0)}
      </View>

      <Text style={styles.sponsoredText}>SPONSORED</Text>

      {sharedPhotos.length > 0 && renderSharedPhoto(sharedPhotos[0], 0)}

      {trendingCategories.map((category, index) => renderTrendingCategory(category, index))}

      <Text style={styles.sponsoredText}>SPONSORED</Text>
      <View style={styles.bottomAdRow}>
        {renderAdPlaceholder('banner')}
      </View>

      {suggestedLocations.slice(1, 3).map((location, index) => 
        renderSuggestedLocation(location, index + 1)
      )}

      {trendingLocations.length > 0 && (
        <View style={styles.trendingSection}>
          <View style={styles.trendingSectionHeader}>
            <Text style={styles.trendingEmoji}>📍</Text>
            <Text style={styles.trendingSectionTitle}>Popular Nearby</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScrollContent}
          >
            {trendingLocations.map((location, index) => (
              <TouchableOpacity
                key={location.id || index}
                style={styles.trendingCard}
                onPress={() => handleLocationPress(location)}
                activeOpacity={0.8}
              >
                {location.imageUrl ? (
                  <Image source={{ uri: location.imageUrl }} style={styles.trendingImage} />
                ) : (
                  <View style={[styles.trendingImage, styles.trendingImagePlaceholder]}>
                    <Ionicons name="location" size={24} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
    paddingTop: 8,
  },
  emptyContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  adBox: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 150,
  },
  adBanner: {
    width: '100%',
    height: 60,
  },
  adPlaceholderText: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
  },
  sponsoredText: {
    fontSize: 9,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    letterSpacing: 0.5,
    marginVertical: 8,
  },
  suggestedCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestedImageContainer: {
    flex: 1,
  },
  suggestedImage: {
    width: '100%',
    height: '100%',
  },
  suggestedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(180, 160, 220, 0.9)',
    padding: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  suggestedLabel: {
    fontSize: 8,
    fontFamily: 'Prompt-Regular',
    color: Colors.white,
    opacity: 0.9,
  },
  suggestedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestedName: {
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    flex: 1,
  },
  suggestedArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sharedPhotoCard: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sharedPhotoImage: {
    width: '100%',
    height: '100%',
  },
  sharedPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  sharedPhotoUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  sharedPhotoUsername: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
    marginLeft: 4,
  },
  sharedPhotoLocation: {
    backgroundColor: 'rgba(180, 160, 220, 0.9)',
    padding: 10,
    borderRadius: 12,
  },
  sharedPhotoLabel: {
    fontSize: 8,
    fontFamily: 'Prompt-Regular',
    color: Colors.white,
    opacity: 0.9,
  },
  sharedPhotoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharedPhotoName: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    flex: 1,
  },
  sharedPhotoArrow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  trendingSection: {
    marginBottom: 16,
  },
  trendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 200, 200, 0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendingEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  trendingSectionTitle: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  trendingScrollContent: {
    paddingRight: 16,
  },
  trendingCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingImagePlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomAdRow: {
    marginBottom: 16,
  },
  bottomPadding: {
    height: 100,
  },
});
