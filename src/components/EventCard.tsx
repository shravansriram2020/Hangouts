import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const DATE_BOX_COLORS = ['#D54848', '#FFE14D', '#24B1C5'];

const getColorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % DATE_BOX_COLORS.length;
  return DATE_BOX_COLORS[index];
};

interface EventCardProps {
  event: any;
  onPress: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) {
      return { month: 'TBD', day: '--' };
    }
    
    try {
      // Handle different date formats from PostgreSQL
      let dateString = typeof dateStr === 'string' ? dateStr : dateStr.toString();
      
      // Extract just the date part (handles both "2025-12-05" and "2025-12-05T00:00:00.000Z")
      const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const monthStr = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        return { month: monthStr, day: parseInt(day) };
      }
      
      // Fallback: try parsing as Date object
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

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const { month, day } = formatDate(event.event_date);
  const isHost = event.isHost;
  
  const dateBoxColor = useMemo(() => {
    return getColorFromId(event.id || 'default');
  }, [event.id]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <BlurView intensity={60} tint="light" style={styles.blurContainer}>
        <View style={styles.cardContent}>
          <View style={[styles.dateBox, { backgroundColor: dateBoxColor }]}>
            <Text style={styles.dateMonth}>{month}</Text>
            <Text style={styles.dateDay}>{day}</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
              {isHost && (
                <View style={styles.hostBadge}>
                  <Ionicons name="ribbon-outline" size={12} color={Colors.secondary} />
                  <Text style={styles.hostText}>Host</Text>
                </View>
              )}
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={Colors.gray} />
                <Text style={styles.detailText}>{formatTime(event.event_time)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={Colors.gray} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {event.location_address || event.location_name || 'TBD'}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              {event.attendees && event.attendees.length > 0 ? (
                <View style={styles.attendeesRow}>
                  {event.attendees.slice(0, 3).map((attendee: any, index: number) => (
                    <View key={attendee.id} style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index }]}>
                      {attendee.profile_photo ? (
                        <Image source={{ uri: attendee.profile_photo }} style={styles.attendeePhoto} />
                      ) : (
                        <View style={[styles.attendeePlaceholder, { backgroundColor: Colors.primary }]}>
                          <Text style={styles.attendeeInitial}>{attendee.first_name?.charAt(0)}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  <Text style={styles.attendeeCount}>{event.attendee_count || event.attendees.length} attending</Text>
                </View>
              ) : (
                <View style={styles.attendeesRow}>
                  <Ionicons name="people-outline" size={14} color={Colors.gray} />
                  <Text style={styles.attendeeCount}>{event.attendee_count || 1} attending</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: 'Agrandir-TextBold',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 20,
    color: Colors.white,
    fontFamily: 'Agrandir-TextBold',
    marginTop: -2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Agrandir-TextBold',
    flex: 1,
    marginRight: 8,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  hostText: {
    fontSize: 10,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    marginLeft: 3,
  },
  details: {
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    marginLeft: 4,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  },
  attendeeInitial: {
    fontSize: 9,
    color: Colors.white,
    fontFamily: 'Agrandir-TextBold',
  },
  attendeeCount: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    marginLeft: 6,
  },
});
