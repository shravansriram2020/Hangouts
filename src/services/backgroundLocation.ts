import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from '../../services/api';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    if (locations && locations.length > 0) {
      const location = locations[locations.length - 1];
      
      try {
        await api.post('/location/background-update', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          timestamp: location.timestamp,
        });
      } catch (err) {
        console.error('Failed to send background location:', err);
      }
    }
  }
});

export async function startBackgroundLocationUpdates(eventId: string): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission not granted');
      return false;
    }

    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
      console.error('Background location task is not defined');
      return false;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      console.log('Background location updates already running');
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 100,
      deferredUpdatesInterval: 60000,
      deferredUpdatesDistance: 100,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Hangouts',
        notificationBody: 'Sharing your location with friends',
        notificationColor: '#D4EDFC',
      },
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
    });

    console.log('Background location updates started for event:', eventId);
    return true;
  } catch (error) {
    console.error('Error starting background location:', error);
    return false;
  }
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location updates stopped');
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
