import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY || 'zUUGC9Ij9Lzy8ONgq1wZhes4ajz4vn6z';

interface AttendeeLocation {
  user_id: string;
  user_name: string;
  profile_image?: string;
  lat: number;
  lng: number;
  is_on_my_way: boolean;
  updated_at: string;
}

export default function MapScreen() {
  const { event } = useEvent();
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  const [locationSharing, setLocationSharing] = useState(false);
  const [isOnMyWay, setIsOnMyWay] = useState(false);
  const [sharingCount, setSharingCount] = useState(0);
  const [attendeeLocations, setAttendeeLocations] = useState<AttendeeLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [onMyWayList, setOnMyWayList] = useState<AttendeeLocation[]>([]);
  const [showOnMyWayPanel, setShowOnMyWayPanel] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (event?.id) {
      fetchAttendeeLocations();
      const interval = setInterval(fetchAttendeeLocations, 5000);
      return () => clearInterval(interval);
    }
  }, [event?.id]);

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

  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [attendeeLocations]);

  const fetchAttendeeLocations = async () => {
    if (!event?.id) return;
    try {
      const data = await api.get(`/location/attendees/${event.id}`);
      setAttendeeLocations(data);
      setSharingCount(data.filter((a: AttendeeLocation) => a.lat && a.lng).length);
      setOnMyWayList(data.filter((a: AttendeeLocation) => a.is_on_my_way));
    } catch (error) {
      console.error('Failed to fetch attendee locations:', error);
    }
  };

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
          timeInterval: 10000,
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
    
    if (!locationSharing) {
      setLocationSharing(true);
      toggleLocationSharing(true);
    }
    
    if (currentLocation) {
      await updateLocationOnServer(currentLocation.lat, currentLocation.lng);
    }
    
    fetchAttendeeLocations();
  };

  const eventLat = event?.location_lat || 34.15791;
  const eventLng = event?.location_lng || -118.634725;

  const mapHTML = useMemo(() => {
    const attendeeMarkers = attendeeLocations
      .filter(a => a.lat && a.lng)
      .map(a => {
        const profilePhotoUrl = a.profile_image ? a.profile_image.replace(/'/g, "\\'") : '';
        const initial = a.user_name?.charAt(0) || '?';
        return `
        new tt.Marker({ element: createAttendeeMarker('${initial}', ${a.is_on_my_way}, '${profilePhotoUrl}') })
          .setLngLat([${a.lng}, ${a.lat}])
          .setPopup(new tt.Popup({ offset: 30 }).setHTML('<strong>${a.user_name}</strong><br/>${a.is_on_my_way ? '🚗 On my way' : 'Location shared'}'))
          .addTo(map);
      `;
      }).join('\n');

    const currentLocationMarker = currentLocation ? `
      new tt.Marker({ element: createCurrentLocationMarker() })
        .setLngLat([${currentLocation.lng}, ${currentLocation.lat}])
        .setPopup(new tt.Popup({ offset: 30 }).setHTML('<strong>You are here</strong>'))
        .addTo(map);
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css">
        <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
          .event-marker {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #EF4444, #DC2626);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          }
          .event-marker-inner {
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
          }
          .attendee-marker {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #1E3A5F, #2D5A8B);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 4px 12px rgba(30, 58, 95, 0.4);
            overflow: hidden;
          }
          .attendee-marker img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .attendee-marker.on-my-way {
            border: 4px solid #10B981;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
            position: relative;
          }
          .attendee-marker.on-my-way::after {
            content: '🚗';
            position: absolute;
            bottom: -8px;
            right: -8px;
            font-size: 14px;
            background: white;
            border-radius: 50%;
            padding: 2px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          .current-location-marker {
            width: 24px;
            height: 24px;
            background: #3B82F6;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          .current-location-marker::after {
            content: '';
            position: absolute;
            width: 48px;
            height: 48px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            top: -12px;
            left: -12px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function createEventMarker() {
            const el = document.createElement('div');
            el.className = 'event-marker';
            el.innerHTML = '<div class="event-marker-inner"></div>';
            return el;
          }
          
          function createAttendeeMarker(initial, isOnMyWay, profilePhotoUrl) {
            const el = document.createElement('div');
            el.className = 'attendee-marker' + (isOnMyWay ? ' on-my-way' : '');
            if (profilePhotoUrl) {
              const img = document.createElement('img');
              img.src = profilePhotoUrl;
              img.alt = initial;
              img.onerror = function() {
                this.style.display = 'none';
                el.textContent = initial;
              };
              el.appendChild(img);
            } else {
              el.textContent = initial;
            }
            return el;
          }

          function createCurrentLocationMarker() {
            const el = document.createElement('div');
            el.className = 'current-location-marker';
            return el;
          }

          const map = tt.map({
            key: '${TOMTOM_API_KEY}',
            container: 'map',
            center: [${eventLng}, ${eventLat}],
            zoom: 12,
            style: 'tomtom://vector/1/basic-main'
          });

          map.addControl(new tt.NavigationControl());

          new tt.Marker({ element: createEventMarker() })
            .setLngLat([${eventLng}, ${eventLat}])
            .setPopup(new tt.Popup({ offset: 30 }).setHTML('<strong>${event?.title?.replace(/'/g, "\\'") || 'Event'}</strong><br/>${event?.location_name?.replace(/'/g, "\\'") || ''}'))
            .addTo(map);

          ${attendeeMarkers}
          ${currentLocationMarker}
        </script>
      </body>
      </html>
    `;
  }, [attendeeLocations, currentLocation, eventLat, eventLng, event?.title, event?.location_name]);

  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          key={mapKey}
          srcDoc={mapHTML}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
          title="Event Map"
        />
      );
    }
    
    return (
      <WebView
        key={mapKey}
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sharingInfo}>
          <Ionicons name="people-outline" size={18} color={Colors.secondary} />
          <Text style={styles.sharingText}>{sharingCount} sharing</Text>
        </View>
        <View style={styles.shareToggle}>
          <Text style={styles.shareLabel}>Share my location</Text>
          <Switch
            value={locationSharing}
            onValueChange={toggleLocationSharing}
            trackColor={{ false: Colors.grayLight, true: Colors.green }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.onMyWayButton, isOnMyWay && styles.onMyWayButtonActive]}
        onPress={handleMarkOnMyWay}
      >
        <Text style={styles.onMyWayEmoji}>
          {isOnMyWay ? '🚗' : '📍'}
        </Text>
        <Text style={styles.onMyWayButtonText}>
          {isOnMyWay ? "I'm On My Way!" : "Mark as On My Way"}
        </Text>
      </TouchableOpacity>

      <View style={styles.mapContainer}>
        {renderMap()}
      </View>

      {onMyWayList.length > 0 && (
        <View style={styles.onMyWayPanel}>
          <TouchableOpacity 
            style={styles.onMyWayPanelHeader}
            onPress={() => setShowOnMyWayPanel(!showOnMyWayPanel)}
            activeOpacity={0.7}
          >
            <View style={styles.onMyWayPanelIcon}>
              <Ionicons name="navigate" size={16} color={Colors.green} />
            </View>
            <Text style={styles.onMyWayPanelTitle}>On Their Way ({onMyWayList.length})</Text>
            <Ionicons 
              name={showOnMyWayPanel ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={Colors.gray} 
            />
          </TouchableOpacity>
          {showOnMyWayPanel && (
            <ScrollView style={styles.onMyWayPanelContent} nestedScrollEnabled>
              {onMyWayList.map((attendee) => (
                <View key={attendee.user_id} style={styles.onMyWayItem}>
                  <View style={styles.onMyWayAvatar}>
                    {attendee.profile_image ? (
                      <Image source={{ uri: attendee.profile_image }} style={styles.onMyWayAvatarImage} />
                    ) : (
                      <Text style={styles.onMyWayAvatarInitial}>
                        {attendee.user_name?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.onMyWayInfo}>
                    <Text style={styles.onMyWayName}>{attendee.user_name}</Text>
                    <Text style={styles.onMyWayStatus}>🚗 On their way</Text>
                  </View>
                  <Text style={styles.onMyWayEmoji}>🚗</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {locationSharing && (
        <View style={styles.sharingStatus}>
          <View style={styles.sharingStatusDot} />
          <Text style={styles.sharingStatusText}>
            Your location is being shared live
          </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sharingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sharingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
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
    gap: 8,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  onMyWayButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  onMyWayButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  onMyWayEmoji: {
    fontSize: 20,
  },
  mapContainer: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  webView: {
    flex: 1,
    borderRadius: 16,
  },
  onMyWayPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  onMyWayPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  onMyWayPanelIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onMyWayPanelTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  onMyWayPanelContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    maxHeight: 120,
  },
  onMyWayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  onMyWayAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  onMyWayAvatarImage: {
    width: '100%',
    height: '100%',
  },
  onMyWayAvatarInitial: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  onMyWayInfo: {
    flex: 1,
  },
  onMyWayName: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  onMyWayStatus: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.green,
  },
  sharingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  sharingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  sharingStatusText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.green,
  },
});
