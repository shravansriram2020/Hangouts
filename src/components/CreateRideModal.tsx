import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  onCreated: (optimisticRide?: any) => void;
  onError?: (tempId: string) => void;
  currentUser?: any;
}

export default function CreateRideModal({ visible, onClose, eventId, onCreated, onError, currentUser }: Props) {
  const [spotsAvailable, setSpotsAvailable] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [canDriveTo, setCanDriveTo] = useState(true);
  const [canDriveFrom, setCanDriveFrom] = useState(true);

  const handleCreateRide = async () => {
    if (!spotsAvailable || !pickupLocation) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    // Create optimistic ride data
    const optimisticRide = {
      id: `temp_${Date.now()}`,
      event_id: eventId,
      driver_id: currentUser?.id,
      driver_first_name: currentUser?.firstName || currentUser?.first_name,
      driver_photo: currentUser?.profilePhoto || currentUser?.profile_photo,
      spots_available: parseInt(spotsAvailable),
      pickup_location: pickupLocation,
      can_drive_to: canDriveTo,
      can_drive_from: canDriveFrom,
      passenger_count: 0,
      passengers: [],
      isPending: true,
    };

    // Reset form and close immediately
    setSpotsAvailable('');
    setPickupLocation('');
    setCanDriveTo(true);
    setCanDriveFrom(true);
    onCreated(optimisticRide);
    onClose();

    // Make API call in background
    try {
      await api.post('/rides', {
        eventId,
        spotsAvailable: parseInt(spotsAvailable),
        pickupLocation,
        canDriveTo,
        canDriveFrom,
      });
    } catch (error: any) {
      onError?.(optimisticRide.id);
      Alert.alert('Error', error.message || 'Failed to create ride');
    }
  };

  const handleClose = () => {
    setSpotsAvailable('');
    setPickupLocation('');
    setCanDriveTo(true);
    setCanDriveFrom(true);
    onClose();
  };

  return (
    <GlassModal visible={visible} onClose={handleClose} title="Offer a Ride" fullHeight>
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Spots Available</Text>
          <TextInput
            style={styles.input}
            value={spotsAvailable}
            onChangeText={setSpotsAvailable}
            keyboardType="number-pad"
            placeholder="e.g., 3"
            placeholderTextColor={Colors.grayMedium}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pickup Location</Text>
          <TextInput
            style={styles.input}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholder="Where can you pick people up?"
            placeholderTextColor={Colors.grayMedium}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Can drive TO the event</Text>
          <Switch
            value={canDriveTo}
            onValueChange={setCanDriveTo}
            trackColor={{ false: Colors.grayLight, true: Colors.greenLight }}
            thumbColor={canDriveTo ? Colors.green : Colors.grayMedium}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Can drive FROM the event</Text>
          <Switch
            value={canDriveFrom}
            onValueChange={setCanDriveFrom}
            trackColor={{ false: Colors.grayLight, true: Colors.greenLight }}
            thumbColor={canDriveFrom ? Colors.green : Colors.grayMedium}
          />
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleCreateRide}
          >
            <Text style={styles.submitButtonText}>Offer Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.gray,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
