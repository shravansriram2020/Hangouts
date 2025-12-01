import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

interface ArchivedEventsProps {
  events: any[];
  onEventPress: (eventId: string) => void;
}

export default function ArchivedEvents({ events, onEventPress }: ArchivedEventsProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return { month, day };
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={18} color={Colors.secondary} />
          <Text style={styles.headerTitle}>Archived Hangouts ({events.length})</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {events.map((event) => {
            const { month, day } = formatDate(event.event_date);
            
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventItem}
                onPress={() => onEventPress(event.id)}
              >
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>{month}</Text>
                  <Text style={styles.dateDay}>{day}</Text>
                </View>
                
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  
                  {event.photo_count > 0 && (
                    <TouchableOpacity style={styles.photosSection}>
                      <Ionicons name="camera-outline" size={14} color={Colors.gray} />
                      <Text style={styles.photosText}>Photos ({event.photo_count})</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.gray} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="download-outline" size={18} color={Colors.gray} />
                    <Text style={styles.actionText}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={Colors.red} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  content: {
    marginTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  dateBox: {
    width: 44,
    height: 44,
    backgroundColor: Colors.grayMedium,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 9,
    color: Colors.white,
    fontFamily: 'Prompt-Medium',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 18,
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
  photosSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  photosText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
});
