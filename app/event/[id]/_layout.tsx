import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Slot, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../../constants/theme';
import { EventProvider, useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import LoadingDots from '../../../src/components/LoadingDots';
import ShareModal from '../../../src/components/ShareModal';

const { width } = Dimensions.get('window');

const TABS = [
  { key: 'details', icon: 'document-text-outline', iconFilled: 'document-text' },
  { key: 'messages', icon: 'chatbubble-outline', iconFilled: 'chatbubble' },
  { key: 'map', icon: 'map-outline', iconFilled: 'map' },
  { key: 'photos', icon: 'images-outline', iconFilled: 'images' },
];

function EventLayoutContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { event, loading } = useEvent();
  const { user } = useAuth();

  const [showShareModal, setShowShareModal] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef('details');

  const currentTab = pathname.split('/').pop() || 'details';
  const currentTabIndex = TABS.findIndex(t => t.key === currentTab);

  const userAttendee = event?.attendees?.find(a => a.id === user?.id);
  const attendeesLoaded = event?.attendees !== undefined && event.attendees.length >= 0;
  const isHost = event?.isHost === true;
  const isAttending = isHost || userAttendee?.status === 'accepted';
  const hasRSVPd = userAttendee?.status === 'accepted' || userAttendee?.status === 'maybe';
  const canShare = isHost || (hasRSVPd && event?.allow_attendee_sharing !== false);
  const restrictedTabs = ['messages', 'map', 'photos'];

  useEffect(() => {
    if (!loading && event && attendeesLoaded && !isHost && !isAttending && restrictedTabs.includes(currentTab)) {
      Alert.alert(
        'RSVP Required',
        'You need to confirm your attendance to access this feature.',
        [{ text: 'OK', onPress: () => router.replace(`/event/${id}/details`) }]
      );
    }
  }, [loading, event, attendeesLoaded, isHost, isAttending, currentTab]);

  useEffect(() => {
    const prevIndex = TABS.findIndex(t => t.key === prevTabRef.current);
    const newIndex = currentTabIndex;
    
    if (prevIndex !== newIndex) {
      const direction = newIndex > prevIndex ? 1 : -1;
      
      slideAnim.setValue(direction * 30);
      bounceAnim.setValue(0.95);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]).start();
    }
    
    prevTabRef.current = currentTab;
  }, [currentTab]);

  const handleTabPress = (tabKey: string) => {
    if (tabKey !== currentTab) {
      if (restrictedTabs.includes(tabKey) && attendeesLoaded && !isHost && !isAttending) {
        Alert.alert(
          'RSVP Required',
          'Please confirm your attendance on the Details tab to access this feature.'
        );
        return;
      }
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.replace(`/event/${id}/${tabKey}`);
    }
  };

  const handleShare = async () => {
    setShowShareModal(true);
  };

  const gradientStart = event?.gradient_color1 || '#E8F4FC';
  const gradientEnd = event?.gradient_color2 || '#B8E0F7';

  if (loading) {
    return (
      <LinearGradient colors={[gradientStart, gradientEnd]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingDots size={14} />
          <Text style={styles.loadingText}>Loading Hangout...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[gradientStart, gradientEnd]} style={styles.container}>
      <Animated.View 
        style={[
          styles.content, 
          { 
            paddingTop: insets.top,
            transform: [
              { translateX: slideAnim },
              { scale: bounceAnim },
            ],
            opacity: bounceAnim.interpolate({
              inputRange: [0.95, 1],
              outputRange: [0.8, 1],
            }),
          }
        ]}
      >
        <Slot />
      </Animated.View>

      <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.sideButton} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.secondary} />
        </TouchableOpacity>

        <View style={styles.tabPill}>
          {TABS.map((tab, index) => {
            const isActive = currentTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => handleTabPress(tab.key)}
              >
                <Ionicons
                  name={isActive ? tab.iconFilled as any : tab.icon as any}
                  size={22}
                  color={isActive ? Colors.secondary : Colors.gray}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {canShare ? (
          <TouchableOpacity style={styles.sideButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.secondary} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.sideButton, { opacity: 0 }]} />
        )}
      </View>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventId={id || ''}
        eventTitle={event?.title || 'Event'}
      />
    </LinearGradient>
  );
}

export default function EventLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <EventProvider eventId={id || ''}>
      <EventLayoutContent />
    </EventProvider>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
