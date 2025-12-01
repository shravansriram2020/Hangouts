import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY || 'zUUGC9Ij9Lzy8ONgq1wZhes4ajz4vn6z';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AttendeeLocation {
  user_id: string;
  user_name: string;
  profile_image?: string;
  lat: number;
  lng: number;
  is_on_my_way: boolean;
  updated_at: string;
  distance?: string;
  eta?: number;
}

interface RouteData {
  userId: string;
  distance: string;
  duration: number;
  points: { latitude: number; longitude: number }[];
}

const ROUTE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function MapScreen() {
  const { event } = useEvent();
  const { user } = useAuth();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  const [locationSharing, setLocationSharing] = useState(false);
  const [isOnMyWay, setIsOnMyWay] = useState(false);
  const [sharingCount, setSharingCount] = useState(0);
  const [attendeeLocations, setAttendeeLocations] = useState<AttendeeLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [onMyWayList, setOnMyWayList] = useState<AttendeeLocation[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [myRoute, setMyRoute] = useState<RouteData | null>(null);

  const gradientColors = useMemo(() => {
    return event?.gradient_color1 && event?.gradient_color2 
      ? [event.gradient_color1, event.gradient_color2]
      : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];
  }, [event?.gradient_color1, event?.gradient_color2]);

  const eventLat = event?.location_lat || 34.15791;
  const eventLng = event?.location_lng || -118.634725;

  const initialRegion = useMemo(() => ({
    latitude: eventLat,
    longitude: eventLng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }), [eventLat, eventLng]);

  useEffect(() => {
    if (event?.id) {
      loadLocationSharingState();
      fetchAttendeeLocations();
      const interval = setInterval(fetchAttendeeLocations, 10000);
      return () => clearInterval(interval);
    }
  }, [event?.id]);

  useEffect(() => {
    if (locationSharing) {
      startLocationUpdates();
    } else {
      stopLocationUpdates();
    }
    return () => stopLocationUpdates();
  }, [locationSharing, isOnMyWay]);

  const loadLocationSharingState = async () => {
    if (!event?.id) return;
    try {
      const savedState = await AsyncStorage.getItem(`location_sharing_${event.id}`);
      if (savedState !== null) {
        const state = JSON.parse(savedState);
        setLocationSharing(state.sharing);
        setIsOnMyWay(state.isOnMyWay);
      }
    } catch (error) {
      console.error('Load state error:', error);
    }
  };

  const saveLocationSharingState = async (sharing: boolean, onMyWay: boolean) => {
    if (!event?.id) return;
    try {
      await AsyncStorage.setItem(`location_sharing_${event.id}`, JSON.stringify({
        sharing,
        isOnMyWay: onMyWay,
      }));
    } catch (error) {
      console.error('Save state error:', error);
    }
  };

  const fetchAttendeeLocations = useCallback(async () => {
    if (!event?.id) return;
    try {
      const data = await api.get(`/location/attendees/${event.id}`);
      
      const locationsWithDistance = await Promise.all(
        data.map(async (attendee: AttendeeLocation) => {
          if (attendee.lat && attendee.lng && attendee.is_on_my_way) {
            try {
              const routeRes = await fetch(
                `https://api.tomtom.com/routing/1/calculateRoute/${attendee.lat},${attendee.lng}:${eventLat},${eventLng}/json?key=${TOMTOM_API_KEY}`
              );
              const routeData = await routeRes.json();
              if (routeData.routes?.[0]?.summary) {
                const summary = routeData.routes[0].summary;
                const distanceKm = summary.lengthInMeters / 1000;
                const distanceMiles = (distanceKm * 0.621371).toFixed(1);
                return {
                  ...attendee,
                  distance: distanceMiles,
                  eta: Math.round(summary.travelTimeInSeconds / 60),
                };
              }
            } catch (e) {
              console.log('Route calc error:', e);
            }
          }
          return attendee;
        })
      );
      
      setAttendeeLocations(locationsWithDistance);
      setSharingCount(locationsWithDistance.filter((a: AttendeeLocation) => a.lat && a.lng).length);
      setOnMyWayList(locationsWithDistance.filter((a: AttendeeLocation) => a.is_on_my_way && a.lat && a.lng));
      
      const newRoutes: RouteData[] = [];
      for (const attendee of locationsWithDistance.filter((a: AttendeeLocation) => a.is_on_my_way && a.lat && a.lng)) {
        try {
          const routeRes = await fetch(
            `https://api.tomtom.com/routing/1/calculateRoute/${attendee.lat},${attendee.lng}:${eventLat},${eventLng}/json?key=${TOMTOM_API_KEY}&routeRepresentation=polyline`
          );
          const routeData = await routeRes.json();
          if (routeData.routes?.[0]?.legs?.[0]?.points) {
            const points = routeData.routes[0].legs[0].points.map((p: any) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }));
            newRoutes.push({
              userId: attendee.user_id,
              distance: attendee.distance || '0',
              duration: attendee.eta || 0,
              points,
            });
          }
        } catch (e) {
          console.log('Route fetch error:', e);
        }
      }
      setRoutes(newRoutes);
    } catch (error) {
      console.error('Fetch locations error:', error);
    }
  }, [event?.id, eventLat, eventLng]);

  const startLocationUpdates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setLocationSharing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setCurrentLocation(coords);
      await updateLocationOnServer(coords.lat, coords.lng);

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        async (newLocation) => {
          const newCoords = {
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);
          await updateLocationOnServer(newCoords.lat, newCoords.lng);
        }
      );
    } catch (error) {
      console.error('Location error:', error);
      setLocationSharing(false);
    }
  };

  const stopLocationUpdates = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const updateLocationOnServer = async (lat: number, lng: number) => {
    if (!event?.id) return;
    try {
      await api.put('/location/update', {
        eventId: event.id,
        lat,
        lng,
        isOnMyWay,
      });
    } catch (error) {
      console.error('Update location error:', error);
    }
  };

  const toggleLocationSharing = async (value: boolean) => {
    setLocationSharing(value);
    saveLocationSharingState(value, isOnMyWay);
    try {
      await api.put('/location/toggle-sharing', {
        eventId: event?.id,
        sharing: value,
      });
      if (!value) {
        setTimeout(fetchAttendeeLocations, 500);
      }
    } catch (error) {
      console.error('Toggle sharing error:', error);
    }
  };

  const handleMarkOnMyWay = async () => {
    const newValue = !isOnMyWay;
    setIsOnMyWay(newValue);
    saveLocationSharingState(locationSharing, newValue);
    
    if (!locationSharing && newValue) {
      setLocationSharing(true);
      saveLocationSharingState(true, newValue);
    }
    
    try {
      await api.put('/location/on-my-way', {
        eventId: event?.id,
        isOnMyWay: newValue,
      });
      fetchAttendeeLocations();
    } catch (error) {
      console.error('On my way error:', error);
    }
  };

  const formatETA = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const locationSharingAttendees = attendeeLocations.filter(a => a.lat && a.lng && a.user_id !== user?.id);

  const renderFallbackMap = () => {
    const mapWidth = Math.min(Math.round(SCREEN_WIDTH * 2), 1024);
    const mapHeight = 400;
    const mapUrl = `https://api.tomtom.com/map/1/staticimage?key=${TOMTOM_API_KEY}&center=${eventLng},${eventLat}&zoom=14&width=${mapWidth}&height=${mapHeight}&format=png`;

    return (
      <View style={styles.fallbackContainer}>
        <Image 
          source={{ uri: mapUrl }} 
          style={styles.fallbackImage}
          resizeMode="cover"
        />
        <View style={styles.fallbackOverlay}>
          <View style={styles.eventMarkerContainer}>
            <View style={styles.eventMarker}>
              <Ionicons name="location" size={20} color="white" />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMap = () => {
    return renderFallbackMap();
  };

  return (
    <LinearGradient colors={gradientColors as [string, string]} style={styles.container}>
      <View style={styles.mapContainer}>
        {renderMap()}
        
        <View style={styles.mapInfoCard}>
          <Text style={styles.mapTitle}>{event?.title || 'Event Location'}</Text>
          <Text style={styles.mapSubtitle}>{event?.location_name || ''}</Text>
        </View>

        {onMyWayList.length > 0 && (
          <View style={styles.onMyWayIndicator}>
            <Ionicons name="car" size={14} color="white" />
            <Text style={styles.onMyWayIndicatorText}>{onMyWayList.length} on the way</Text>
          </View>
        )}
      </View>

      {locationSharingAttendees.length > 0 && (
        <View style={styles.attendeesSection}>
          <View style={styles.attendeesSectionHeader}>
            <Ionicons name="location" size={16} color={Colors.secondary} />
            <Text style={styles.attendeesSectionTitle}>Live Locations ({locationSharingAttendees.length})</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attendeesScroll}
          >
            {locationSharingAttendees.map((attendee) => (
              <View key={attendee.user_id} style={styles.attendeeCard}>
                <View style={[styles.attendeeAvatarWrapper, attendee.is_on_my_way && styles.attendeeAvatarOnMyWay]}>
                  {attendee.profile_image ? (
                    <Image source={{ uri: attendee.profile_image }} style={styles.attendeeAvatar} />
                  ) : (
                    <View style={styles.attendeeAvatarPlaceholder}>
                      <Text style={styles.attendeeAvatarText}>{attendee.user_name?.charAt(0) || '?'}</Text>
                    </View>
                  )}
                  {attendee.is_on_my_way && (
                    <View style={styles.onMyWayBadgeSmall}>
                      <Ionicons name="car" size={8} color="white" />
                    </View>
                  )}
                </View>
                <Text style={styles.attendeeName} numberOfLines={1}>{attendee.user_name?.split(' ')[0]}</Text>
                {attendee.distance && (
                  <Text style={styles.attendeeDistance}>{attendee.distance} mi</Text>
                )}
                {attendee.eta && attendee.is_on_my_way && (
                  <Text style={styles.attendeeEta}>{formatETA(attendee.eta)}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.sharingToggle}>
          <View style={styles.sharingInfo}>
            <Ionicons 
              name={locationSharing ? "location" : "location-outline"} 
              size={20} 
              color={locationSharing ? "#10B981" : Colors.secondary} 
            />
            <Text style={styles.sharingText}>Share my location</Text>
          </View>
          <Switch
            value={locationSharing}
            onValueChange={toggleLocationSharing}
            trackColor={{ false: Colors.grayLight, true: '#10B981' }}
            thumbColor="white"
          />
        </View>

        {locationSharing && (
          <View style={styles.sharingStatus}>
            <Text style={styles.sharingStatusText}>
              {sharingCount} {sharingCount === 1 ? 'person' : 'people'} sharing location
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.onMyWayButton, isOnMyWay && styles.onMyWayButtonActive]}
          onPress={handleMarkOnMyWay}
        >
          <Ionicons 
            name="car" 
            size={20} 
            color={isOnMyWay ? "white" : Colors.secondary} 
          />
          <Text style={[styles.onMyWayButtonText, isOnMyWay && styles.onMyWayButtonTextActive]}>
            {isOnMyWay ? "I'm On My Way!" : "Mark as On My Way"}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16,
    marginBottom: 8,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
  },
  fallbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackInfo: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  eventMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  userMarkerPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInitial: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  attendeeMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeMarkerOnMyWay: {
    transform: [{ scale: 1.1 }],
  },
  attendeeMarkerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  attendeeMarkerPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeMarkerInitial: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  onMyWayBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 2,
  },
  calloutDistance: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  calloutEta: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#10B981',
    marginTop: 2,
  },
  mapInfoCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  mapTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  mapSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 2,
  },
  onMyWayIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  onMyWayIndicatorText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  attendeesSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  attendeesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  attendeesSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  attendeesScroll: {
    paddingRight: 16,
  },
  attendeeCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  attendeeAvatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  attendeeAvatarOnMyWay: {
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 24,
    padding: 2,
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  attendeeAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeAvatarText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  onMyWayBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  attendeeName: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    textAlign: 'center',
  },
  attendeeDistance: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  attendeeEta: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#10B981',
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sharingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 14,
  },
  sharingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sharingText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  sharingStatus: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sharingStatusText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  onMyWayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  onMyWayButtonActive: {
    backgroundColor: '#10B981',
  },
  onMyWayButtonText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  onMyWayButtonTextActive: {
    color: 'white',
  },
});
