import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import RidesModal from '../../../src/components/RidesModal';
import MoneyModal from '../../../src/components/MoneyModal';
import ConflictsModal from '../../../src/components/ConflictsModal';
import NotesModal from '../../../src/components/NotesModal';
import LoadingDots from '../../../src/components/LoadingDots';

const STICKY_COLORS = [
  Colors.stickyYellow,
  Colors.stickyPink,
  Colors.stickyBlue,
  Colors.stickyGreen,
  Colors.stickyOrange,
  Colors.stickyPurple,
];

export default function DetailsScreen() {
  const { event, loading, error, refreshEvent } = useEvent();
  const { user } = useAuth();
  
  const [showRides, setShowRides] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (event?.id) {
      fetchConflictCount();
    }
  }, [event?.id]);

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

  return (
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

      <View style={styles.attendeesSection}>
        {event.attendees && event.attendees.length > 0 && (
          <View style={styles.attendeesRow}>
            {event.attendees.slice(0, 5).map((attendee: any, index: number) => (
              <View key={attendee.id} style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -12 : 0, zIndex: 5 - index }]}>
                {attendee.profile_photo ? (
                  <Image source={{ uri: attendee.profile_photo }} style={styles.attendeePhoto} />
                ) : (
                  <View style={styles.attendeePlaceholder}>
                    <Text style={styles.attendeeInitial}>{attendee.first_name?.charAt(0)}</Text>
                  </View>
                )}
              </View>
            ))}
            <Text style={styles.attendeeCount}>
              {event.attendee_count || event.attendees.length} attending
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionCardsRow}>
        <TouchableOpacity 
          style={styles.actionCardContainer}
          onPress={() => setShowRides(true)}
        >
          <BlurView intensity={60} tint="light" style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionEmoji}>🚗</Text>
              <Text style={styles.actionLabel}>Rides</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCardContainer}
          onPress={() => setShowMoney(true)}
        >
          <BlurView intensity={60} tint="light" style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionEmoji}>💵</Text>
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

      <TouchableOpacity 
        style={styles.notesHeaderContainer}
        onPress={() => setShowNotes(true)}
      >
        <BlurView intensity={60} tint="light" style={styles.notesHeaderCard}>
          <View style={styles.notesHeaderContent}>
            <Ionicons name="document-text-outline" size={18} color={Colors.secondary} />
            <Text style={styles.addNotesText}>Add/View Notes</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </View>
        </BlurView>
      </TouchableOpacity>

      {event.notes && Array.isArray(event.notes) && event.notes.length > 0 && (
        <View style={styles.notesGrid}>
          {event.notes.slice(0, 4).map((note: any, index: number) => (
            <View 
              key={note.id} 
              style={[
                styles.stickyNote, 
                { backgroundColor: STICKY_COLORS[index % STICKY_COLORS.length] }
              ]}
            >
              <Text style={styles.stickyNoteText} numberOfLines={4}>{note.content}</Text>
              <Text style={styles.stickyNoteAuthor}>- {note.first_name || 'Anonymous'}</Text>
            </View>
          ))}
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
          <View>
            <Text style={styles.hostLabel}>Host</Text>
            <Text style={styles.hostName}>{event.host_first_name}</Text>
          </View>
        </View>
      </BlurView>

      <RidesModal
        visible={showRides}
        onClose={() => setShowRides(false)}
        eventId={event.id}
      />
      <MoneyModal
        visible={showMoney}
        onClose={() => setShowMoney(false)}
        eventId={event.id}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 16,
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
  attendeesSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
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
    fontSize: 14,
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  attendeeCount: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: Fonts.medium,
    marginLeft: 12,
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
  actionCardContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  conflictsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
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
  notesHeaderContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  notesHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  notesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  addNotesText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginLeft: 4,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  stickyNote: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stickyNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    lineHeight: 18,
  },
  stickyNoteAuthor: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.grayDark,
    textAlign: 'right',
    marginTop: 4,
  },
  hostCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 24,
  },
  hostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  hostLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  hostName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
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
});
