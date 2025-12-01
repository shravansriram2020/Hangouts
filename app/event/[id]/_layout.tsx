import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Slot, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../../constants/theme';
import { EventProvider, useEvent } from '../../../context/EventContext';

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

  const currentTab = pathname.split('/').pop() || 'details';

  const handleTabPress = (tabKey: string) => {
    router.replace(`/event/${id}/${tabKey}`);
  };

  const gradientStart = event?.gradient_color1 || '#E8F4FC';
  const gradientEnd = event?.gradient_color2 || '#B8E0F7';

  if (loading) {
    return (
      <LinearGradient colors={[gradientStart, gradientEnd]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[gradientStart, gradientEnd]} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Slot />
      </View>

      <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.sideButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.secondary} />
        </TouchableOpacity>

        <View style={styles.tabPill}>
          {TABS.map((tab) => {
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

        <TouchableOpacity style={styles.sideButton}>
          <Ionicons name="share-outline" size={22} color={Colors.secondary} />
        </TouchableOpacity>
      </View>
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
