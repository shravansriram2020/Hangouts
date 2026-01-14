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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

const EXPLORE_BANNER_AD_UNIT = Platform.select({
  ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-6700271097724179/8266335307',
  android: TestIds.BANNER,
}) || TestIds.BANNER;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_HEIGHT = 280;
const MAX_CATEGORIES = 6;
const TRENDING_THRESHOLD = 10;
const AD_INTERVAL = 2;

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
  isSaved: boolean;
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

const HeartOverlay = ({ visible }: { visible: boolean }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 1;
      scale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 100 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 200 })
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={styles.heartOverlay}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="heart" size={80} color="#FF6B6B" />
      </Animated.View>
    </Animated.View>
  );
};

const SavedOverlay = ({ visible }: { visible: boolean }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 1;
      scale.value = withSequence(
        withTiming(1.4, { duration: 250 }),
        withTiming(1, { duration: 150 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 250 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 250 })
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={styles.heartOverlay}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="bookmark" size={80} color="#8B5CF6" />
      </Animated.View>
    </Animated.View>
  );
};

export default function ExploreTab({ onSelectLocation }: ExploreTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryFeed[]>([]);
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
  const cachedHangoutsRef = useRef<HangoutWithPhotos[] | null>(null);

  const [showMyPostsModal, setShowMyPostsModal] = useState(false);
  const [myPosts, setMyPosts] = useState<Array<{
    id: string;
    imageUrl: string;
    locationName: string;
    locationAddress: string;
    likeCount: number;
    createdAt: string;
  }>>([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const lastTapTimeRef = useRef<{ [key: string]: number }>({});
  const doubleTapTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
  const [animatingHearts, setAnimatingHearts] = useState<Set<string>>(new Set());
  const [animatingSaved, setAnimatingSaved] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
  const longPressFiredRef = useRef<{ [key: string]: boolean }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedPosts, setSavedPosts] = useState<ExplorePost[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const visibleCategories = allCategories.slice(0, MAX_CATEGORIES);

  const cachedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchLocation = async (forceRefresh = false) => {
    if (!forceRefresh && cachedLocationRef.current) {
      return cachedLocationRef.current;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        cachedLocationRef.current = coords;
        setLocation(coords);
        return coords;
      }
    } catch (error) {
      console.log('Location error:', error);
    }
    return cachedLocationRef.current || { lat: 0, lng: 0 };
  };

  const fetchFeed = async (loc: { lat: number; lng: number }) => {
    try {
      const response = await api.get(`/explore/user-feed?lat=${loc.lat}&lng=${loc.lng}`);
      setAllCategories(response.categories || []);
    } catch (error) {
      console.error('Feed error:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const loc = await fetchLocation();
      await fetchFeed(loc);
      setLoading(false);
    };
    init();
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const loc = await fetchLocation(true);
    await fetchFeed(loc);
    setRefreshing(false);
  }, []);

  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    setShareStep('hangouts');
    setSelectedHangout(null);
    setSelectedPhoto(null);
    
    if (cachedHangoutsRef.current) {
      setHangoutsWithPhotos(cachedHangoutsRef.current);
      setLoadingHangouts(false);
    } else {
      setLoadingHangouts(true);
      try {
        const response = await api.get('/explore/my-events-with-photos');
        cachedHangoutsRef.current = response || [];
        setHangoutsWithPhotos(response || []);
      } catch (error) {
        console.error('Fetch hangouts error:', error);
        setHangoutsWithPhotos([]);
      } finally {
        setLoadingHangouts(false);
      }
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
      const loc = cachedLocationRef.current || { lat: 0, lng: 0 };
      await fetchFeed(loc);
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
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not process image');
        return;
      }

      setUploadingPhoto(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const photoUrl = `data:image/jpeg;base64,${asset.base64}`;
      
      const uploadResponse = await api.post('/photos', {
        eventId: selectedHangout.id,
        photoUrl,
      });

      if (uploadResponse?.id) {
        cachedHangoutsRef.current = null;
        setSelectedPhoto({
          id: uploadResponse.id,
          photo_url: uploadResponse.photo_url,
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

  const fetchMyPosts = async () => {
    setLoadingMyPosts(true);
    try {
      const response = await api.get('/explore/my-photos');
      setMyPosts(response.photos || []);
    } catch (error) {
      console.error('Fetch my posts error:', error);
    } finally {
      setLoadingMyPosts(false);
    }
  };

  const handleOpenMyPosts = () => {
    setShowMyPostsModal(true);
    fetchMyPosts();
  };

  const fetchSavedPosts = async () => {
    setLoadingSaved(true);
    try {
      const response = await api.get('/explore/saved');
      setSavedPosts(response.posts || []);
    } catch (error) {
      console.error('Fetch saved posts error:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleOpenSaved = () => {
    setShowSavedModal(true);
    fetchSavedPosts();
  };

  const triggerSavedAnimation = useCallback((postId: string) => {
    setAnimatingSaved(prev => new Set(prev).add(postId));
    setTimeout(() => {
      setAnimatingSaved(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }, 1000);
  }, []);

  const handleSavePost = async (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    triggerSavedAnimation(post.id);
    
    try {
      const response = await api.post(`/explore/photos/${post.id}/save`, {});
      
      setAllCategories(prev => prev.map(cat => ({
        ...cat,
        posts: cat.posts.map(p => {
          if (p.id !== post.id) return p;
          return { ...p, isSaved: response.isSaved };
        }),
      })));
      
      if (response.isSaved) {
        setSavedPosts(prev => [{ ...post, isSaved: true }, ...prev.filter(p => p.id !== post.id)]);
      } else {
        setSavedPosts(prev => prev.filter(p => p.id !== post.id));
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleUnsaveFromModal = async (post: ExplorePost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await api.post(`/explore/photos/${post.id}/save`, {});
      
      setSavedPosts(prev => prev.filter(p => p.id !== post.id));
      
      setAllCategories(prev => prev.map(cat => ({
        ...cat,
        posts: cat.posts.map(p => {
          if (p.id !== post.id) return p;
          return { ...p, isSaved: false };
        }),
      })));
    } catch (error) {
      console.error('Unsave error:', error);
    }
  };

  const handleLongPressStart = (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    const postId = post.id;
    longPressFiredRef.current[postId] = false;
    
    if (longPressTimerRef.current[postId]) {
      clearTimeout(longPressTimerRef.current[postId]);
    }
    
    longPressTimerRef.current[postId] = setTimeout(() => {
      longPressFiredRef.current[postId] = true;
      handleSavePost(post, categoryIndex, postIndex);
      longPressTimerRef.current[postId] = null;
    }, 1500);
  };

  const handleLongPressEnd = (postId: string) => {
    if (longPressTimerRef.current[postId]) {
      clearTimeout(longPressTimerRef.current[postId]);
      longPressTimerRef.current[postId] = null;
    }
  };

  const handleCardPress = (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    if (longPressFiredRef.current[post.id]) {
      longPressFiredRef.current[post.id] = false;
      return;
    }
    handleTap(post, categoryIndex, postIndex);
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Remove Post',
      'This will remove your post from Explore. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingPostId(postId);
            try {
              await api.delete(`/explore/photos/${postId}`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setMyPosts(prev => prev.filter(p => p.id !== postId));
              const loc = cachedLocationRef.current || { lat: 0, lng: 0 };
              await fetchFeed(loc);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove post');
            } finally {
              setDeletingPostId(null);
            }
          },
        },
      ]
    );
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

  const triggerHeartAnimation = useCallback((postId: string) => {
    setAnimatingHearts(prev => new Set(prev).add(postId));
    setTimeout(() => {
      setAnimatingHearts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }, 800);
  }, []);

  const handleDoubleTap = async (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    triggerHeartAnimation(post.id);
    
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

  const handleLike = async (post: ExplorePost, categoryIndex: number, postIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    triggerHeartAnimation(post.id);
    
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
    const fullAddress = post.locationAddress || post.locationName;
    onSelectLocation({
      name: fullAddress,
      address: fullAddress,
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
    const showHeart = animatingHearts.has(post.id);
    const showSaved = animatingSaved.has(post.id);
    
    return (
      <View key={post.id} style={[styles.cardWrapper, isPreview && styles.previewCardWrapper]}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.95}
          onPress={() => !isPreview && handleCardPress(post, categoryIndex, postIndex)}
          onPressIn={() => !isPreview && handleLongPressStart(post, categoryIndex, postIndex)}
          onPressOut={() => !isPreview && handleLongPressEnd(post.id)}
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
          
          <HeartOverlay visible={showHeart} />
          <SavedOverlay visible={showSaved} />
          
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
                {!isPreview ? (
                  <TouchableOpacity 
                    style={styles.statItem}
                    onPress={() => handleLike(post, categoryIndex, postIndex)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={post.isLiked ? "heart" : "heart-outline"} 
                      size={18} 
                      color={post.isLiked ? '#FF6B6B' : Colors.white} 
                    />
                    <Text style={styles.statText}>{post.likeCount}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.statItem}>
                    <Ionicons 
                      name={post.isLiked ? "heart" : "heart-outline"} 
                      size={18} 
                      color={post.isLiked ? '#FF6B6B' : Colors.white} 
                    />
                    <Text style={styles.statText}>{post.likeCount}</Text>
                  </View>
                )}
                {!isPreview && (
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={() => handleSavePost(post, categoryIndex, postIndex)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={post.isSaved ? "bookmark" : "bookmark-outline"} 
                      size={18} 
                      color={post.isSaved ? '#8B5CF6' : Colors.white} 
                    />
                  </TouchableOpacity>
                )}
                {post.distance > 0 && (
                  <Text style={styles.distanceText}>{post.distance.toFixed(1)} mi</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const buildDisplayItems = (posts: ExplorePost[]): Array<{ post: ExplorePost; originalIndex: number } | { type: 'ad'; id: string }> => {
    const limitedPosts = posts.slice(0, 5);
    const items: Array<{ post: ExplorePost; originalIndex: number } | { type: 'ad'; id: string }> = [];
    
    limitedPosts.forEach((post, i) => {
      items.push({ post, originalIndex: i });
      if (i === 1 && limitedPosts.length >= 3) {
        items.push({ type: 'ad', id: 'ad-1' });
      }
      if (i === 3 && limitedPosts.length >= 5) {
        items.push({ type: 'ad', id: 'ad-2' });
      }
    });
    
    return items;
  };

  const renderInlineAdCard = (key: string) => (
    <View key={key} style={styles.cardWrapper}>
      <View style={styles.card}>
        <LinearGradient
          colors={[Colors.glassLight, 'rgba(200,220,235,0.9)']}
          style={styles.inlineAdContent}
        >
          <View style={styles.sponsoredBadge}>
            <Ionicons name="megaphone" size={12} color={Colors.white} />
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
          <View style={styles.inlineAdCenter}>
            <Ionicons name="storefront-outline" size={40} color={Colors.secondary} />
            <Text style={styles.inlineAdText}>Ad Space</Text>
            <Text style={styles.inlineAdSubtext}>Your business here</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const renderPaginationDots = (category: string, displayCount: number) => {
    if (displayCount <= 1) return null;
    const activeIndex = activeIndices[category] || 0;
    
    return (
      <View style={styles.dotsContainer}>
        {Array.from({ length: Math.min(displayCount, 7) }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    );
  };

  const renderCategory = (category: CategoryFeed, index: number) => {
    const displayItems = buildDisplayItems(category.posts);
    
    return (
      <View key={category.category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category.category}</Text>
          <View style={styles.categoryCountBadge}>
            <Text style={styles.categoryCount}>{category.posts.length}</Text>
          </View>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.carousel}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
          onScroll={(e) => handleScroll(category.category, e)}
          scrollEventThrottle={16}
        >
          {displayItems.map((item) => {
            if ('type' in item && item.type === 'ad') {
              return renderInlineAdCard(item.id);
            }
            const postItem = item as { post: ExplorePost; originalIndex: number };
            return renderPostCard(postItem.post, index, postItem.originalIndex);
          })}
        </ScrollView>
        
        {renderPaginationDots(category.category, displayItems.length)}
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
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.modalNoteText}>
              Note: By sharing, you share your Hangout location and one image with others. Inappropriate or harmful content will be removed.
            </Text>
          </View>
          
          {hangoutsWithPhotos.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Ionicons name="camera-outline" size={48} color={Colors.primary} />
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
                    <Ionicons name="location-outline" size={14} color={Colors.primary} />
                    <Text style={styles.hangoutLocationText} numberOfLines={1}>
                      {item.location_name || 'No location'}
                    </Text>
                  </View>
                  <Text style={styles.hangoutPhotoCount}>
                    {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (shareStep === 'photos') {
      return (
        <View style={styles.modalContentWrapper}>
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
      isSaved: false,
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
        <Text style={styles.loadingText}>Loading Hangouts Explore...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtonRow}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleOpenShareModal}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.headerButtonText}>Post</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleOpenSaved}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.headerButtonText}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleOpenMyPosts}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={18} color={Colors.primary} />
            <Text style={styles.headerButtonText}>Your Posts</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
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
          <View style={styles.feedContainer}>
            {visibleCategories.map((category, index) => (
              <React.Fragment key={category.category}>
                {renderCategory(category, index)}
                {(index + 1) % AD_INTERVAL === 0 && index < visibleCategories.length - 1 && Platform.OS === 'ios' && (
                  <View style={styles.adContainer}>
                    <BannerAd
                      unitId={EXPLORE_BANNER_AD_UNIT}
                      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                      requestOptions={{
                        requestNonPersonalizedAdsOnly: false,
                      }}
                    />
                  </View>
                )}
              </React.Fragment>
            ))}
            
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => { scrollToTop(); onRefresh(); }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                <Text style={styles.refreshButtonText}>Refresh Feed</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <GlassModal
        visible={showShareModal}
        onClose={handleCloseModal}
        title={getModalTitle()}
        fullHeight
      >
        {renderModalContent()}
      </GlassModal>

      <GlassModal
        visible={showMyPostsModal}
        onClose={() => setShowMyPostsModal(false)}
        title="Your Posts"
        fullHeight
      >
        {loadingMyPosts ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : myPosts.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Ionicons name="images-outline" size={48} color={Colors.primary} />
            <Text style={styles.modalEmptyText}>No posts yet</Text>
            <Text style={styles.modalEmptySubtext}>
              Share your first hangout photo to see it here!
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.myPostsScroll}>
            {myPosts.map((post) => (
              <View key={post.id} style={styles.myPostItem}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.myPostImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.myPostInfo}>
                  <Text style={styles.myPostLocation} numberOfLines={1}>
                    {post.locationName}
                  </Text>
                  <View style={styles.myPostStats}>
                    <Ionicons name="heart" size={14} color="#FF6B6B" />
                    <Text style={styles.myPostLikes}>{post.likeCount}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.myPostDeleteButton}
                  onPress={() => handleDeletePost(post.id)}
                  disabled={deletingPostId === post.id}
                  activeOpacity={0.7}
                >
                  {deletingPostId === post.id ? (
                    <ActivityIndicator size="small" color={Colors.grayMedium} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={Colors.grayMedium} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </GlassModal>

      <GlassModal
        visible={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        title="Saved Posts"
        fullHeight
      >
        {loadingSaved ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : savedPosts.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Ionicons name="bookmark-outline" size={48} color="#8B5CF6" />
            <Text style={styles.modalEmptyText}>No saved posts</Text>
            <Text style={styles.modalEmptySubtext}>
              Hold down on any post for 2 seconds to save it!
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.myPostsScroll}>
            {savedPosts.map((post) => (
              <View key={post.id} style={styles.savedPostItem}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.savedPostImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.savedPostInfo}>
                  <Text style={styles.savedPostLocation} numberOfLines={1}>
                    {post.locationName}
                  </Text>
                  <Text style={styles.savedPostUsername}>by {post.username}</Text>
                  <View style={styles.savedPostStats}>
                    <Ionicons name="heart" size={14} color="#FF6B6B" />
                    <Text style={styles.savedPostLikes}>{post.likeCount}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.savedPostCreateButton}
                  onPress={() => {
                    setShowSavedModal(false);
                    onSelectLocation({
                      name: post.locationName,
                      address: post.locationAddress || '',
                      lat: post.lat,
                      lng: post.lng,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.myPostDeleteButton}
                  onPress={() => handleUnsaveFromModal(post)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.grayMedium} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
  headerButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 8,
    gap: 4,
  },
  headerButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassLight,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 8,
    gap: 4,
  },
  myPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  shareButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  mainScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mainScrollContent: {
    backgroundColor: 'transparent',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
    backgroundColor: 'transparent',
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
  feedContainer: {
    backgroundColor: 'transparent',
  },
  categorySection: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.grayDark,
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
  horizontalScroll: {
    backgroundColor: 'transparent',
  },
  carousel: {
    paddingLeft: 20,
    paddingRight: 4,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.grayLight,
  },
  previewCardWrapper: {
    marginRight: 0,
    alignSelf: 'center',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
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
  savedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#8B5CF6',
    padding: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.grayLight,
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
    backgroundColor: Colors.grayLight,
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
    backgroundColor: 'transparent',
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
  adContainer: {
    marginHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
    backgroundColor: 'transparent',
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
    gap: 8,
  },
  loadMoreText: {
    color: Colors.secondary,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  bottomSpacer: {
    height: 100,
    backgroundColor: 'transparent',
  },
  inlineAdContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayMedium,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  inlineAdCenter: {
    alignItems: 'center',
    gap: 8,
  },
  inlineAdText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.grayDark,
  },
  inlineAdSubtext: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
  },
  modalLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingVertical: 40,
  },
  modalContentWrapper: {
    backgroundColor: 'transparent',
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
    color: Colors.primary,
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
    color: Colors.primary,
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
    color: Colors.primary,
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
    backgroundColor: Colors.grayLight,
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
    color: Colors.primary,
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
  myPostsScroll: {
    backgroundColor: 'transparent',
  },
  myPostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  myPostImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.grayLight,
  },
  myPostInfo: {
    flex: 1,
    gap: 4,
  },
  myPostLocation: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  myPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myPostLikes: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grayDark,
  },
  myPostDeleteButton: {
    padding: 8,
  },
  savedPostCreateButton: {
    padding: 8,
  },
  savedPostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  savedPostImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.grayLight,
  },
  savedPostInfo: {
    flex: 1,
    gap: 4,
  },
  savedPostLocation: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.grayDark,
  },
  savedPostUsername: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
  },
  savedPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  savedPostLikes: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
  },
  saveButton: {
    padding: 4,
    marginLeft: 8,
  },
});
