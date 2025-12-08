import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';

interface Props {
  eventId: string;
  eventLocation: {
    lat: number;
    lng: number;
    address: string;
  } | null;
}

interface AttendeeLocation {
  id: string;
  user_id: string;
  first_name: string;
  profile_photo: string | null;
  lat: number | null;
  lng: number | null;
  is_on_my_way: boolean;
}

interface RouteInfo {
  distance: string;
  duration: number;
}

export default function EventMapTab({ eventId, eventLocation }: Props) {
  const [attendees, setAttendees] = useState<AttendeeLocation[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchAttendees();
    }
  }, [eventId]);

  const fetchAttendees = async () => {
    if (!eventId) return;
    try {
      const data = await api.get(`/events/${eventId}/attendees-locations`);
      setAttendees(data || []);
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    }
  };

  const handleAttendeePress = async (attendee: AttendeeLocation) => {
    if (selectedAttendee?.id === attendee.id) {
      return;
    }

    setSelectedAttendee(attendee);
    setRouteInfo(null);

    if (attendee.lat !== null && attendee.lng !== null && eventLocation) {
      setLoadingRoute(true);
      try {
        const route = await api.get(
          `/location/route?fromLat=${attendee.lat}&fromLng=${attendee.lng}&toLat=${eventLocation.lat}&toLng=${eventLocation.lng}`
        );
        if (route.distance && route.duration) {
          setRouteInfo({
            distance: route.distance,
            duration: route.duration,
          });
        }
      } catch (error) {
        console.error('Failed to get route:', error);
      } finally {
        setLoadingRoute(false);
      }
    }
  };

  const closeAttendeeCard = () => {
    setSelectedAttendee(null);
    setRouteInfo(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={Colors.secondary} />
        <Text style={styles.headerText}>{attendees.length} attendees</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <View style={styles.mapContent}>
          {eventLocation && (
            <View style={styles.eventPin}>
              <Ionicons name="location" size={32} color={Colors.red} />
              <Text style={styles.eventPinLabel}>Event Location</Text>
            </View>
          )}

          <View style={styles.attendeesGrid}>
            {attendees.map((attendee) => (
              <TouchableOpacity
                key={attendee.id}
                style={[
                  styles.attendeeMarker,
                  selectedAttendee?.id === attendee.id && styles.attendeeMarkerSelected,
                ]}
                onPress={() => handleAttendeePress(attendee)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {attendee.is_on_my_way ? (
                  <View style={styles.carMarker}>
                    <Text style={styles.carEmoji}>🚗</Text>
                  </View>
                ) : attendee.profile_photo ? (
                  <Image source={{ uri: attendee.profile_photo }} style={styles.markerPhoto} />
                ) : (
                  <View style={styles.markerPlaceholder}>
                    <Text style={styles.markerInitial}>{attendee.first_name?.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.markerName} numberOfLines={1}>
                  {attendee.first_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton}>
            <Ionicons name="add" size={20} color={Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton}>
            <Ionicons name="remove" size={20} color={Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton}>
            <Ionicons name="navigate" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {selectedAttendee && (
        <View style={styles.attendeeCard}>
          <TouchableOpacity style={styles.closeCardButton} onPress={closeAttendeeCard}>
            <Ionicons name="close" size={20} color={Colors.gray} />
          </TouchableOpacity>
          <View style={styles.attendeeCardContent}>
            {selectedAttendee.profile_photo ? (
              <Image source={{ uri: selectedAttendee.profile_photo }} style={styles.attendeeCardPhoto} />
            ) : (
              <View style={styles.attendeeCardPhotoPlaceholder}>
                <Text style={styles.attendeeCardInitial}>
                  {selectedAttendee.first_name?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.attendeeCardInfo}>
              <Text style={styles.attendeeCardName}>{selectedAttendee.first_name}</Text>
              {selectedAttendee.is_on_my_way && (
                <View style={styles.onMyWayBadge}>
                  <Text style={styles.carEmojiSmall}>🚗</Text>
                  <Text style={styles.onMyWayBadgeText}>On their way</Text>
                </View>
              )}
              {loadingRoute ? (
                <View style={styles.etaRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.etaLoadingText}>Calculating ETA...</Text>
                </View>
              ) : routeInfo ? (
                <View style={styles.etaRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.etaText}>
                    {routeInfo.duration} min • {routeInfo.distance} mi away
                  </Text>
                </View>
              ) : selectedAttendee.lat !== null && selectedAttendee.lng !== null ? null : (
                <Text style={styles.noLocationText}>Location not available</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {!selectedAttendee && attendees.length > 0 && (
        <View style={styles.hintContainer}>
          <Ionicons name="hand-left-outline" size={16} color={Colors.gray} />
          <Text style={styles.hintText}>Tap an attendee to see their ETA</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapContent: {
    flex: 1,
    padding: 16,
  },
  eventPin: {
    alignItems: 'center',
    marginBottom: 20,
  },
  eventPinLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  attendeeMarker: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.white,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendeeMarkerSelected: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  carMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.green,
  },
  carEmoji: {
    fontSize: 24,
  },
  carEmojiSmall: {
    fontSize: 14,
  },
  markerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  markerPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  markerInitial: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  markerName: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 4,
    maxWidth: 60,
    textAlign: 'center',
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  mapControlButton: {
    width: 36,
    height: 36,
    backgroundColor: Colors.white,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendeeCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  closeCardButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 6,
    backgroundColor: Colors.grayLight,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeCardPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  attendeeCardPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  attendeeCardInitial: {
    fontSize: 22,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  attendeeCardInfo: {
    flex: 1,
  },
  attendeeCardName: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  onMyWayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onMyWayBadgeText: {
    fontSize: 13,
    color: Colors.green,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  etaText: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  etaLoadingText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 8,
  },
  noLocationText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  hintText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 6,
  },
});
