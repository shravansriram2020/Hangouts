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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import RidesModal from '../../../src/components/RidesModal';
import MoneyModal from '../../../src/components/MoneyModal';
import ConflictsModal from '../../../src/components/ConflictsModal';
import NotesModal from '../../../src/components/NotesModal';
import LoadingDots from '../../../src/components/LoadingDots';
import OptionsMenu from '../../../src/components/OptionsMenu';
import RSVPButtons from '../../../src/components/RSVPButtons';
import CreateRideModal from '../../../src/components/CreateRideModal';
import CreateMoneyModal from '../../../src/components/CreateMoneyModal';
import CreateConflictsModal from '../../../src/components/CreateConflictsModal';

const STICKY_COLORS = [
  Colors.stickyYellow,
  Colors.stickyPink,
  Colors.stickyBlue,
  Colors.stickyGreen,
  Colors.stickyOrange,
  Colors.stickyPurple,
];

const ridesImage = require('../../../attached_assets/360_F_1516542978_mc3KOajI3kbhFHs8pGvbuUvaK0YHXJT2-removebg-preview_1760856241070_1764566858022.png');
const moneyImage = require('../../../attached_assets/7630510_1756853409509_1764566858022.png');

export default function DetailsScreen() {
  const { event, loading, error, refreshEvent } = useEvent();
  const { user } = useAuth();
  const router = useRouter();
  
  const [showRides, setShowRides] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [showCreateMoney, setShowCreateMoney] = useState(false);
  const [showCreateConflicts, setShowCreateConflicts] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);

  useEffect(() => {
    if (event?.id) {
      fetchConflictCount();
      fetchUserStatus();
    }
  }, [event?.id]);

  const fetchUserStatus = async () => {
    if (!event?.id) return;
    try {
      const response = await api.get(`/events/${event.id}/user-status`);
      const { status } = response.data || response;
      setUserStatus(status);
    } catch (error) {
      console.error('Failed to fetch user status:', error);
      setUserStatus(null);
    }
  };

  const handleRSVPChange = (status: string | null, removed?: boolean) => {
    if (removed) {
      router.replace('/');
    } else {
      setUserStatus(status);
      refreshEvent();
    }
  };

  const fetchConflictCount = async () => {
    if (!event?.id) return;
    try {
      const conflicts = await api.get(`/conflicts/event/${event.id}`);
      const unresolvedCount = conflicts.filter((c: any) => !c.is_resolved).length;
      setConflictCount(unresolvedCount);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    }
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
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const attendeeCount = event?.attendees?.length || 0;

  const updateGradient = async (color1: string, color2: string) => {
    try {
      await api.put(`/events/${event?.id}`, {
        gradientColor1: color1,
        gradientColor2: color2,
      });
      refreshEvent();
    } catch (error) {
      Alert.alert('Error', 'Failed to update background');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LoadingDots size={14} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.red} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshEvent}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.gray} />
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const isHost = event.host_id === user?.id;

  const gradientColors = event?.gradient_color1 && event?.gradient_color2 
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  const isGradientDark = (colors: string[]) => {
    const getLuminance = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    const avgLuminance = colors.reduce((sum, c) => sum + getLuminance(c), 0) / colors.length;
    return avgLuminance < 0.5;
  };

  const isDark = isGradientDark(gradientColors);
  const textColor = isDark ? Colors.white : Colors.secondary;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <BlurView intensity={60} tint="light" style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.eventImageContainer}>
              {event.event_image ? (
                <Image source={{ uri: event.event_image }} style={styles.eventImage} />
              ) : (
                <View style={styles.eventImagePlaceholder}>
                  <Ionicons name="calendar" size={40} color={Colors.secondary} />
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDateTime}>
                {formatDate(event.event_date)}{'\n'}{formatTime(event.event_time)}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.gray} />
            <Text style={styles.locationText}>
              {event.location_address || event.location_name || 'Location TBD'}
            </Text>
          </View>
        </View>
      </BlurView>

      <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Attending</Text>
      <View style={styles.attendeesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attendeesContent}
        >
          {event.attendees && event.attendees.length > 0 ? (
            event.attendees.map((attendee: any) => (
              <View key={attendee.id} style={styles.attendeeItem}>
                <View style={styles.attendeeAvatar}>
                  {attendee.profile_photo ? (
                    <Image source={{ uri: attendee.profile_photo }} style={styles.attendeePhoto} />
                  ) : (
                    <View style={styles.attendeePlaceholder}>
                      <Text style={styles.attendeeInitial}>{attendee.first_name?.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.attendeeName, isDark && styles.textLight]} numberOfLines={1}>{attendee.first_name}</Text>
              </View>
            ))
          ) : (
            <View style={styles.attendeeItem}>
              <View style={styles.attendeeAvatar}>
                <View style={styles.attendeePlaceholder}>
                  <Text style={styles.attendeeInitial}>?</Text>
                </View>
              </View>
              <Text style={[styles.attendeeName, isDark && styles.textLight]}>No attendees</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {!isHost && (
        <RSVPButtons
          eventId={event.id}
          currentStatus={userStatus}
          isHost={isHost}
          onStatusChanged={handleRSVPChange}
        />
      )}

      <View style={styles.actionCardsRow}>
        <TouchableOpacity 
          style={styles.actionCardContainer}
          onPress={() => {
            if (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') {
              Alert.alert('RSVP Required', 'Please RSVP to use Rides.');
              return;
            }
            setShowRides(true);
          }}
        >
          <BlurView intensity={60} tint="light" style={[styles.actionCard, (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') && styles.actionCardDisabled]}>
            <View style={styles.actionCardContent}>
              <Image source={ridesImage} style={styles.actionImage} />
              <Text style={styles.actionLabel}>Rides</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCardContainer}
          onPress={() => {
            if (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') {
              Alert.alert('RSVP Required', 'Please RSVP to use Money.');
              return;
            }
            setShowMoney(true);
          }}
        >
          <BlurView intensity={60} tint="light" style={[styles.actionCard, (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') && styles.actionCardDisabled]}>
            <View style={styles.actionCardContent}>
              <Image source={moneyImage} style={styles.actionImage} />
              <Text style={styles.actionLabel}>Money</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.conflictsContainer}
        onPress={() => setShowConflicts(true)}
      >
        <BlurView intensity={60} tint="light" style={styles.conflictsCard}>
          <View style={styles.conflictsContent}>
            <Ionicons name="warning-outline" size={18} color={Colors.secondary} />
            <Text style={styles.conflictsButtonText}>Conflicts</Text>
            {conflictCount > 0 && (
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictBadgeText}>{conflictCount}</Text>
              </View>
            )}
          </View>
        </BlurView>
      </TouchableOpacity>

      {event.notes && Array.isArray(event.notes) && event.notes.length > 0 && (
        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Text style={[styles.notesSectionTitle, isDark && styles.textLight]}>Notes</Text>
            <TouchableOpacity 
              style={styles.addNotesButton}
              onPress={() => {
                if (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') {
                  Alert.alert('RSVP Required', 'Please RSVP to use Notes.');
                  return;
                }
                setShowNotes(true);
              }}
            >
              <Ionicons name="add" size={16} color={isDark ? Colors.white : Colors.secondary} />
              <Text style={[styles.addNotesText, isDark && styles.textLight]}>Add/View</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.notesScrollContent}
          >
            {event.notes.map((note: any, index: number) => {
              const rotation = (index % 2 === 0 ? -3 : 3) + Math.random() * 2 - 1;
              return (
                <View 
                  key={note.id} 
                  style={[
                    styles.stickyNote, 
                    { 
                      backgroundColor: STICKY_COLORS[index % STICKY_COLORS.length],
                      transform: [{ rotate: `${rotation}deg` }],
                    }
                  ]}
                >
                  <Text style={styles.stickyNoteText} numberOfLines={5}>{note.content}</Text>
                  <Text style={styles.stickyNoteAuthor}>- {note.first_name || 'Anonymous'}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {(!event.notes || event.notes.length === 0) && (
        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Text style={[styles.notesSectionTitle, isDark && styles.textLight]}>Notes</Text>
            <TouchableOpacity 
              style={styles.addNotesButton}
              onPress={() => {
                if (!isHost && userStatus !== 'accepted' && userStatus !== 'maybe') {
                  Alert.alert('RSVP Required', 'Please RSVP to use Notes.');
                  return;
                }
                setShowNotes(true);
              }}
            >
              <Ionicons name="add" size={16} color={isDark ? Colors.white : Colors.secondary} />
              <Text style={[styles.addNotesText, isDark && styles.textLight]}>Add/View</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyNotesPlaceholder}>
            <Text style={[styles.emptyNotesPlaceholderText, isDark && styles.textLightMuted]}>No Notes Yet</Text>
          </View>
        </View>
      )}

      <BlurView intensity={60} tint="light" style={styles.hostCard}>
        <View style={styles.hostContent}>
          <View style={styles.hostAvatar}>
            {event.host_photo ? (
              <Image source={{ uri: event.host_photo }} style={styles.hostAvatarImage} />
            ) : (
              <View style={styles.hostAvatarPlaceholder}>
                <Text style={styles.hostAvatarInitial}>
                  {event.host_first_name?.charAt(0).toUpperCase() || 'H'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.hostInfo}>
            <Text style={styles.hostLabel}>HOST</Text>
            <Text style={styles.hostName}>{event.host_first_name}</Text>
          </View>
          {isHost && (
            <TouchableOpacity 
              style={styles.hostOptionsButton}
              onPress={() => setShowOptions(true)}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      <View style={styles.bottomSpacer} />

      <RidesModal
        visible={showRides}
        onClose={() => setShowRides(false)}
        eventId={event.id}
        onCreateClick={() => {
          setShowRides(false);
          setShowCreateRide(true);
        }}
      />
      <MoneyModal
        visible={showMoney}
        onClose={() => setShowMoney(false)}
        eventId={event.id}
        onCreateClick={() => {
          setShowMoney(false);
          setShowCreateMoney(true);
        }}
        attendeeCount={attendeeCount}
      />
      <CreateRideModal
        visible={showCreateRide}
        onClose={() => setShowCreateRide(false)}
        eventId={event.id}
        onCreated={refreshEvent}
      />
      <CreateMoneyModal
        visible={showCreateMoney}
        onClose={() => setShowCreateMoney(false)}
        eventId={event.id}
        attendees={event.attendees || []}
        onCreated={refreshEvent}
      />
      <CreateConflictsModal
        visible={showCreateConflicts}
        onClose={() => setShowCreateConflicts(false)}
        eventId={event.id}
        onCreated={() => {
          fetchConflictCount();
          refreshEvent();
        }}
      />
      <ConflictsModal
        visible={showConflicts}
        onClose={() => setShowConflicts(false)}
        eventId={event.id}
        isHost={event.isHost}
        onConflictUpdate={fetchConflictCount}
      />
      <NotesModal
        visible={showNotes}
        onClose={() => setShowNotes(false)}
        eventId={event.id}
        notes={event.notes || []}
        onNoteAdded={refreshEvent}
      />
      <OptionsMenu
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        eventId={event.id}
        isHost={isHost}
        attendees={event.attendees || []}
        onEventDeleted={() => router.replace('/')}
        onAttendeeRemoved={refreshEvent}
        onGradientChange={(color1, color2) => updateGradient(color1, color2)}
        onTitleChange={() => refreshEvent()}
        currentTitle={event.title}
      />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
  },
  headerContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  eventImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.glassMedium,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
    marginBottom: 4,
  },
  eventDateTime: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginLeft: 6,
  },
  hostCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
  },
  hostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  hostAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  hostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  hostAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarInitial: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  hostInfo: {
    flex: 1,
  },
  hostLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.gray,
    letterSpacing: 1,
  },
  hostName: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  attendeesContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  attendeesContent: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  attendeeItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  attendeeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  attendeePhoto: {
    width: '100%',
    height: '100%',
  },
  attendeePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
  },
  attendeeInitial: {
    fontSize: 20,
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  attendeeName: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    textAlign: 'center',
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionCardContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionCardContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  actionImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  conflictsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  conflictsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  conflictsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  conflictsButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  conflictBadge: {
    backgroundColor: Colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  conflictBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  notesSection: {
    marginBottom: 16,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  notesSectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addNotesText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  notesScrollContent: {
    paddingLeft: 4,
    paddingRight: 16,
  },
  stickyNote: {
    width: 150,
    height: 140,
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  stickyNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    lineHeight: 16,
  },
  stickyNoteAuthor: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.grayDark,
    textAlign: 'right',
    marginTop: 4,
  },
  emptyNotesPlaceholder: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotesPlaceholderText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.red,
  },
  textLight: {
    color: Colors.white,
  },
  textLightMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
