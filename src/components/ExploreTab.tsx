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
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

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

interface EventWithPhotos {
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
  const [shareStep, setShareStep] = useState<'events' | 'photos'>('events');
  const [eventsWithPhotos, setEventsWithPhotos] = useState<EventWithPhotos[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithPhotos | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sharing, setSharing] = useState(false);

  const lastTapRef = useRef<{ [key: string]: number }>({});

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
    setShareStep('events');
    setSelectedEvent(null);
    setLoadingEvents(true);
    
    try {
      const events = await api.get('/explore/my-events-with-photos');
      setEventsWithPhotos(events);
    } catch (error) {
      console.error('Fetch events error:', error);
      Alert.alert('Error', 'Failed to load your events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSelectEvent = (event: EventWithPhotos) => {
    setSelectedEvent(event);
    setShareStep('photos');
  };

  const handleSharePhoto = async (photoId: string) => {
    if (!selectedEvent || sharing) return;
    
    setSharing(true);
    try {
      await api.post('/explore/share', {
        eventId: selectedEvent.id,
        photoId: photoId,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Shared!', 'Your photo is now live on Explore.');
      setShowShareModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share photo');
    } finally {
      setSharing(false);
    }
  };

  const handleDoubleTap = async (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[post.id] || 0;
    
    if (now - lastTap < 300) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
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
    } else {
      lastTapRef.current[post.id] = now;
    }
  };

  const handleSingleTap = (post: ExplorePost) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[post.id] || 0;
    
    if (now - lastTap > 300) {
      setTimeout(() => {
        const currentLast = lastTapRef.current[post.id] || 0;
        if (now === currentLast) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelectLocation({
            name: post.locationName,
            address: '',
            lat: post.lat,
            lng: post.lng,
          });
        }
      }, 300);
    }
    lastTapRef.current[post.id] = now;
  };

  const renderPost = (post: ExplorePost, categoryIndex: number, postIndex: number) => (
    <TouchableOpacity
      key={post.id}
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => {
        handleDoubleTap(post, categoryIndex, postIndex);
        handleSingleTap(post);
      }}
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
        <Ionicons name="add-circle" size={20} color="rgba(255,255,255,0.8)" />
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
          <Text style={styles.categoryCount}>{category.posts.length}</Text>
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
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.secondary} />
          <Text style={styles.shareButtonText}>Share a Hangout Spot</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(255,107,107,0.1)', 'rgba(255,142,83,0.1)']}
              style={styles.emptyIconBg}
            >
              <Ionicons name="images-outline" size={48} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No hangouts shared yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share a spot! Tap the Share button above to share photos from your events.
            </Text>
            <Text style={styles.emptyHint}>
              Tip: Double-tap posts to like, single-tap to use the location
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hintBanner}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
              <Text style={styles.hintText}>
                Double-tap to like • Single-tap to use location
              </Text>
            </View>
            
            {categories.map((category, index) => renderCategory(category, index))}
          </>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalBack}
                onPress={() => {
                  if (shareStep === 'photos') {
                    setShareStep('events');
                    setSelectedEvent(null);
                  } else {
                    setShowShareModal(false);
                  }
                }}
              >
                <Ionicons 
                  name={shareStep === 'photos' ? "arrow-back" : "close"} 
                  size={24} 
                  color={Colors.black} 
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {shareStep === 'events' ? 'Select an Event' : 'Select a Photo'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {loadingEvents ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : shareStep === 'events' ? (
              eventsWithPhotos.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="camera-outline" size={48} color={Colors.grayMedium} />
                  <Text style={styles.modalEmptyText}>No events with photos</Text>
                  <Text style={styles.modalEmptySubtext}>
                    Add photos to your events first, then share them here!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={eventsWithPhotos}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.eventItem}
                      onPress={() => handleSelectEvent(item)}
                    >
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.eventLocation}>
                          <Ionicons name="location-outline" size={14} color={Colors.grayMedium} />
                          <Text style={styles.eventLocationText} numberOfLines={1}>
                            {item.location_name || 'No location'}
                          </Text>
                        </View>
                        <Text style={styles.eventPhotoCount}>
                          {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Colors.grayMedium} />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.eventsList}
                />
              )
            ) : (
              <View style={styles.photosGrid}>
                <FlatList
                  data={selectedEvent?.photos || []}
                  numColumns={2}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.photoGridItem}
                      onPress={() => handleSharePhoto(item.id)}
                      disabled={sharing}
                    >
                      <Image
                        source={{ uri: item.photo_url }}
                        style={styles.photoGridImage}
                        contentFit="cover"
                      />
                      {sharing && (
                        <View style={styles.photoOverlay}>
                          <ActivityIndicator color={Colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.photosGridContent}
                />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.black,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.grayMedium,
    marginTop: 2,
  },
  shareButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: Colors.grayMedium,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.grayMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    marginLeft: 10,
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: Colors.grayMedium,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
    fontWeight: '600',
    color: Colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
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
    color: Colors.white,
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  tapHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
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
    fontWeight: '600',
    color: Colors.black,
    marginTop: 16,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: Colors.grayMedium,
    textAlign: 'center',
    marginTop: 8,
  },
  eventsList: {
    padding: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocationText: {
    fontSize: 13,
    color: Colors.grayMedium,
    flex: 1,
  },
  eventPhotoCount: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  photosGrid: {
    flex: 1,
  },
  photosGridContent: {
    padding: 16,
  },
  photoGridItem: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: (SCREEN_WIDTH - 48) / 2,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
