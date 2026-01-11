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

interface TrendingEvent {
  id: string;
  name: string;
  abbreviatedName: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  attendeeCount: number;
  imageUrl: string;
  creatorName: string;
  eventDate: string;
  isRealEvent: boolean;
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

interface CategorySection {
  id: string;
  name: string;
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

function LargeHangoutCard({ hangout, onPress }: { hangout: SuggestedLocation; onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={largeHangoutStyles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: hangout.imageUrl }} 
        style={largeHangoutStyles.image}
        resizeMode="cover"
      />
      <View style={largeHangoutStyles.overlay}>
        <View style={largeHangoutStyles.userRow}>
          <View style={largeHangoutStyles.avatar}>
            <Ionicons name="person" size={16} color={Colors.grayMedium} />
          </View>
          <Text style={largeHangoutStyles.username}>
            {hangout.creatorName || 'A user'}
          </Text>
        </View>
        <View style={largeHangoutStyles.locationRow}>
          <Text style={largeHangoutStyles.label}>Hangout Location</Text>
          <View style={largeHangoutStyles.nameRow}>
            <Text style={largeHangoutStyles.name} numberOfLines={1}>
              {hangout.name}
            </Text>
            <View style={largeHangoutStyles.chevron}>
              <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const largeHangoutStyles = StyleSheet.create({
  card: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  username: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
  },
  locationRow: {},
  label: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
    marginRight: 8,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function ExploreTab({ onSelectLocation }: ExploreTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [userHangouts, setUserHangouts] = useState<SuggestedLocation[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);
  const [layoutOrder, setLayoutOrder] = useState<string[]>([]);
  const [categorySections, setCategorySections] = useState<CategorySection[]>([]);

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
      setTrendingEvents(data.trendingEvents || []);
      setSharedPhotos(data.sharedPhotos || []);
      setLayoutOrder(data.layoutOrder || []);
      setCategorySections(data.categorySections || []);
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

  const renderCategorySection = (section: CategorySection) => {
    if (!section.locations || section.locations.length === 0) return null;
    return (
      <View key={section.id} style={styles.categorySection}>
        <View style={styles.centeredSectionHeader}>
          <Text style={styles.categoryEmoji}>{section.emoji}</Text>
          <Text style={styles.centeredSectionTitle}>{section.name}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {section.locations.map((location, index) => (
            <TouchableOpacity
              key={location.id || `${section.id}-${index}`}
              style={styles.categoryCard}
              onPress={() => handleLocationPress(location)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: location.imageUrl }} 
                style={styles.categoryCardImage}
                resizeMode="cover"
              />
              <View style={styles.categoryCardOverlay}>
                <Text style={styles.categoryCardName} numberOfLines={2}>
                  {location.abbreviatedName}
                </Text>
                {location.address && (
                  <Text style={styles.categoryCardAddress} numberOfLines={1}>
                    {location.address}
                  </Text>
                )}
                {location.distance !== undefined && (
                  <Text style={styles.categoryCardDistance}>
                    {formatDistance(location.distance)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
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

  const renderFeaturedLocation = () => {
    if (!featuredLocation) return null;
    return (
      <TouchableOpacity 
        key="featuredLocation"
        style={styles.featuredLocationCard}
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
            <View style={styles.suggestedNameContainer}>
              <Text style={styles.suggestedName} numberOfLines={2}>
                {featuredLocation.name}
              </Text>
              {featuredLocation.address && (
                <Text style={styles.suggestedAddress} numberOfLines={2}>
                  {featuredLocation.address}
                </Text>
              )}
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedHangout = () => {
    if (!featuredHangout) return null;
    return (
      <LargeHangoutCard 
        key="featuredHangout"
        hangout={featuredHangout} 
        onPress={() => handleLocationPress(featuredHangout)} 
      />
    );
  };

  const renderSharedPhotos = () => {
    if (sharedPhotos.length === 0) return null;
    return (
      <View key="sharedPhotos" style={styles.sharedPhotosSection}>
        <View style={styles.centeredSectionHeader}>
          <Ionicons name="camera" size={18} color={Colors.secondary} />
          <Text style={styles.centeredSectionTitle}>Photos From Friends Nearby</Text>
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
    );
  };

  const renderHangoutBanner = (bannerNumber: number) => {
    const hangout = userHangouts[bannerNumber];
    if (!hangout) return null;
    return (
      <LargeHangoutCard 
        key={`hangoutBanner${bannerNumber}`}
        hangout={hangout} 
        onPress={() => handleLocationPress(hangout)} 
      />
    );
  };

  const renderTrending = () => {
    if (trendingEvents.length === 0) return null;
    return (
      <View key="trending" style={styles.trendingSection}>
        <View style={styles.centeredSectionHeader}>
          <Text style={styles.categoryEmoji}>🔥</Text>
          <Text style={styles.centeredSectionTitle}>Trending Hangouts Near You</Text>
        </View>
        <View style={styles.trendingGridCentered}>
          {trendingEvents.slice(0, 4).map((event, index) => (
            <TouchableOpacity
              key={event.id || `trend-${index}`}
              style={styles.trendingEventCard}
              onPress={() => onSelectLocation({
                name: event.name,
                address: event.address,
                lat: event.lat,
                lng: event.lng,
              })}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: event.imageUrl }} 
                style={styles.trendingEventImage}
                resizeMode="cover"
              />
              <View style={styles.trendingEventOverlay}>
                <Text style={styles.trendingEventName} numberOfLines={2}>
                  {event.abbreviatedName}
                </Text>
                <View style={styles.trendingEventMeta}>
                  {event.attendeeCount > 0 && (
                    <View style={styles.attendeeTag}>
                      <Ionicons name="people" size={10} color={Colors.white} />
                      <Text style={styles.attendeeCount}>{event.attendeeCount}</Text>
                    </View>
                  )}
                  {event.distance && (
                    <Text style={styles.trendingEventDistance}>
                      {formatDistance(event.distance)}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAdBox = (key: string) => (
    <View key={key} style={styles.midAdWrapper}>
      <AdBox unitId={ADMOB_BOX_ID} />
    </View>
  );

  const renderAdBanner = (key: string) => (
    <View key={key} style={styles.bannerWrapper}>
      <AdBanner unitId={ADMOB_BANNER_ID} />
    </View>
  );

  const renderCategories = () => {
    if (categorySections.length === 0) return null;
    return (
      <View key="categories">
        {categorySections.map(section => renderCategorySection(section))}
      </View>
    );
  };

  const renderMorePlaces = () => {
    if (suggestedLocations.length <= 1) return null;
    return (
      <View key="morePlaces" style={styles.morePlacesSection}>
        <View style={styles.centeredSectionHeader}>
          <Ionicons name="compass" size={18} color={Colors.secondary} />
          <Text style={styles.centeredSectionTitle}>More Places To Explore</Text>
        </View>
        <View style={styles.placesGrid}>
          {suggestedLocations.slice(1, 7).map((location, index) => (
            <TouchableOpacity
              key={location.id || `place-${index}`}
              style={styles.placeCard}
              onPress={() => handleLocationPress(location)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: location.imageUrl }} 
                style={styles.placeImage}
                resizeMode="cover"
              />
              <View style={styles.placeOverlay}>
                <Text style={styles.placeName} numberOfLines={2}>
                  {location.abbreviatedName}
                </Text>
                {location.address && (
                  <Text style={styles.placeAddress} numberOfLines={2}>
                    {location.address}
                  </Text>
                )}
                {location.distance !== undefined && (
                  <Text style={styles.placeDistance}>
                    {formatDistance(location.distance)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMoreHangouts = () => {
    if (userHangouts.length <= 3) return null;
    return (
      <View key="moreHangouts" style={styles.moreHangoutsSection}>
        <View style={styles.centeredSectionHeader}>
          <Ionicons name="people" size={18} color={Colors.secondary} />
          <Text style={styles.centeredSectionTitle}>Where Others Are Hanging Out</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hangoutsScrollContent}
        >
          {userHangouts.slice(3, 7).map((hangout, index) => (
            <TouchableOpacity
              key={hangout.id || `hangout-${index}`}
              style={styles.smallHangoutCard}
              onPress={() => handleLocationPress(hangout)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: hangout.imageUrl }} 
                style={styles.smallHangoutImage}
                resizeMode="cover"
              />
              <View style={styles.smallHangoutOverlay}>
                <Text style={styles.smallHangoutName} numberOfLines={1}>
                  {hangout.abbreviatedName}
                </Text>
                <View style={styles.smallHangoutMeta}>
                  <Text style={styles.smallHangoutCreator}>
                    by {hangout.creatorName || 'User'}
                  </Text>
                  {hangout.attendeeCount && hangout.attendeeCount > 0 && (
                    <View style={styles.smallAttendeeBadge}>
                      <Text style={styles.smallAttendeeText}>{hangout.attendeeCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDiscoverMore = () => {
    if (suggestedLocations.length <= 7) return null;
    return (
      <View key="discoverMore" style={styles.evenMoreSection}>
        <View style={styles.centeredSectionHeader}>
          <Ionicons name="sparkles" size={18} color={Colors.secondary} />
          <Text style={styles.centeredSectionTitle}>Discover More Nearby</Text>
        </View>
        <View style={styles.placesGrid}>
          {suggestedLocations.slice(7, 13).map((location, index) => (
            <TouchableOpacity
              key={location.id || `more-${index}`}
              style={styles.placeCard}
              onPress={() => handleLocationPress(location)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: location.imageUrl }} 
                style={styles.placeImage}
                resizeMode="cover"
              />
              <View style={styles.placeOverlay}>
                <Text style={styles.placeName} numberOfLines={2}>
                  {location.abbreviatedName}
                </Text>
                {location.address && (
                  <Text style={styles.placeAddress} numberOfLines={2}>
                    {location.address}
                  </Text>
                )}
                {location.distance !== undefined && (
                  <Text style={styles.placeDistance}>
                    {formatDistance(location.distance)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'topAdBox':
        return renderAdBox('topAdBox');
      case 'featuredLocation':
        return renderFeaturedLocation();
      case 'featuredHangout':
        return renderFeaturedHangout();
      case 'sharedPhotos':
        return renderSharedPhotos();
      case 'hangoutBanner1':
        return renderHangoutBanner(1);
      case 'hangoutBanner2':
        return renderHangoutBanner(2);
      case 'hangoutBanner3':
        return renderHangoutBanner(3);
      case 'trending':
        return renderTrending();
      case 'adBox1':
        return renderAdBox('adBox1');
      case 'adBox2':
        return renderAdBox('adBox2');
      case 'adBanner1':
        return renderAdBanner('adBanner1');
      case 'categories':
        return renderCategories();
      case 'morePlaces':
        return renderMorePlaces();
      case 'moreHangouts':
        return renderMoreHangouts();
      case 'discoverMore':
        return renderDiscoverMore();
      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {layoutOrder.map(sectionId => renderSection(sectionId))}

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
  featuredLocationCard: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
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
  suggestedNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  suggestedName: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
  },
  suggestedAddress: {
    fontSize: 11,
    fontFamily: 'Prompt-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
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
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trendingEventCard: {
    width: '48%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  trendingEventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  trendingEventOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trendingEventName: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginBottom: 4,
  },
  trendingEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  attendeeCount: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
  },
  trendingEventDistance: {
    fontSize: 11,
    fontFamily: 'Prompt-Medium',
    color: 'rgba(255,255,255,0.8)',
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
  trendingGridCentered: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  midAdWrapper: {
    marginVertical: 16,
    alignItems: 'center',
  },
  morePlacesSection: {
    marginBottom: 16,
  },
  moreHangoutsSection: {
    marginBottom: 16,
  },
  evenMoreSection: {
    marginBottom: 16,
  },
  sectionHeader: {
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
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  placesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  placeCard: {
    width: '48%',
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  placeImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  placeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  placeName: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 10,
    fontFamily: 'Prompt-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  placeDistance: {
    fontSize: 11,
    fontFamily: 'Prompt-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  hangoutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  smallHangoutCard: {
    width: '48%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  smallHangoutImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  smallHangoutOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  smallHangoutName: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginBottom: 2,
  },
  smallHangoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallHangoutCreator: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  smallAttendeeBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  smallAttendeeText: {
    fontSize: 10,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
  },
  hangoutsScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  categorySection: {
    marginBottom: 20,
  },
  centeredSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  centeredSectionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
    textAlign: 'center',
  },
  categoryScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
  categoryCard: {
    width: 150,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  categoryCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  categoryCardName: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginBottom: 2,
  },
  categoryCardAddress: {
    fontSize: 10,
    fontFamily: 'Prompt-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  categoryCardDistance: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
  },
});
