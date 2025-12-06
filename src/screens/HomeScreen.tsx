import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Platform,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../components/SettingsModal';
import NotificationsModal from '../components/NotificationsModal';
import CreateEventModal from '../components/CreateEventModal';
import EventCard from '../components/EventCard';
import ArchivedEvents from '../components/ArchivedEvents';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'current' | 'archived'>('current');

  const fetchEvents = async () => {
    try {
      const [eventsData, archivedData, unreadData] = await Promise.all([
        api.get('/events'),
        api.get('/events/archived'),
        api.get('/notifications/unread-count'),
      ]);
      setEvents(eventsData);
      setArchivedEvents(archivedData);
      setUnreadCount(unreadData.count);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchEvents();
      }
    });

    const refreshInterval = setInterval(() => {
      fetchEvents();
    }, 5000);

    return () => {
      subscription.remove();
      clearInterval(refreshInterval);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, []);

  // Auto-switch back to current tab when no archived events
  useEffect(() => {
    if (archivedEvents.length === 0 && activeTab === 'archived') {
      setActiveTab('current');
    }
  }, [archivedEvents.length, activeTab]);

  const handleEventCreated = () => {
    setShowCreateEvent(false);
    fetchEvents();
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthStr = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    return { month: monthStr, day };
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/Untitled design (6)_1762746470600_1764548145064.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowSettings(true);
            }}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowNotifications(true);
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.secondary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateEvent(true)}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setActiveTab('current');
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab !== 'current' && archivedEvents.length > 0 && styles.tabTextInactive
            ]}>Your Hangouts</Text>
          </TouchableOpacity>
          {archivedEvents.length > 0 && (
            <>
              <Text style={styles.tabDot}>•</Text>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setActiveTab('archived');
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  activeTab !== 'archived' && styles.tabTextInactive
                ]}>Archived</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {activeTab === 'current' ? (
          events.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color={Colors.secondary} />
              </View>
              <Text style={styles.emptyTitle}>No hangouts yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first hangout to start coordinating plans with friends!
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowCreateEvent(true)}
              >
                <Ionicons name="add" size={20} color={Colors.secondary} />
                <Text style={styles.createFirstButtonText}>Create Your First Hangout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              />
            ))
          )
        ) : (
          <ArchivedEvents
            events={archivedEvents}
            onRefresh={fetchEvents}
          />
        )}
      </ScrollView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <NotificationsModal
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          setUnreadCount(0);
        }}
      />

      <CreateEventModal
        visible={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onCreated={handleEventCreated}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  logo: {
    width: 140,
    height: 40,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: 'Prompt-Bold',
  },
  addButton: {
    backgroundColor: Colors.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  tabText: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  tabTextActive: {
    opacity: 1,
  },
  tabTextInactive: {
    opacity: 0.5,
  },
  tabDot: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 16,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createFirstButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
});
