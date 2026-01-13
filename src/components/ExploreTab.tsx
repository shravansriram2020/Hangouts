import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { AdBox, AdBanner } from './AdComponents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ADMOB_BOX_ID = 'ca-app-pub-6700271097724179/7640768902';
const ADMOB_BANNER_ID = 'ca-app-pub-6700271097724179/1798427047';

const CATEGORY_ICONS: { [key: string]: { icon: string; color: string } } = {
  'restaurant': { icon: 'restaurant', color: '#FF6B6B' },
  'cafe': { icon: 'cafe', color: '#8B4513' },
  'bar': { icon: 'wine', color: '#9B59B6' },
  'park': { icon: 'leaf', color: '#27AE60' },
  'gym': { icon: 'fitness', color: '#E74C3C' },
  'shopping': { icon: 'cart', color: '#3498DB' },
  'entertainment': { icon: 'game-controller', color: '#F39C12' },
  'movie': { icon: 'film', color: '#34495E' },
  'sports': { icon: 'football', color: '#16A085' },
  'music': { icon: 'musical-notes', color: '#9B59B6' },
  'art': { icon: 'color-palette', color: '#E91E63' },
  'beach': { icon: 'sunny', color: '#00BCD4' },
  'default': { icon: 'location', color: '#FF6B6B' },
};

const getIconForCategory = (category?: string, name?: string): { icon: string; color: string } => {
  if (category) {
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(CATEGORY_ICONS)) {
      if (lowerCategory.includes(key)) return value;
    }
  }
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('restaurant') || lowerName.includes('grill') || lowerName.includes('kitchen')) 
      return CATEGORY_ICONS.restaurant;
    if (lowerName.includes('cafe') || lowerName.includes('coffee')) 
      return CATEGORY_ICONS.cafe;
    if (lowerName.includes('bar') || lowerName.includes('pub') || lowerName.includes('tavern')) 
      return CATEGORY_ICONS.bar;
    if (lowerName.includes('park') || lowerName.includes('garden')) 
      return CATEGORY_ICONS.park;
    if (lowerName.includes('gym') || lowerName.includes('fitness')) 
      return CATEGORY_ICONS.gym;
    if (lowerName.includes('mall') || lowerName.includes('shop') || lowerName.includes('store')) 
      return CATEGORY_ICONS.shopping;
    if (lowerName.includes('theater') || lowerName.includes('cinema') || lowerName.includes('movie')) 
      return CATEGORY_ICONS.movie;
    if (lowerName.includes('beach') || lowerName.includes('ocean')) 
      return CATEGORY_ICONS.beach;
  }
  return CATEGORY_ICONS.default;
};

interface SharedPhoto {
  id: string;
  imageUrl: string;
  username: string;
  userAvatar?: string;
  locationName: string;
  locationAddress: string;
  lat: number;
  lng: number;
  likeCount: number;
  isLiked: boolean;
}

