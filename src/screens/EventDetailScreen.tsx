import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import EventDetailsTab from '../components/EventDetailsTab';
import EventMessagesTab from '../components/EventMessagesTab';
import EventMapTab from '../components/EventMapTab';
import EventPhotosTab from '../components/EventPhotosTab';
import ShareEventModal from '../components/ShareEventModal';
import RidesModal from '../components/RidesModal';
import MoneyModal from '../components/MoneyModal';
import ConflictsModal from '../components/ConflictsModal';
import NotesModal from '../components/NotesModal';

const { width } = Dimensions.get('window');
const TABS = ['details', 'messages', 'map', 'photos'];

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showRides, setShowRides] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

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

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== activeTab) {
      setActiveTab(index);
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
    const date = new Date(dateStr);
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

  if (loading || !event) {
    return (
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.loadingContainer}
      >
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  const gradientColors: [string, string] = event.gradient_color1 && event.gradient_color2
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <View style={styles.header}>
        {event.event_image && (
          <Image
            source={{ uri: event.event_image }}
            style={styles.eventImage}
          />
        )}
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDate}>
              {formatDate(event.event_date)}
            </Text>
            <Text style={styles.eventTime}>{formatTime(event.event_time)}</Text>
          </View>
          {event.isHost && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={Colors.red} />
            </TouchableOpacity>
          )}
        </View>
        
        {event.location_address && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={Colors.gray} />
            <Text style={styles.locationText}>{event.location_address}</Text>
          </View>
        )}

        <View style={styles.attendeesList}>
          {event.attendees?.slice(0, 5).map((attendee: any, index: number) => (
            <View key={attendee.id} style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -10 : 0 }]}>
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
            <View style={[styles.attendeeAvatar, styles.moreAttendees]}>
              <Text style={styles.moreAttendeesText}>+{event.attendees.length - 5}</Text>
            </View>
          )}
          <Text style={styles.attendeeName}>
            {event.attendees?.[0]?.first_name}
            {event.attendees?.length > 1 && ` +${event.attendees.length - 1} more`}
          </Text>
        </View>

        <TouchableOpacity style={styles.conflictsButton} onPress={() => setShowConflicts(true)}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.secondary} />
          <Text style={styles.conflictsButtonText}>Conflicts</Text>
        </TouchableOpacity>

        <View style={styles.categoryButtons}>
          <TouchableOpacity style={styles.categoryButton} onPress={() => setShowRides(true)}>
            <Image
              source={require('../../assets/images/360_F_1516542978_mc3KOajI3kbhFHs8pGvbuUvaK0YHXJT2-removebg-preview_1760856241070_1764548149934.png')}
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryText}>Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton} onPress={() => setShowMoney(true)}>
            <Image
              source={require('../../assets/images/7630510_1756853409509_1764548151597.png')}
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryText}>Money</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
            <TouchableOpacity style={styles.addNotesButton} onPress={() => setShowNotes(true)}>
              <Ionicons name="add" size={14} color={Colors.secondary} />
              <Text style={styles.addNotesText}>Add/View Notes</Text>
            </TouchableOpacity>
          </View>
          
          {event.notes?.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.notesScroll}>
              {event.notes.map((note: any, index: number) => (
                <View
                  key={note.id}
                  style={[
                    styles.stickyNote,
                    { transform: [{ rotate: `${(index % 2 === 0 ? -2 : 2)}deg` }] }
                  ]}
                >
                  <Text style={styles.stickyNoteText}>{note.content}</Text>
                  <Text style={styles.stickyNoteAuthor}>- {note.first_name}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noNotesText}>No notes yet. Tap "Add Note" to create one!</Text>
          )}
        </View>

        <View style={styles.hostSection}>
          <View style={styles.hostInfo}>
            {event.host_photo ? (
              <Image source={{ uri: event.host_photo }} style={styles.hostPhoto} />
            ) : (
              <View style={styles.hostPhotoPlaceholder}>
                <Text style={styles.hostInitial}>{event.host_first_name?.charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.hostLabel}>Host</Text>
              <Text style={styles.hostName}>{event.host_first_name}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.navigationBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.secondary} />
        </TouchableOpacity>
        
        <View style={styles.navPill}>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 0 && styles.navPillItemActive]}
            onPress={() => handleTabChange(0)}
          >
            <Ionicons name="document-text-outline" size={18} color={activeTab === 0 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 1 && styles.navPillItemActive]}
            onPress={() => handleTabChange(1)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={activeTab === 1 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 2 && styles.navPillItemActive]}
            onPress={() => handleTabChange(2)}
          >
            <Ionicons name="map-outline" size={18} color={activeTab === 2 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPillItem, activeTab === 3 && styles.navPillItemActive]}
            onPress={() => handleTabChange(3)}
          >
            <Ionicons name="images-outline" size={18} color={activeTab === 3 ? Colors.primary : Colors.gray} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navButton} onPress={() => setShowShare(true)}>
          <Ionicons name="share-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      <ShareEventModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        eventId={eventId}
      />

      <RidesModal
        visible={showRides}
        onClose={() => setShowRides(false)}
        eventId={eventId}
        attendees={event.attendees}
      />

      <MoneyModal
        visible={showMoney}
        onClose={() => setShowMoney(false)}
        eventId={eventId}
        attendees={event.attendees}
      />

      <ConflictsModal
        visible={showConflicts}
        onClose={() => setShowConflicts(false)}
        eventId={eventId}
        isHost={event.isHost}
        onEventUpdated={fetchEvent}
      />

      <NotesModal
        visible={showNotes}
        onClose={() => setShowNotes(false)}
        eventId={eventId}
        notes={event.notes}
        onNoteAdded={fetchEvent}
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
  loadingText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  header: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 24,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  eventDate: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  eventTime: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  deleteButton: {
    backgroundColor: Colors.redLight,
    padding: 10,
    borderRadius: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
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
    marginTop: 16,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  attendeePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  attendeePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeInitial: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  moreAttendees: {
    backgroundColor: Colors.grayMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  moreAttendeesText: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  attendeeName: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginLeft: 8,
  },
  conflictsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  conflictsButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  categoryText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 8,
  },
  notesSection: {
    marginTop: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNotesText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  notesScroll: {
    flexDirection: 'row',
  },
  stickyNote: {
    backgroundColor: Colors.stickyNote,
    padding: 12,
    borderRadius: 4,
    marginRight: 12,
    width: 140,
    minHeight: 80,
  },
  stickyNoteText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  stickyNoteAuthor: {
    fontSize: 10,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 8,
    textAlign: 'right',
  },
  noNotesText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    fontStyle: 'italic',
  },
  hostSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  hostPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostInitial: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  hostLabel: {
    fontSize: 10,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  hostName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPill: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 4,
  },
  navPillItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navPillItemActive: {
    backgroundColor: Colors.grayLight,
  },
});
