import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  eventId: string;
  eventLocation: {
    lat: number;
    lng: number;
    address: string;
  } | null;
}

export default function EventMapTab({ eventId, eventLocation }: Props) {
  const { user } = useAuth();
  const [attendeeLocations, setAttendeeLocations] = useState<any[]>([]);
  const [locationSharing, setLocationSharing] = useState(false);
  const [isOnMyWay, setIsOnMyWay] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchAttendeeLocations();
      const interval = setInterval(fetchAttendeeLocations, 10000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  useEffect(() => {
    if (locationSharing) {
      startLocationUpdates();
    }
  }, [locationSharing]);

  const fetchAttendeeLocations = async () => {
    if (!eventId) return;
    try {
      const data = await api.get(`/location/attendees/${eventId}`);
      setAttendeeLocations(data);
    } catch (error) {
      console.error('Failed to fetch attendee locations:', error);
    }
  };

  const startLocationUpdates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationSharing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      await api.put('/location/update', {
        eventId,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        isOnMyWay,
      });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const toggleLocationSharing = async (value: boolean) => {
    if (value && !user?.locationEnabled) {
      return;
    }
    
    try {
      await api.put('/location/toggle-sharing', {
        eventId,
        sharing: value,
      });
      setLocationSharing(value);
    } catch (error: any) {
      setLocationSharing(false);
      console.error('Toggle sharing error:', error);
    }
  };

  const handleMarkOnMyWay = async () => {
    const newValue = !isOnMyWay;
    setIsOnMyWay(newValue);
    
    if (currentLocation) {
      try {
        await api.put('/location/update', {
          eventId,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          isOnMyWay: newValue,
        });
      } catch (error) {
        console.error('Update location error:', error);
      }
    }
  };

  const sharingCount = attendeeLocations.filter(a => a.location_sharing).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={18} color={Colors.secondary} />
          <Text style={styles.sharingCount}>{sharingCount} sharing</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.shareLabel, !user?.locationEnabled && styles.disabledLabel]}>
            {user?.locationEnabled ? 'Share my location' : 'Location disabled in Settings'}
          </Text>
          <Switch
            value={locationSharing}
            onValueChange={toggleLocationSharing}
            trackColor={{ false: Colors.grayLight, true: Colors.greenLight }}
            thumbColor={locationSharing ? Colors.green : Colors.grayMedium}
            disabled={!user?.locationEnabled}
          />
        </View>
      </View>

      {locationSharing && (
        <TouchableOpacity
          style={[styles.onMyWayButton, isOnMyWay && styles.onMyWayButtonActive]}
          onPress={handleMarkOnMyWay}
        >
          <Ionicons name="navigate" size={18} color={Colors.white} />
          <Text style={styles.onMyWayButtonText}>
            {isOnMyWay ? "You're On Your Way!" : 'Mark as On My Way'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.mapPlaceholder}>
        <View style={styles.mapContent}>
          {eventLocation && (
            <View style={styles.eventPin}>
              <Ionicons name="location" size={32} color={Colors.red} />
              <Text style={styles.eventPinLabel}>Event Location</Text>
            </View>
          )}

          {attendeeLocations.map((attendee) => (
            <TouchableOpacity
              key={attendee.id}
              style={styles.attendeeMarker}
              onPress={() => setSelectedAttendee(
                selectedAttendee?.id === attendee.id ? null : attendee
              )}
            >
              {attendee.is_on_my_way ? (
                <Text style={styles.carEmoji}>🚗</Text>
              ) : attendee.profile_photo ? (
                <Image source={{ uri: attendee.profile_photo }} style={styles.markerPhoto} />
              ) : (
                <View style={styles.markerPlaceholder}>
                  <Text style={styles.markerInitial}>{attendee.first_name?.charAt(0)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
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
                  <Text style={styles.carEmoji}>🚗</Text>
                  <Text style={styles.onMyWayBadgeText}>On my way</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSelectedAttendee(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Your location is being shared in real-time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharingCount: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginRight: 8,
  },
  disabledLabel: {
    color: Colors.gray,
    fontSize: 12,
  },
  onMyWayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  onMyWayButtonActive: {
    backgroundColor: Colors.primary,
  },
  onMyWayButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventPin: {
    alignItems: 'center',
  },
  eventPinLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  attendeeMarker: {
    position: 'absolute',
  },
  carEmoji: {
    fontSize: 24,
  },
  markerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.green,
  },
  markerPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.green,
  },
  markerInitial: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
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
  },
  attendeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeCardPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  attendeeCardPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeCardInitial: {
    fontSize: 20,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  attendeeCardInfo: {
    flex: 1,
  },
  attendeeCardName: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  onMyWayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onMyWayBadgeText: {
    fontSize: 12,
    color: Colors.green,
    fontFamily: 'Prompt-Regular',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: Colors.green,
    fontFamily: 'Prompt-Regular',
  },
});