interface SuggestedLocation {
  id: string;
  name: string;
  abbreviatedName: string;
  address: string;
  imageUrl?: string;
  lat: number;
  lng: number;
  category?: string;
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

function SharedPhotoCard({ 
  photo, 
  onPress, 
  onLike 
}: { 
  photo: SharedPhoto; 
  onPress: () => void; 
  onLike: () => void;
}) {
  return (
    <View style={photoCardStyles.container}>
      <TouchableOpacity 
        style={photoCardStyles.card}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <Image 
          source={{ uri: photo.imageUrl }}
          style={photoCardStyles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={photoCardStyles.gradient}
        >
          <View style={photoCardStyles.infoContainer}>
            <View style={photoCardStyles.userRow}>
              {photo.userAvatar ? (
                <Image 
                  source={{ uri: photo.userAvatar }}
                  style={photoCardStyles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={photoCardStyles.avatarPlaceholder}>
                  <Ionicons name="person" size={16} color={Colors.grayMedium} />
                </View>
              )}
              <View style={photoCardStyles.locationInfo}>
                <Text style={photoCardStyles.username}>{photo.username}</Text>
                <Text style={photoCardStyles.label}>Hangout Location</Text>
                <Text style={photoCardStyles.locationName} numberOfLines={1}>
                  {photo.locationName}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={photoCardStyles.likeButton}
              onPress={(e) => {
                e.stopPropagation();
                onLike();
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={photo.isLiked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={photo.isLiked ? '#FF4757' : 'rgba(255,255,255,0.9)'} 
              />
              <Text style={photoCardStyles.likeCount}>{photo.likeCount}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const photoCardStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  locationInfo: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Prompt-Regular',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
  },
  likeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(138, 111, 234, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    gap: 6,
  },
  likeCount: {
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
  },
});

export default function ExploreTab({ onSelectLocation }: ExploreTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);
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

      const [feedData, photosData] = await Promise.all([
        api.get(`/explore/feed?${params}`),
        api.get(`/explore/shared-photos?${params}`),
      ]);
      
      setSharedPhotos(photosData || []);
      setCategorySections(feedData.categorySections || []);
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

  const handleLocationPress = (location: { name: string; address: string; lat: number; lng: number }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectLocation(location);
  };

  const handleLikePhoto = async (photoId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const response = await api.post(`/explore/photos/${photoId}/like`, {});
      setSharedPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, likeCount: response.likeCount, isLiked: response.isLiked }
          : p
      ));
    } catch (error) {
      console.error('Failed to like photo:', error);
    }
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

  const renderCategorySection = (section: CategorySection, index: number) => {
    if (!section.locations || section.locations.length === 0) return null;
    const displayLocations = section.locations.slice(0, 3);
    
    return (
      <View key={section.id} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryEmoji}>{section.emoji}</Text>
          <Text style={styles.categoryTitle}>{section.name}</Text>
        </View>
        <View style={styles.categoryGrid}>
          {displayLocations.map((location, locIndex) => {
            const iconData = getIconForCategory(location.category, location.name);
            return (
              <TouchableOpacity
                key={location.id || `${section.id}-${locIndex}`}
                style={styles.categoryItem}
                onPress={() => handleLocationPress({
                  name: location.name,
                  address: location.address,
                  lat: location.lat,
                  lng: location.lng,
                })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconWrapper}>
                  <Ionicons name={iconData.icon as any} size={32} color={iconData.color} />
                </View>
                <Text style={styles.categoryItemName} numberOfLines={2}>
                  {location.abbreviatedName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.secondary}
          colors={[Colors.secondary]}
        />
      }
    >
      {sharedPhotos.length > 0 && (
        <>
          {sharedPhotos.map((photo, index) => (
            <React.Fragment key={photo.id}>
              <SharedPhotoCard
                photo={photo}
                onPress={() => handleLocationPress({
                  name: photo.locationName,
                  address: photo.locationAddress,
                  lat: photo.lat,
                  lng: photo.lng,
                })}
                onLike={() => handleLikePhoto(photo.id)}
              />
              {index === 0 && (
                <View style={styles.adSection}>
                  <Text style={styles.sponsoredLabel}>SPONSORED</Text>
                  <AdBanner unitId={ADMOB_BANNER_ID} />
                </View>
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {sharedPhotos.length === 0 && (
        <View style={styles.noPhotosSection}>
          <Ionicons name="images-outline" size={48} color={Colors.grayMedium} />
          <Text style={styles.noPhotosTitle}>No Shared Photos Yet</Text>
          <Text style={styles.noPhotosText}>
            Be the first to share a photo from your hangout! Upload photos to your events and tap Share to feature them here.
          </Text>
        </View>
      )}

      {categorySections.length > 0 && (
        <>
          <View style={styles.adSection}>
            <Text style={styles.sponsoredLabel}>SPONSORED</Text>
            <AdBox unitId={ADMOB_BOX_ID} />
          </View>
          
          {categorySections.map((section, index) => (
            <React.Fragment key={section.id}>
              {renderCategorySection(section, index)}
              {index === 0 && categorySections.length > 1 && (
                <View style={styles.adSection}>
                  <Text style={styles.sponsoredLabel}>SPONSORED</Text>
                  <AdBanner unitId={ADMOB_BANNER_ID} />
                </View>
              )}
            </React.Fragment>
          ))}
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
  },
  adSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sponsoredLabel: {
    fontSize: 10,
    fontFamily: 'Prompt-Medium',
    color: Colors.grayMedium,
    marginBottom: 8,
    letterSpacing: 1,
  },
  noPhotosSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    marginBottom: 16,
  },
  noPhotosTitle: {
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  noPhotosText: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: Colors.grayMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: 20,
    backgroundColor: 'rgba(180, 150, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
    color: Colors.white,
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: (SCREEN_WIDTH - 80) / 3,
    alignItems: 'center',
  },
  categoryIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryItemName: {
    fontSize: 12,
    fontFamily: 'Prompt-Medium',
    color: Colors.white,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});
