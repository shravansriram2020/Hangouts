import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

const LOCATION_EVENT_KEY = 'background_location_event_id';

if (Platform.OS !== 'web') {
  const TaskManager = require('expo-task-manager');
  const Location = require('expo-location');
  
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }
    
    if (data) {
      const { locations } = data as { locations: any[] };
      
      if (locations && locations.length > 0) {
        const latestLocation = locations[locations.length - 1];
        
        try {
          const eventId = await AsyncStorage.getItem(LOCATION_EVENT_KEY);
          const isOnMyWayStr = await AsyncStorage.getItem(`is_on_my_way_${eventId}`);
          const isOnMyWay = isOnMyWayStr === 'true';
          
          if (eventId) {
            await api.put('/location/update', {
              eventId,
              lat: latestLocation.coords.latitude,
              lng: latestLocation.coords.longitude,
              isOnMyWay,
            });
            console.log('Background location update sent:', {
              lat: latestLocation.coords.latitude,
              lng: latestLocation.coords.longitude,
            });
          }
        } catch (apiError) {
          console.error('Failed to send background location update:', apiError);
        }
      }
    }
  });
}

export async function startBackgroundLocationTracking(eventId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('Background location tracking not available on web');
    return false;
  }
  
  try {
    const Location = require('expo-location');
    
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission denied');
      return false;
    }

    await AsyncStorage.setItem(LOCATION_EVENT_KEY, eventId);

    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isTracking) {
      console.log('Background location tracking already running');
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 100,
      deferredUpdatesInterval: 60000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Hangouts',
        notificationBody: 'Sharing your location with event attendees',
        notificationColor: '#10B981',
      },
    });

    console.log('Background location tracking started for event:', eventId);
    return true;
  } catch (error) {
    console.error('Failed to start background location tracking:', error);
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    const Location = require('expo-location');
    
    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location tracking stopped');
    }
    
    await AsyncStorage.removeItem(LOCATION_EVENT_KEY);
  } catch (error) {
    console.error('Failed to stop background location tracking:', error);
  }
}

export async function isBackgroundLocationTracking(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  
  try {
    const Location = require('expo-location');
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    console.error('Failed to check background location tracking status:', error);
    return false;
  }
}

export async function setOnMyWayStatus(eventId: string, isOnMyWay: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(`is_on_my_way_${eventId}`, isOnMyWay ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to set on my way status:', error);
  }
}
