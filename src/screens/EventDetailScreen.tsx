import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import EventDetailsTab from '../components/EventDetailsTab';
import EventMessagesTab from '../components/EventMessagesTab';
import EventPhotosTab from '../components/EventPhotosTab';
import ShareEventModal from '../components/ShareEventModal';
import RidesModal from '../components/RidesModal';
import MoneyModal from '../components/MoneyModal';
import ConflictsModal from '../components/ConflictsModal';
import NotesModal from '../components/NotesModal';
import CreateRideModal from '../components/CreateRideModal';
import CreateMoneyModal from '../components/CreateMoneyModal';
import LoadingDots from '../components/LoadingDots';

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user } = useAuth();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showRides, setShowRides] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [showCreateMoney, setShowCreateMoney] = useState(false);
  const [ridesKey, setRidesKey] = useState(0);
  const [moneyKey, setMoneyKey] = useState(0);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    fetchEvent();
    fetchFriends();
  }, [eventId]);

  const fetchFriends = async () => {
    try {
      const friends = await api.get('/users/friends');
      setFriendIds(friends.map((f: any) => f.id));
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const handleToggleFriend = async (userId: string, isFriend: boolean) => {
    try {
      if (isFriend) {
        await api.delete(`/users/friends/${userId}`);
        setFriendIds(friendIds.filter(id => id !== userId));
      } else {
        await api.post(`/users/friends/${userId}`, {});
        setFriendIds([...friendIds, userId]);
      }
    } catch (error) {
      console.error('Failed to toggle friend:', error);
      Alert.alert('Error', 'Failed to update friend status');
    }
  };

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/events/${eventId}`);
      setEvent(data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      Alert.alert('Error', 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const refreshEvent = async () => {
    try {
      const data = await api.get(`/events/${eventId}`);
      setEvent(data);
    } catch (error) {
      console.error('Failed to refresh event:', error);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this hangout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/events/${eventId}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <EventDetailsTab
            event={event}
            onOpenRides={() => setShowRides(true)}
            onOpenMoney={() => setShowMoney(true)}
            onOpenConflicts={() => setShowConflicts(true)}
            onOpenNotes={() => setShowNotes(true)}
            friendIds={friendIds}
            onToggleFriend={handleToggleFriend}
            currentUserId={user?.id}
          />
        );
      case 1:
        return <EventMessagesTab eventId={eventId} onConflictPress={() => setShowConflicts(true)} />;
      case 2:
        return <EventPhotosTab eventId={eventId} />;
      default:
        return null;
    }
  };

  if (loading || !event) {
    return (
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.loadingContainer}
      >
        <LoadingDots size={70} showText={true} />
      </LinearGradient>
    );
  }

  const gradientColors: [string, string] = event.gradient_color1 && event.gradient_color2
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={Colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => setShowShare(true)}>
              <Ionicons name="share-outline" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.eventHeader}>
            {event.event_image && (
              <Image
                source={{ uri: event.event_image }}
                style={styles.eventImage}
              />
            )}
            <View style={styles.headerContent}>
              <View style={styles.headerInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDateTime}>
                  {formatDate(event.event_date)} at {formatTime(event.event_time)}
                </Text>
              </View>
              {event.isHost && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color={Colors.red} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {event.location_address && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.gray} />
              <Text style={styles.locationText}>{event.location_address}</Text>
            </View>
          )}

          <View style={styles.attendeesList}>
            {event.attendees?.slice(0, 5).map((attendee: any, index: number) => (
              <View key={attendee.id} style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -10 : 0, zIndex: 5 - index }]}>
                {attendee.profile_photo ? (
                  <Image source={{ uri: attendee.profile_photo }} style={styles.attendeePhoto} />
                ) : (
                  <View style={styles.attendeePlaceholder}>
                    <Text style={styles.attendeeInitial}>
                      {attendee.first_name?.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {event.attendees?.length > 5 && (
              <View style={[styles.attendeeAvatar, styles.moreAttendees, { marginLeft: -10 }]}>
                <Text style={styles.moreAttendeesText}>+{event.attendees.length - 5}</Text>
              </View>
            )}
            <Text style={styles.attendeeCount}>
              {event.attendees?.length || 1} attending
            </Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          {renderTabContent()}
        </View>
      </ScrollView>

      <View style={styles.navigationBar}>
        <View style={styles.navPill}>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 0 && styles.navPillItemActive]}
            onPress={() => setActiveTab(0)}
          >
            <Ionicons name="document-text-outline" size={20} color={activeTab === 0 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 1 && styles.navPillItemActive]}
            onPress={() => setActiveTab(1)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={activeTab === 1 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 2 && styles.navPillItemActive]}
            onPress={() => setActiveTab(2)}
          >
            <Ionicons name="images-outline" size={20} color={activeTab === 2 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <ShareEventModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        eventId={eventId}
        userStatus={event.attendees?.find((a: any) => a.id === user?.id)?.status}
        isHost={event.isHost}
      />

      <RidesModal
        key={ridesKey}
        visible={showRides}
        onClose={() => setShowRides(false)}
        eventId={eventId}
        attendees={event.attendees}
        onCreateClick={() => setShowCreateRide(true)}
      />

      <CreateRideModal
        visible={showCreateRide}
        onClose={() => setShowCreateRide(false)}
        eventId={eventId}
        onCreated={() => {
          setShowCreateRide(false);
          setTimeout(() => setRidesKey(k => k + 1), 300);
        }}
      />

      <MoneyModal
        key={moneyKey}
        visible={showMoney}
        onClose={() => setShowMoney(false)}
        eventId={eventId}
        attendees={event.attendees}
        onCreateClick={() => setShowCreateMoney(true)}
        attendeeCount={event.attendees?.length || 0}
      />

      <CreateMoneyModal
        visible={showCreateMoney}
        onClose={() => setShowCreateMoney(false)}
        eventId={eventId}
        attendees={event.attendees || []}
        onCreated={() => {
          setShowCreateMoney(false);
          setTimeout(() => setMoneyKey(k => k + 1), 300);
        }}
      />

      <ConflictsModal
        visible={showConflicts}
        onClose={() => setShowConflicts(false)}
        eventId={eventId}
        eventTitle={event.title}
        isHost={event.isHost}
        onEventUpdated={refreshEvent}
        eventLocation={event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null}
      />

      <NotesModal
        visible={showNotes}
        onClose={() => setShowNotes(false)}
        eventId={eventId}
        notes={event.notes}
        onNoteAdded={refreshEvent}
      />
    </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 14,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 22,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  eventDateTime: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: Colors.redLight,
    padding: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  locationText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 4,
    flex: 1,
  },
  attendeesList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  attendeePhoto: {
    width: '100%',
    height: '100%',
  },
  attendeePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeInitial: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  moreAttendees: {
    backgroundColor: Colors.grayMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAttendeesText: {
    fontSize: 9,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  attendeeCount: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginLeft: 10,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
    paddingBottom: 100,
  },
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  navPill: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  navPillItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
  },
  navPillItemActive: {
    backgroundColor: Colors.grayLight,
  },
});
