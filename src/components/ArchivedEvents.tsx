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
import ArchivedPhotosModal from './ArchivedPhotosModal';

interface ArchivedEventsProps {
  events: any[];
  onRefresh: () => void;
}

export default function ArchivedEvents({ events, onRefresh }: ArchivedEventsProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');

  if (events.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return { month, day };
  };

  const handleToggle = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(!expanded);
  };

  const handleMoneyPress = (eventId: string, eventTitle: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setShowMoneyModal(true);
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="archive-outline" size={18} color={Colors.grayMedium} />
          <Text style={styles.headerTitle}>Archived Hangouts ({events.length})</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.grayMedium}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
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
        </View>
      )}

      {selectedEventId && (
        <>
          <MoneyModal
            visible={showMoneyModal}
            onClose={() => {
              setShowMoneyModal(false);
              setSelectedEventId(null);
            }}
            eventId={selectedEventId}
            attendees={[]}
            attendeeCount={0}
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
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 14,
    borderRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  content: {
    marginTop: 8,
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
