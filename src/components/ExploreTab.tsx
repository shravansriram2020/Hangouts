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
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Shadows } from '../../constants/theme';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_HEIGHT = 280;

interface ExplorePost {
  id: string;
  imageUrl: string;
  username: string;
  userAvatar?: string;
  locationName: string;
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
  const [categories, setCategories] = useState<CategoryFeed[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStep, setShareStep] = useState<'hangouts' | 'photos' | 'preview'>('hangouts');
  const [hangoutsWithPhotos, setHangoutsWithPhotos] = useState<HangoutWithPhotos[]>([]);
  const [selectedHangout, setSelectedHangout] = useState<HangoutWithPhotos | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ id: string; photo_url: string } | null>(null);
  const [loadingHangouts, setLoadingHangouts] = useState(false);
  const [sharing, setSharing] = useState(false);

  const lastTapTimeRef = useRef<{ [key: string]: number }>({});
  const doubleTapTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});

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
      setCategories(response.categories || []);
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
    await fetchFeed();
  }, [location]);

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
      
      setCategories(prev => prev.map((cat, ci) => {
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
      address: '',
      lat: post.lat,
      lng: post.lng,
    });
  };

  const renderPost = (post: ExplorePost, categoryIndex: number, postIndex: number) => (
    <TouchableOpacity
      key={post.id}
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => handleTap(post, categoryIndex, postIndex)}
    >
      <Image
        source={{ uri: post.imageUrl }}
        style={styles.cardImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      
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
      
      <View style={styles.tapHint}>
        <Ionicons name="add-circle" size={24} color="rgba(255,255,255,0.9)" />
      </View>
    </TouchableOpacity>
  );

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
        >
          {category.posts.map((post, postIndex) => renderPost(post, index, postIndex))}
        </ScrollView>
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
        {categories.length === 0 ? (
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
            {categories.map((category, index) => renderCategory(category, index))}
          </>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleCloseModal}
              >
                <Ionicons 
                  name={shareStep === 'hangouts' ? "close" : "arrow-back"} 
                  size={24} 
                  color={Colors.secondary} 
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.modalNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.grayMedium} />
              <Text style={styles.modalNoteText}>
                Note: By sharing, you share your Hangout location and one image with others. Inappropriate or harmful content will be removed.
              </Text>
            </View>

            {loadingHangouts ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : shareStep === 'hangouts' ? (
              hangoutsWithPhotos.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="camera-outline" size={48} color={Colors.grayMedium} />
                  <Text style={styles.modalEmptyText}>No hangouts with photos</Text>
                  <Text style={styles.modalEmptySubtext}>
                    Add photos to your hangouts first, then share them here!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={hangoutsWithPhotos}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
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
                  )}
                  contentContainerStyle={styles.hangoutsList}
                />
              )
            ) : shareStep === 'photos' ? (
              <FlatList
                data={selectedHangout?.photos || []}
                numColumns={3}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
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
                )}
                contentContainerStyle={styles.photosGridContent}
              />
            ) : (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedPhoto?.photo_url }}
                  style={styles.previewImage}
                  contentFit="contain"
                />
                <View style={styles.previewInfo}>
                  <View style={styles.previewLocation}>
                    <Ionicons name="location" size={18} color={Colors.secondary} />
                    <Text style={styles.previewLocationText} numberOfLines={1}>
                      {selectedHangout?.location_name || 'Unknown location'}
                    </Text>
                  </View>
                </View>
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
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.white,
    ...Shadows.medium,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
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
  tapHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.glassLight,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  modalNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    lineHeight: 16,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
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
  hangoutsList: {
    padding: 16,
  },
  hangoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Shadows.small,
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
  photosGridContent: {
    padding: 12,
  },
  photoGridItem: {
    width: (SCREEN_WIDTH - 48) / 3,
    height: (SCREEN_WIDTH - 48) / 3,
    margin: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  previewImage: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Colors.white,
    minHeight: 300,
  },
  previewInfo: {
    marginTop: 16,
    marginBottom: 8,
  },
  previewLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLocationText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black,
    flex: 1,
  },
  shareConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  shareConfirmButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
