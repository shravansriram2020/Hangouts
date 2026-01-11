import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
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
  creatorName?: string;
}

interface TrendingCategory {
  category: string;
  emoji: string;
  locations: SuggestedLocation[];
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
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);

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
      setTrendingCategories(data.trendingCategories || []);
      setSharedPhotos(data.sharedPhotos || []);
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
    }
    setRefreshing(false);
  }, [userLocation]);

  const handleLocationPress = (location: SuggestedLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectLocation({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    });
  };

  const formatDistance = (distance: number | undefined | null) => {
    if (distance === undefined || distance === null) return '';
    if (distance < 0.1) return 'Nearby';
    if (distance < 1) return `${(distance * 5280).toFixed(0)} ft`;
    return `${distance.toFixed(1)} mi`;
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

  const featuredLocation = suggestedLocations[0];
  const featuredHangout = userHangouts[0];

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
        <View style={styles.adBoxWrapper}>
          <AdBox unitId={ADMOB_BOX_ID} />
        </View>
        
        {featuredLocation && (
          <TouchableOpacity 
            style={styles.suggestedCard}
            onPress={() => handleLocationPress(featuredLocation)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: featuredLocation.imageUrl }} 
              style={styles.suggestedImage}
              resizeMode="cover"
            />
            <View style={styles.suggestedOverlay}>
              <Text style={styles.suggestedLabel}>Suggested Location Nearby</Text>
              <View style={styles.suggestedNameRow}>
                <Text style={styles.suggestedName} numberOfLines={2}>
                  {featuredLocation.name}
                </Text>
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {featuredHangout && (
        <TouchableOpacity 
          style={styles.hangoutCard}
          onPress={() => handleLocationPress(featuredHangout)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: featuredHangout.imageUrl }} 
            style={styles.hangoutImage}
            resizeMode="cover"
          />
          <View style={styles.hangoutOverlay}>
            <View style={styles.hangoutUserRow}>
              <View style={styles.hangoutAvatar}>
                <Ionicons name="person" size={16} color={Colors.grayMedium} />
              </View>
              <Text style={styles.hangoutUsername}>
                {featuredHangout.creatorName || 'A user'}
              </Text>
            </View>
            <View style={styles.hangoutLocationRow}>
              <Text style={styles.hangoutLabel}>Hangout Location</Text>
              <View style={styles.hangoutNameRow}>
                <Text style={styles.hangoutName} numberOfLines={1}>
                  {featuredHangout.name}
                </Text>
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {sharedPhotos.length > 0 && (
        <View style={styles.sharedPhotosSection}>
          <View style={styles.sharedPhotosHeader}>
            <Ionicons name="camera" size={18} color={Colors.secondary} />
            <Text style={styles.sharedPhotosTitle}>Photos From Friends Nearby</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sharedPhotosScroll}
          >
            {sharedPhotos.map((photo, index) => (
              <TouchableOpacity
                key={photo.id || `photo-${index}`}
                style={styles.sharedPhotoCard}
                onPress={() => onSelectLocation({
                  name: photo.locationName,
                  address: photo.locationAddress,
                  lat: photo.lat,
                  lng: photo.lng,
                })}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: photo.imageUrl }} 
                  style={styles.sharedPhotoImage}
                  resizeMode="cover"
                />
                <View style={styles.sharedPhotoOverlay}>
                  <View style={styles.sharedPhotoUserRow}>
                    <View style={styles.sharedPhotoAvatar}>
                      <Text style={styles.sharedPhotoInitial}>
                        {photo.username?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <Text style={styles.sharedPhotoUsername} numberOfLines={1}>
                      {photo.username}
                    </Text>
                  </View>
                  <Text style={styles.sharedPhotoLocation} numberOfLines={2}>
                    {photo.locationName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {trendingCategories.map((category, index) => (
        <View key={`trending-${category.category}-${index}`} style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <Text style={styles.trendingEmoji}>{category.emoji}</Text>
            <Text style={styles.trendingTitle}>Trending - {category.category}</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
          >
            {category.locations.map((location, locIndex) => (
              <TouchableOpacity
                key={location.id || `trend-${locIndex}`}
                style={styles.trendingCard}
                onPress={() => handleLocationPress(location)}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: location.imageUrl }} 
                  style={styles.trendingImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}

      <View style={styles.bannerWrapper}>
        <AdBanner unitId={ADMOB_BANNER_ID} />
      </View>

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
    marginBottom: 16,
    gap: 12,
  },
  adBoxWrapper: {
    flex: 1,
  },
  suggestedCard: {
    flex: 1,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  suggestedImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  suggestedOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  suggestedLabel: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  suggestedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestedName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginRight: 8,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangoutCard: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  hangoutImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  hangoutOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  hangoutUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hangoutAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hangoutUsername: {
    fontSize: 13,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
  },
  hangoutLocationRow: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hangoutLabel: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    marginBottom: 2,
  },
  hangoutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hangoutName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    marginRight: 8,
  },
  trendingSection: {
    marginBottom: 20,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  trendingEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  trendingTitle: {
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  trendingScroll: {
    paddingRight: 16,
  },
  trendingCard: {
    width: 110,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  bannerWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  bottomPadding: {
    height: 100,
  },
  sharedPhotosSection: {
    marginBottom: 20,
  },
  sharedPhotosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  sharedPhotosTitle: {
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  sharedPhotosScroll: {
    paddingRight: 16,
  },
  sharedPhotoCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  sharedPhotoImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  sharedPhotoOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sharedPhotoUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sharedPhotoAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  sharedPhotoInitial: {
    fontSize: 12,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
  },
  sharedPhotoUsername: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
    flex: 1,
  },
  sharedPhotoLocation: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    lineHeight: 18,
  },
});
