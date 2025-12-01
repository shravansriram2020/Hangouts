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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let Callout: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Callout = Maps.Callout;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView;

const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY || 'zUUGC9Ij9Lzy8ONgq1wZhes4ajz4vn6z';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  const [locationSharing, setLocationSharing] = useState(false);
  const [isOnMyWay, setIsOnMyWay] = useState(false);
  const [sharingCount, setSharingCount] = useState(0);
  const [attendeeLocations, setAttendeeLocations] = useState<AttendeeLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [onMyWayList, setOnMyWayList] = useState<AttendeeLocation[]>([]);
  const [showOnMyWayPanel, setShowOnMyWayPanel] = useState(false);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [myRoute, setMyRoute] = useState<RouteData | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeLocation | null>(null);

  const isEventDay = useMemo(() => {
    if (!event?.event_date) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const eventDateStr = event.event_date.split('T')[0];
    return todayStr === eventDateStr;
  }, [event?.event_date]);

  const gradientColors = event?.gradient_color1 && event?.gradient_color2 
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  const eventLat = event?.location_lat || 34.15791;
  const eventLng = event?.location_lng || -118.634725;

  useEffect(() => {
    if (event?.id) {
      loadLocationSharingState();
      fetchAttendeeLocations();
      const interval = setInterval(fetchAttendeeLocations, 10000);
      return () => clearInterval(interval);
    }
  }, [event?.id]);

  const loadLocationSharingState = async () => {
    if (!event?.id) return;
    try {
      const savedState = await AsyncStorage.getItem(`location_sharing_${event.id}`);
      if (savedState !== null) {
        const state = JSON.parse(savedState);
        setLocationSharing(state.sharing);
        setIsOnMyWay(state.isOnMyWay);
        if (state.sharing) {
          toggleLocationSharing(true);
        }
      }
    } catch (error) {
      console.error('Failed to load location sharing state:', error);
    }
  };

  const saveLocationSharingState = async (sharing: boolean, onMyWay: boolean) => {
    if (!event?.id) return;
    try {
      await AsyncStorage.setItem(
        `location_sharing_${event.id}`,
        JSON.stringify({ sharing, isOnMyWay: onMyWay })
      );
    } catch (error) {
      console.error('Failed to save location sharing state:', error);
    }
  };

  useEffect(() => {
    if (locationSharing) {
      startContinuousLocationUpdates();
    } else {
      stopLocationUpdates();
    }
    
    return () => {
      stopLocationUpdates();
    };
  }, [locationSharing, isOnMyWay]);

  const fetchAttendeeLocations = useCallback(async () => {
    if (!event?.id) return;
    try {
      const data = await api.get(`/location/attendees/${event.id}`);
      
      const onMyWayAttendees = data.filter((a: AttendeeLocation) => a.is_on_my_way && a.lat && a.lng);
      
      if (onMyWayAttendees.length > 0 && event?.location_lat && event?.location_lng) {
        const routePromises = onMyWayAttendees.map(async (attendee: AttendeeLocation) => {
          try {
            const routeData = await api.get(
              `/location/route?fromLat=${attendee.lat}&fromLng=${attendee.lng}&toLat=${event.location_lat}&toLng=${event.location_lng}`
            );
            return {
              ...attendee,
              distance: routeData.distance,
              eta: routeData.duration,
              routePoints: routeData.points?.map((p: any) => ({
                latitude: p.latitude,
                longitude: p.longitude,
              })) || [],
            };
          } catch {
            return attendee;
          }
        });
        
        const attendeesWithRoutes = await Promise.all(routePromises);
        const mergedData = data.map((a: AttendeeLocation) => {
          const withRoute = attendeesWithRoutes.find((ar: any) => ar.user_id === a.user_id);
          return withRoute || a;
        });
        
        setAttendeeLocations(mergedData);
        
        const routeData = attendeesWithRoutes
          .filter((a: any) => a.routePoints?.length > 0)
          .map((a: any, index: number) => ({
            userId: a.user_id,
            distance: a.distance,
            duration: a.eta,
            points: a.routePoints,
            color: ROUTE_COLORS[index % ROUTE_COLORS.length],
          }));
        setRoutes(routeData);
      } else {
        setAttendeeLocations(data);
      }
      
      setSharingCount(data.filter((a: AttendeeLocation) => a.lat && a.lng).length);
      setOnMyWayList(data.filter((a: AttendeeLocation) => a.is_on_my_way));
    } catch (error) {
      console.error('Failed to fetch attendee locations:', error);
    }
  }, [event?.id, event?.location_lat, event?.location_lng]);

  const fetchMyRoute = useCallback(async () => {
    if (!currentLocation || !event?.location_lat || !event?.location_lng) return;
    try {
      const routeData = await api.get(
        `/location/route?fromLat=${currentLocation.lat}&fromLng=${currentLocation.lng}&toLat=${event.location_lat}&toLng=${event.location_lng}`
      );
      setMyRoute({
        userId: user?.id || '',
        distance: routeData.distance,
        duration: routeData.duration,
        points: routeData.points?.map((p: any) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })) || [],
      });
    } catch (error) {
      console.error('Failed to fetch my route:', error);
    }
  }, [currentLocation, event?.location_lat, event?.location_lng, user?.id]);

  useEffect(() => {
    if (currentLocation && isOnMyWay) {
      fetchMyRoute();
    } else {
      setMyRoute(null);
    }
  }, [currentLocation, isOnMyWay, fetchMyRoute]);

  const startContinuousLocationUpdates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationSharing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setCurrentLocation(coords);
      await updateLocationOnServer(coords.lat, coords.lng);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
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
        fetchAttendeeLocations();
      }
    } catch (error) {
      console.error('Toggle sharing error:', error);
    }
  };

  const handleMarkOnMyWay = async () => {
    const newValue = !isOnMyWay;
    setIsOnMyWay(newValue);
    saveLocationSharingState(locationSharing || !locationSharing, newValue);
    
    if (!locationSharing) {
      setLocationSharing(true);
      toggleLocationSharing(true);
    }
    
    if (currentLocation) {
      await updateLocationOnServer(currentLocation.lat, currentLocation.lng);
    }
    
    fetchAttendeeLocations();
  };

  const centerOnEvent = () => {
    mapRef.current?.animateToRegion({
      latitude: eventLat,
      longitude: eventLng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  const formatETA = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderWebMap = () => {
    const mapUrl = `https://api.tomtom.com/map/1/staticimage?key=${TOMTOM_API_KEY}&center=${eventLng},${eventLat}&zoom=14&width=800&height=600&format=png`;
    
    return (
      <View style={styles.webMapContainer}>
        <Image 
          source={{ uri: mapUrl }} 
          style={styles.webMapImage}
          resizeMode="cover"
        />
        <View style={styles.webMapOverlay}>
          <View style={styles.eventMarkerWeb}>
            <View style={styles.eventMarkerInner} />
          </View>
        </View>
        <View style={styles.webMapInfo}>
          <Text style={styles.webMapTitle}>{event?.title || 'Event Location'}</Text>
          <Text style={styles.webMapSubtitle}>{event?.location_name || ''}</Text>
        </View>
        {onMyWayList.length > 0 && (
          <View style={styles.webOnMyWayList}>
            <Text style={styles.webOnMyWayTitle}>{onMyWayList.length} on the way:</Text>
            {onMyWayList.map((a, i) => (
              <Text key={a.user_id || `attendee-${i}`} style={styles.webOnMyWayName}>
                {a.user_name} {a.distance ? `(${a.distance} mi)` : ''}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderNativeMap = () => {
    if (!MapView) return null;
    
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: eventLat,
          longitude: eventLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{ latitude: eventLat, longitude: eventLng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.eventMarker}>
            <View style={styles.eventMarkerInner} />
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{event?.title || 'Event'}</Text>
              <Text style={styles.calloutSubtitle}>{event?.location_name || ''}</Text>
            </View>
          </Callout>
        </Marker>

        {attendeeLocations
          .filter(a => a.lat && a.lng && a.user_id !== user?.id)
          .map((attendee) => (
            <Marker
              key={attendee.user_id}
              coordinate={{ latitude: attendee.lat, longitude: attendee.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setSelectedAttendee(attendee)}
            >
              <View style={[
                styles.attendeeMarker,
                attendee.is_on_my_way && styles.attendeeMarkerOnMyWay
              ]}>
                {attendee.profile_image ? (
                  <Image source={{ uri: attendee.profile_image }} style={styles.attendeeMarkerImage} />
                ) : (
                  <Text style={styles.attendeeMarkerText}>
                    {attendee.user_name?.charAt(0) || '?'}
                  </Text>
                )}
              </View>
              <Callout tooltip>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutName}>{attendee.user_name}</Text>
                  {attendee.is_on_my_way && attendee.distance && (
                    <>
                        <Text style={styles.calloutDistance}>{attendee.distance} miles away</Text>
                        {attendee.eta && (
                          <Text style={styles.calloutETA}>ETA: {formatETA(attendee.eta)}</Text>
                        )}
                      </>
                    )}
                    {!attendee.is_on_my_way && (
                      <Text style={styles.calloutStatus}>Location shared</Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            ))}

          {currentLocation && (
            <Marker
              coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.currentLocationMarker}>
                {user?.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={styles.currentLocationImage} />
                ) : (
                  <Text style={styles.currentLocationText}>
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || '?'}
                  </Text>
                )}
              </View>
              <Callout tooltip>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutName}>You</Text>
                  {myRoute && (
                    <>
                      <Text style={styles.calloutDistance}>{myRoute.distance} miles away</Text>
                      <Text style={styles.calloutETA}>ETA: {formatETA(myRoute.duration)}</Text>
                    </>
                  )}
                </View>
              </Callout>
            </Marker>
          )}

          {routes.map((route, index) => (
            route.points.length > 0 && (
              <Polyline
                key={route.userId}
                coordinates={route.points}
                strokeColor={ROUTE_COLORS[index % ROUTE_COLORS.length]}
                strokeWidth={4}
                lineDashPattern={[0]}
              />
            )
          ))}

          {myRoute && myRoute.points.length > 0 && isOnMyWay && (
            <Polyline
              coordinates={myRoute.points}
              strokeColor="#10B981"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
        </MapView>
    );
  };

  return (
    <LinearGradient colors={gradientColors as [string, string]} style={styles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? renderWebMap() : renderNativeMap()}
        
        {Platform.OS !== 'web' && (
          <>
            <TouchableOpacity style={styles.centerButton} onPress={centerOnEvent}>
              <Ionicons name="locate" size={22} color={Colors.secondary} />
            </TouchableOpacity>

            {onMyWayList.length > 0 && (
              <TouchableOpacity 
                style={styles.onMyWayBadge}
                onPress={() => setShowOnMyWayPanel(!showOnMyWayPanel)}
              >
                <Ionicons name="car" size={16} color={Colors.white} />
                <Text style={styles.onMyWayBadgeText}>{onMyWayList.length} on the way</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {showOnMyWayPanel && onMyWayList.length > 0 && (
        <View style={styles.onMyWayPanel}>
          <View style={styles.onMyWayPanelHeader}>
            <Text style={styles.onMyWayPanelTitle}>On Their Way</Text>
            <TouchableOpacity onPress={() => setShowOnMyWayPanel(false)}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.onMyWayList} showsVerticalScrollIndicator={false}>
            {onMyWayList.map((attendee, index) => (
              <View key={attendee.user_id || `attendee-${index}`} style={styles.onMyWayItem}>
                {attendee.profile_image ? (
                  <Image source={{ uri: attendee.profile_image }} style={styles.onMyWayAvatar} />
                ) : (
                  <View style={styles.onMyWayAvatarPlaceholder}>
                    <Text style={styles.onMyWayAvatarText}>
                      {attendee.user_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.onMyWayInfo}>
                  <Text style={styles.onMyWayName}>{attendee.user_name}</Text>
                  {attendee.distance && (
                    <Text style={styles.onMyWayDistance}>
                      {attendee.distance} mi away {attendee.eta ? `• ${formatETA(attendee.eta)}` : ''}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.sharingToggle}>
          <View style={styles.sharingInfo}>
            <Ionicons name="location" size={20} color={locationSharing ? Colors.green : Colors.gray} />
            <Text style={styles.sharingText}>Share my location</Text>
          </View>
          <Switch
            value={locationSharing}
            onValueChange={toggleLocationSharing}
            trackColor={{ false: Colors.grayLight, true: Colors.greenLight }}
            thumbColor={locationSharing ? Colors.green : Colors.grayMedium}
          />
        </View>

        <View style={styles.sharingStatus}>
          <Text style={styles.sharingStatusText}>
            {sharingCount} {sharingCount === 1 ? 'person' : 'people'} sharing location
          </Text>
        </View>

        {isEventDay && (
          <TouchableOpacity
            style={[styles.onMyWayButton, isOnMyWay && styles.onMyWayButtonActive]}
            onPress={handleMarkOnMyWay}
          >
            <Ionicons 
              name={isOnMyWay ? 'checkmark-circle' : 'car'} 
              size={20} 
              color={isOnMyWay ? Colors.white : Colors.secondary} 
            />
            <Text style={[styles.onMyWayButtonText, isOnMyWay && styles.onMyWayButtonTextActive]}>
              {isOnMyWay ? "I'm On My Way!" : "I'm On My Way"}
            </Text>
          </TouchableOpacity>
        )}
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
  },
  map: {
    flex: 1,
  },
  eventMarker: {
    width: 36,
    height: 36,
    backgroundColor: '#EF4444',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  eventMarkerInner: {
    width: 12,
    height: 12,
    backgroundColor: 'white',
    borderRadius: 6,
  },
  attendeeMarker: {
    width: 44,
    height: 44,
    backgroundColor: Colors.secondary,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  attendeeMarkerOnMyWay: {
    borderColor: '#10B981',
    borderWidth: 4,
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
  },
  attendeeMarkerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  attendeeMarkerText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: 'white',
  },
  currentLocationMarker: {
    width: 48,
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  currentLocationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  currentLocationText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: 'white',
  },
  calloutContainer: {
    minWidth: 120,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  calloutSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 2,
  },
  calloutBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  calloutDistance: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.primary,
    marginTop: 4,
  },
  calloutETA: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 2,
  },
  calloutStatus: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 4,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  onMyWayBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  onMyWayBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  onMyWayPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 80,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  onMyWayPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  onMyWayPanelTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  onMyWayList: {
    flex: 1,
  },
  onMyWayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  onMyWayAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onMyWayAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onMyWayAvatarText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: 'white',
  },
  onMyWayInfo: {
    flex: 1,
    marginLeft: 12,
  },
  onMyWayName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  onMyWayDistance: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 2,
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
    marginBottom: 8,
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
  webMapContainer: {
    flex: 1,
    position: 'relative',
  },
  webMapImage: {
    width: '100%',
    height: '100%',
  },
  webMapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventMarkerWeb: {
    width: 40,
    height: 40,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  webMapInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
  },
  webMapTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  webMapSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginTop: 2,
  },
  webOnMyWayList: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: 12,
    padding: 12,
    maxWidth: 200,
  },
  webOnMyWayTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: 'white',
    marginBottom: 4,
  },
  webOnMyWayName: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: 'white',
    marginTop: 2,
  },
});
