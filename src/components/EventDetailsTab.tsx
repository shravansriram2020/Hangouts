import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

interface Props {
  event: any;
  onOpenRides: () => void;
  onOpenMoney: () => void;
  onOpenConflicts: () => void;
  onOpenNotes: () => void;
  friendIds?: string[];
  onToggleFriend?: (userId: string, isFriend: boolean) => void;
  currentUserId?: string;
}

export default function EventDetailsTab({ event, onOpenRides, onOpenMoney, onOpenConflicts, onOpenNotes, friendIds = [], onToggleFriend, currentUserId }: Props) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.conflictsButton} onPress={onOpenConflicts}>
        <Ionicons name="alert-circle-outline" size={18} color={Colors.secondary} />
        <Text style={styles.conflictsButtonText}>Conflicts</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      <View style={styles.categoryButtons}>
        <TouchableOpacity style={styles.categoryButton} onPress={onOpenRides}>
          <Ionicons name="car-sport" size={32} color={Colors.primary} />
          <Text style={styles.categoryText}>Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryButton} onPress={onOpenMoney}>
          <Ionicons name="cash" size={32} color={Colors.green} />
          <Text style={styles.categoryText}>Money</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.notesSection}>
        <View style={styles.notesHeader}>
          <Text style={styles.notesTitle}>Notes</Text>
          <TouchableOpacity style={styles.addNotesButton} onPress={onOpenNotes}>
            <Ionicons name="add" size={14} color={Colors.secondary} />
            <Text style={styles.addNotesText}>Add/View Notes</Text>
          </TouchableOpacity>
        </View>
        
        {event?.notes?.length > 0 ? (
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
          {event?.host_photo ? (
            <Image source={{ uri: event.host_photo }} style={styles.hostPhoto} />
          ) : (
            <View style={styles.hostPhotoPlaceholder}>
              <Text style={styles.hostInitial}>{event?.host_first_name?.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.hostLabel}>Host</Text>
            <Text style={styles.hostName}>{event?.host_first_name}</Text>
          </View>
        </View>
      </View>

      {event?.location_name && (
        <View style={styles.locationSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <Text style={styles.locationName}>{event.location_name}</Text>
          <Text style={styles.locationAddress}>{event.location_address}</Text>
        </View>
      )}

      <View style={styles.attendeesSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={18} color={Colors.secondary} />
          <Text style={styles.sectionTitle}>Attendees ({event?.attendees?.length || 0})</Text>
        </View>
        <View style={styles.attendeesGrid}>
          {event?.attendees?.map((attendee: any) => {
            const isFriend = friendIds.includes(attendee.user_id);
            const isCurrentUser = attendee.user_id === currentUserId;
            
            return (
              <View key={attendee.id} style={styles.attendeeItem}>
                {attendee.profile_photo ? (
                  <Image source={{ uri: attendee.profile_photo }} style={styles.attendeePhoto} />
                ) : (
                  <View style={styles.attendeePlaceholder}>
                    <Text style={styles.attendeeInitial}>{attendee.first_name?.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.attendeeName}>{attendee.first_name}</Text>
                <Text style={styles.attendeeStatus}>{attendee.invitation_status}</Text>
                {!isCurrentUser && onToggleFriend && (
                  <TouchableOpacity
                    style={styles.friendToggle}
                    onPress={() => onToggleFriend(attendee.user_id, isFriend)}
                  >
                    <Ionicons 
                      name={isFriend ? "heart" : "heart-outline"} 
                      size={18} 
                      color={isFriend ? Colors.red : Colors.grayMedium} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  conflictsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  conflictsButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    marginLeft: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    marginTop: 8,
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
  notesTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-TextBold',
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNotesText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    marginLeft: 4,
  },
  notesScroll: {
    flexDirection: 'row',
  },
  stickyNote: {
    backgroundColor: Colors.stickyYellow,
    padding: 12,
    borderRadius: 4,
    marginRight: 12,
    width: 140,
    minHeight: 80,
  },
  stickyNoteText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
  },
  stickyNoteAuthor: {
    fontSize: 10,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    marginTop: 8,
    textAlign: 'right',
  },
  noNotesText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    fontStyle: 'italic',
  },
  hostSection: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
    fontFamily: 'Agrandir-TextBold',
  },
  hostLabel: {
    fontSize: 10,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
  },
  hostName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-TextBold',
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-TextBold',
    marginLeft: 6,
  },
  locationName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
  },
  locationAddress: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    marginTop: 2,
  },
  attendeesSection: {
    marginBottom: 40,
  },
  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attendeeItem: {
    alignItems: 'center',
    width: 70,
  },
  attendeePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  attendeePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendeeInitial: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: 'Agrandir-TextBold',
  },
  attendeeName: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    textAlign: 'center',
  },
  attendeeStatus: {
    fontSize: 9,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
  },
  friendToggle: {
    marginTop: 4,
    padding: 4,
  },
});
