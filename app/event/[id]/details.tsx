import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import RidesModal from '../../../src/components/RidesModal';
import MoneyModal from '../../../src/components/MoneyModal';
import ConflictsModal from '../../../src/components/ConflictsModal';
import NotesModal from '../../../src/components/NotesModal';

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
        <ActivityIndicator size="large" color={Colors.primary} />
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
      <View style={styles.mainCard}>
        <View style={styles.headerRow}>
          <View style={styles.eventImageContainer}>
            {event.event_image ? (
              <Image source={{ uri: event.event_image }} style={styles.eventImage} />
            ) : (
              <View style={styles.eventImagePlaceholder}>
                <Ionicons name="calendar" size={40} color={Colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDateTime}>
              {formatDate(event.event_date)}{'\n'}{formatTime(event.event_time)}
            </Text>
          </View>
          <TouchableOpacity style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.red} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={Colors.gray} />
          <Text style={styles.locationText}>
            {event.location_address}
            {event.location_lat && event.location_lng && (
              `\n(${event.location_lat}, ${event.location_lng})`
            )}
          </Text>
        </View>

        <View style={styles.hostSection}>
          <View style={styles.hostAvatar}>
            {event.host_photo ? (
              <Image source={{ uri: event.host_photo }} style={styles.hostAvatarImage} />
            ) : (
              <Text style={styles.hostAvatarInitial}>
                {event.host_first_name?.charAt(0).toUpperCase() || 'H'}
              </Text>
            )}
          </View>
          <Text style={styles.hostName}>{event.host_first_name || 'Host'}</Text>
        </View>

        <TouchableOpacity 
          style={styles.conflictsButton}
          onPress={() => setShowConflicts(true)}
        >
          <Ionicons name="warning-outline" size={18} color={Colors.secondary} />
          <Text style={styles.conflictsButtonText}>Conflicts</Text>
          {conflictCount > 0 && (
            <View style={styles.conflictBadge}>
              <Text style={styles.conflictBadgeText}>{conflictCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.actionCardsRow}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowRides(true)}
          >
            <Text style={styles.actionEmoji}>🚗</Text>
            <Text style={styles.actionLabel}>Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowMoney(true)}
          >
            <Text style={styles.actionEmoji}>💵</Text>
            <Text style={styles.actionLabel}>Money</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesLabel}>Notes</Text>
            <TouchableOpacity 
              style={styles.addNotesButton}
              onPress={() => setShowNotes(true)}
            >
              <Ionicons name="add" size={16} color={Colors.secondary} />
              <Text style={styles.addNotesText}>Add/View Notes</Text>
            </TouchableOpacity>
          </View>
          
          {event.notes && Array.isArray(event.notes) && event.notes.length > 0 ? (
            event.notes.slice(0, 2).map((note: any) => (
              <View key={note.id} style={styles.stickyNote}>
                <Text style={styles.stickyNoteText}>{note.content}</Text>
                <Text style={styles.stickyNoteAuthor}>- {note.first_name || 'Anonymous'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noNotesText}>
              No notes yet. Tap "Add Note" to create one!
            </Text>
          )}
        </View>

        <View style={styles.hostFooter}>
          <View style={styles.hostFooterAvatar}>
            {event.host_photo ? (
              <Image source={{ uri: event.host_photo }} style={styles.hostFooterAvatarImage} />
            ) : (
              <View style={styles.hostFooterAvatarPlaceholder}>
                <Text style={styles.hostFooterAvatarInitial}>
                  {event.host_first_name?.charAt(0).toUpperCase() || 'H'}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.hostFooterLabel}>Host</Text>
            <Text style={styles.hostFooterName}>{event.host_first_name}</Text>
          </View>
        </View>
      </View>

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
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  eventImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
    marginBottom: 4,
  },
  eventDateTime: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    lineHeight: 20,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingLeft: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginLeft: 8,
    lineHeight: 20,
  },
  hostSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  hostAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  hostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  hostAvatarInitial: {
    fontSize: 24,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  hostName: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  conflictsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(200, 230, 255, 0.5)',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNotesText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  stickyNote: {
    backgroundColor: '#FEF08A',
    borderRadius: 8,
    padding: 16,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stickyNoteText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    marginBottom: 8,
  },
  stickyNoteAuthor: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    textAlign: 'right',
  },
  noNotesText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  hostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  hostFooterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  hostFooterAvatarImage: {
    width: '100%',
    height: '100%',
  },
  hostFooterAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostFooterAvatarInitial: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  hostFooterLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  hostFooterName: {
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
