import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Shadows } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_HEIGHT = 280;
const CATEGORIES_PER_PAGE = 5;
const TRENDING_THRESHOLD = 10;

interface ExplorePost {
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
  distance: number;
  createdAt: string;
}

interface CategoryFeed {
  category: string;
  posts: ExplorePost[];
}

interface HangoutWithPhotos {
  id: string;
  title: string;
  location_name: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  event_date: string;
  photos: Array<{
    id: string;
    photo_url: string;
    created_at: string;
  }>;
}

interface ExploreTabProps {
  onSelectLocation: (location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
}

const CATEGORY_COLORS: { [key: string]: string[] } = {
  'Food & Dining': ['#FF6B6B', '#FF8E53'],
  'Bars & Nightlife': ['#9B59B6', '#8E44AD'],
  'Entertainment': ['#3498DB', '#2980B9'],
  'Outdoors': ['#27AE60', '#2ECC71'],
  'Other': ['#95A5A6', '#7F8C8D'],
};

const CATEGORY_ICONS: { [key: string]: string } = {
  'Food & Dining': 'restaurant',
  'Bars & Nightlife': 'wine',
  'Entertainment': 'game-controller',
  'Outdoors': 'leaf',
  'Other': 'location',
};

export default function ExploreTab({ onSelectLocation }: ExploreTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryFeed[]>([]);
  const [visibleCount, setVisibleCount] = useState(CATEGORIES_PER_PAGE);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeIndices, setActiveIndices] = useState<{ [key: string]: number }>({});
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStep, setShareStep] = useState<'hangouts' | 'photos' | 'preview'>('hangouts');
  const [hangoutsWithPhotos, setHangoutsWithPhotos] = useState<HangoutWithPhotos[]>([]);
  const [selectedHangout, setSelectedHangout] = useState<HangoutWithPhotos | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ id: string; photo_url: string } | null>(null);
  const [loadingHangouts, setLoadingHangouts] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const lastTapTimeRef = useRef<{ [key: string]: number }>({});
  const doubleTapTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});

  const visibleCategories = allCategories.slice(0, visibleCount);
  const hasMore = visibleCount < allCategories.length;

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch (error) {
      console.log('Location error:', error);
    }
    return null;
  };

  const fetchFeed = async (loc?: { lat: number; lng: number } | null) => {
    try {
      const coords = loc || location || { lat: 0, lng: 0 };
      const response = await api.get(`/explore/user-feed?lat=${coords.lat}&lng=${coords.lng}`);
      setAllCategories(response.categories || []);
    } catch (error) {
      console.error('Feed error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loc = await fetchLocation();
      await fetchFeed(loc);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setVisibleCount(CATEGORIES_PER_PAGE);
    await fetchFeed();
  }, [location]);

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + CATEGORIES_PER_PAGE, allCategories.length));
  };

  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    setShareStep('hangouts');
    setSelectedHangout(null);
    setSelectedPhoto(null);
    setLoadingHangouts(true);
    
    try {
      const response = await api.get('/explore/my-events-with-photos');
      setHangoutsWithPhotos(response || []);
    } catch (error) {
      console.error('Fetch hangouts error:', error);
      setHangoutsWithPhotos([]);
    } finally {
      setLoadingHangouts(false);
    }
  };

  const handleSelectHangout = (hangout: HangoutWithPhotos) => {
    setSelectedHangout(hangout);
    setShareStep('photos');
  };

  const handleSelectPhoto = (photo: { id: string; photo_url: string }) => {
    setSelectedPhoto(photo);
    setShareStep('preview');
  };

  const handleSharePhoto = async () => {
    if (!selectedHangout || !selectedPhoto) return;
    
    setSharing(true);
    try {
      await api.post('/explore/share', {
        eventId: selectedHangout.id,
        photoId: selectedPhoto.id,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Shared!', 'Your photo is now live on Explore.');
      setShowShareModal(false);
      await fetchFeed();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share photo');
    } finally {
      setSharing(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedHangout) return;
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploadingPhoto(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const formData = new FormData();
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      formData.append('photo', {
        uri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      const uploadResponse = await api.uploadFormData(
        `/events/${selectedHangout.id}/photos`,
        formData
      );

      if (uploadResponse?.photo) {
        setSelectedPhoto({
          id: uploadResponse.photo.id,
          photo_url: uploadResponse.photo.photo_url,
        });
        setShareStep('preview');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCloseModal = () => {
    if (shareStep === 'preview') {
      setShareStep('photos');
      setSelectedPhoto(null);
    } else if (shareStep === 'photos') {
      setShareStep('hangouts');
      setSelectedHangout(null);
    } else {
      setShowShareModal(false);
    }
  };

  const getModalTitle = () => {
    if (shareStep === 'hangouts') return 'Select a Hangout';
    if (shareStep === 'photos') return 'Select a Photo';
    return 'Preview';
  };

  const handleTap = (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    const postId = post.id;
    const now = Date.now();
    const lastTap = lastTapTimeRef.current[postId] || 0;
    const timeDiff = now - lastTap;
    
    if (doubleTapTimerRef.current[postId]) {
      clearTimeout(doubleTapTimerRef.current[postId]);
    }
    
    if (timeDiff < 300 && timeDiff > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handleDoubleTap(post, categoryIndex, postIndex);
      lastTapTimeRef.current[postId] = 0;
    } else {
      lastTapTimeRef.current[postId] = now;
      doubleTapTimerRef.current[postId] = setTimeout(() => {
        if (lastTapTimeRef.current[postId] === now) {
          handleSingleTap(post);
        }
      }, 300);
    }
  };

  const handleDoubleTap = async (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    try {
      const response = await api.post(`/explore/photos/${post.id}/like`, {});
      
      setAllCategories(prev => prev.map((cat, ci) => {
        if (ci !== categoryIndex) return cat;
        return {
          ...cat,
          posts: cat.posts.map((p, pi) => {
            if (pi !== postIndex) return p;
            return { ...p, isLiked: response.isLiked, likeCount: response.likeCount };
          }),
        };
      }));
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleSingleTap = (post: ExplorePost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectLocation({
      name: post.locationName,
      address: post.locationAddress || '',
      lat: post.lat,
      lng: post.lng,
    });
  };

  const handleScroll = (category: string, event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + 16));
    setActiveIndices(prev => ({ ...prev, [category]: index }));
  };

  const renderPostCard = (post: ExplorePost, categoryIndex: number, postIndex: number, isPreview = false) => {
    const isTrending = post.likeCount >= TRENDING_THRESHOLD;
    
    return (
      <TouchableOpacity
        key={post.id}
        style={[styles.card, isPreview && styles.previewCard]}
        activeOpacity={0.95}
        onPress={() => !isPreview && handleTap(post, categoryIndex, postIndex)}
        disabled={isPreview}
      >
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        
        {isTrending && (
          <View style={styles.trendingBadge}>
            <Ionicons name="flame" size={12} color={Colors.white} />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
        
        <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.userRow}>
            {post.userAvatar ? (
              <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={14} color={Colors.white} />
              </View>
            )}
            <Text style={styles.username}>{post.username}</Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.white} />
            <Text style={styles.locationName} numberOfLines={1}>{post.locationName}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons 
                name={post.isLiked ? "heart" : "heart-outline"} 
                size={18} 
                color={post.isLiked ? '#FF6B6B' : Colors.white} 
              />
              <Text style={styles.statText}>{post.likeCount}</Text>
            </View>
            {post.distance > 0 && (
              <Text style={styles.distanceText}>{post.distance.toFixed(1)} mi</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
    );
  };

  const renderPaginationDots = (category: string, count: number) => {
    if (count <= 1) return null;
    const activeIndex = activeIndices[category] || 0;
    
    return (
      <View style={styles.dotsContainer}>
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
            ]}
          />
        ))}
        {count > 5 && <Text style={styles.dotsMore}>+{count - 5}</Text>}
      </View>
    );
  };

  const renderCategory = (category: CategoryFeed, index: number) => {
    const colors = CATEGORY_COLORS[category.category] || CATEGORY_COLORS['Other'];
    const icon = CATEGORY_ICONS[category.category] || 'location';
    
    return (
      <View key={category.category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <LinearGradient
            colors={colors as any}
            style={styles.categoryIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon as any} size={18} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.categoryTitle}>{category.category}</Text>
          <View style={styles.categoryCountBadge}>
            <Text style={styles.categoryCount}>{category.posts.length}</Text>
          </View>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
          onScroll={(e) => handleScroll(category.category, e)}
          scrollEventThrottle={16}
        >
          {category.posts.map((post, postIndex) => renderPostCard(post, index, postIndex))}
        </ScrollView>
        
        {renderPaginationDots(category.category, category.posts.length)}
      </View>
    );
  };

  const renderAd = (key: string) => {
    return (
      <View key={key} style={styles.adContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.06)']}
          style={styles.adPlaceholder}
        >
          <Ionicons name="megaphone-outline" size={20} color={Colors.grayMedium} />
          <Text style={styles.adText}>Sponsored</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderModalContent = () => {
    if (loadingHangouts) {
      return (
        <View style={styles.modalLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (shareStep === 'hangouts') {
      return (
        <View>
          <View style={styles.modalNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.grayMedium} />
            <Text style={styles.modalNoteText}>
              Note: By sharing, you share your Hangout location and one image with others. Inappropriate or harmful content will be removed.
            </Text>
          </View>
          
          {hangoutsWithPhotos.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Ionicons name="camera-outline" size={48} color={Colors.grayMedium} />
              <Text style={styles.modalEmptyText}>No hangouts with photos</Text>
              <Text style={styles.modalEmptySubtext}>
                Add photos to your hangouts first, then share them here!
              </Text>
            </View>
          ) : (
            hangoutsWithPhotos.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.hangoutItem}
                onPress={() => handleSelectHangout(item)}
                activeOpacity={0.7}
              >
                <View style={styles.hangoutInfo}>
                  <Text style={styles.hangoutTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.hangoutLocation}>
                    <Ionicons name="location-outline" size={14} color={Colors.grayMedium} />
                    <Text style={styles.hangoutLocationText} numberOfLines={1}>
                      {item.location_name || 'No location'}
                    </Text>
                  </View>
                  <Text style={styles.hangoutPhotoCount}>
                    {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.grayMedium} />
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (shareStep === 'photos') {
      return (
        <View>
          <TouchableOpacity
            style={styles.uploadPhotoButton}
            onPress={handleUploadPhoto}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
                <Text style={styles.uploadPhotoText}>Upload New Photo</Text>
              </>
            )}
          </TouchableOpacity>
          
          {(selectedHangout?.photos?.length || 0) > 0 && (
            <Text style={styles.orSelectLabel}>Or select from existing photos:</Text>
          )}
          
          <View style={styles.photosGrid}>
            {(selectedHangout?.photos || []).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.photoGridItem}
                onPress={() => handleSelectPhoto(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.photo_url }}
                  style={styles.photoGridImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    const previewPost: ExplorePost = {
      id: 'preview',
      imageUrl: selectedPhoto?.photo_url || '',
      username: 'You',
      locationName: selectedHangout?.location_name || '',
      locationAddress: selectedHangout?.location_address || '',
      lat: selectedHangout?.location_lat || 0,
      lng: selectedHangout?.location_lng || 0,
      likeCount: 0,
      isLiked: false,
      distance: 0,
      createdAt: new Date().toISOString(),
    };

    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>This is how your post will appear:</Text>
        
        {renderPostCard(previewPost, -1, -1, true)}
        
        <TouchableOpacity
          style={styles.shareConfirmButton}
          onPress={handleSharePhoto}
          disabled={sharing}
          activeOpacity={0.7}
        >
          {sharing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={Colors.white} />
              <Text style={styles.shareConfirmButtonText}>Share to Explore</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading explore...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleOpenShareModal}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.secondary} />
          <Text style={styles.shareButtonText}>Share your Hangout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {allCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="images-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No hangouts shared yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share a spot! Tap the button above to share photos from your hangouts.
            </Text>
          </View>
        ) : (
          <>
            {visibleCategories.map((category, index) => (
              <React.Fragment key={category.category}>
                {renderCategory(category, index)}
                {(index + 1) % 2 === 0 && index < visibleCategories.length - 1 && renderAd(`ad-${index}`)}
              </React.Fragment>
            ))}
            
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.secondary} />
                <Text style={styles.loadMoreText}>Load More Categories</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <GlassModal
        visible={showShareModal}
        onClose={handleCloseModal}
        title={getModalTitle()}
        fullHeight
      >
        {renderModalContent()}
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.grayMedium,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  shareButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginLeft: 10,
    flex: 1,
  },
  categoryCountBadge: {
    backgroundColor: Colors.glassLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCount: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
  },
  carousel: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: Colors.glassLight,
    ...Shadows.medium,
  },
  previewCard: {
    marginRight: 0,
    alignSelf: 'center',
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  trendingText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  cardContent: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  distanceText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dotActive: {
    backgroundColor: Colors.secondary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotsMore: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginLeft: 4,
  },
  adContainer: {
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  adPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  adText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  loadMoreText: {
    color: Colors.secondary,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  modalLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingVertical: 40,
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  modalNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.grayDark,
    lineHeight: 18,
  },
  modalEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginTop: 16,
  },
  modalEmptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    textAlign: 'center',
    marginTop: 8,
  },
  hangoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  hangoutInfo: {
    flex: 1,
    gap: 4,
  },
  hangoutTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  hangoutLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hangoutLocationText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    flex: 1,
  },
  hangoutPhotoCount: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.primary,
    marginTop: 2,
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 8,
  } as any,
  uploadPhotoText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  orSelectLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  previewContainer: {
    paddingTop: 4,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginBottom: 12,
    textAlign: 'center',
  },
  shareConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    gap: 8,
  },
  shareConfirmButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
