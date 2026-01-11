import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import MoneyModal from './MoneyModal';
import CreateMoneyModal from './CreateMoneyModal';
import ArchivedPhotosModal from './ArchivedPhotosModal';

interface ArchivedEventsProps {
  events: any[];
  onRefresh: () => void;
}

export default function ArchivedEvents({ events, onRefresh }: ArchivedEventsProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [showCreateMoneyModal, setShowCreateMoneyModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [eventAttendees, setEventAttendees] = useState<any[]>([]);

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) {
      return { month: 'TBD', day: '--' };
    }
    
    try {
      let dateString = typeof dateStr === 'string' ? dateStr : dateStr.toString();
      
      const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const monthStr = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        return { month: monthStr, day: parseInt(day) };
      }
      
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        const monthStr = fallbackDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        return { month: monthStr, day: fallbackDate.getDate() };
      }
      
      return { month: 'TBD', day: '--' };
    } catch (error) {
      console.error('Date parsing error:', error, dateStr);
      return { month: 'TBD', day: '--' };
    }
  };

  const handleMoneyPress = async (eventId: string, eventTitle: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setEventAttendees([]);
    setShowMoneyModal(true);
    
    try {
      const eventData = await api.get(`/events/${eventId}`);
      if (eventData && !eventData.error) {
        const attendees = Array.isArray(eventData.attendees) ? eventData.attendees : [];
        setEventAttendees(attendees);
      }
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    }
  };

  const handlePhotosPress = (eventId: string, eventTitle: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setShowPhotosModal(true);
  };

  const handleDeletePress = (eventId: string, eventTitle: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Remove from Archive',
      `Remove "${eventTitle}" from your archived list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/events/${eventId}/permanent`);
              onRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove event');
            }
          },
        },
      ]
    );
  };

  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="archive-outline" size={48} color={Colors.grayMedium} />
        </View>
        <Text style={styles.emptyTitle}>No archived hangouts</Text>
        <Text style={styles.emptyDescription}>
          Past hangouts will appear here so you can still access photos and settle up expenses.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event) => {
        const { month, day } = formatDate(event.event_date);
        
        return (
          <View
            key={event.id}
            style={styles.eventItem}
          >
            <View style={styles.dateBox}>
              <Text style={styles.dateMonth}>{month}</Text>
              <Text style={styles.dateDay}>{day}</Text>
            </View>
            
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleMoneyPress(event.id, event.title)}
              >
                <Ionicons name="cash-outline" size={20} color={Colors.grayMedium} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handlePhotosPress(event.id, event.title)}
              >
                <Ionicons name="images-outline" size={20} color={Colors.grayMedium} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeletePress(event.id, event.title)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.red} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {selectedEventId && (
        <>
          <MoneyModal
            visible={showMoneyModal}
            onClose={() => {
              setShowMoneyModal(false);
              setSelectedEventId(null);
            }}
            eventId={selectedEventId}
            attendees={eventAttendees}
            attendeeCount={eventAttendees.length}
            isArchived={true}
            onCreateClick={() => {
              setShowMoneyModal(false);
              setShowCreateMoneyModal(true);
            }}
          />

          <CreateMoneyModal
            visible={showCreateMoneyModal}
            onClose={() => {
              setShowCreateMoneyModal(false);
              setShowMoneyModal(true);
            }}
            eventId={selectedEventId}
            attendees={eventAttendees}
            onCreated={() => {
              setShowCreateMoneyModal(false);
              setShowMoneyModal(true);
            }}
          />

          <ArchivedPhotosModal
            visible={showPhotosModal}
            onClose={() => {
              setShowPhotosModal(false);
              setSelectedEventId(null);
            }}
            eventId={selectedEventId}
            eventTitle={selectedEventTitle}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
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
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Bold',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  dateBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.grayMedium,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    opacity: 0.7,
  },
  dateMonth: {
    fontSize: 8,
    color: Colors.white,
    fontFamily: 'Prompt-Medium',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Medium',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
