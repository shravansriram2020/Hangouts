import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  attendees: any[];
}

export default function RidesModal({ visible, onClose, eventId, attendees }: Props) {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [spotsAvailable, setSpotsAvailable] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [canDriveTo, setCanDriveTo] = useState(true);
  const [canDriveFrom, setCanDriveFrom] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchRides();
    }
  }, [visible]);

  const fetchRides = async () => {
    try {
      const data = await api.get(`/rides/event/${eventId}`);
      setRides(data);
    } catch (error) {
      console.error('Failed to fetch rides:', error);
    }
  };

  const handleCreateRide = async () => {
    if (!spotsAvailable || !pickupLocation) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/rides', {
        eventId,
        spotsAvailable: parseInt(spotsAvailable),
        pickupLocation,
        canDriveTo,
        canDriveFrom,
      });

      setShowCreateRide(false);
      setSpotsAvailable('');
      setPickupLocation('');
      fetchRides();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRide = async (rideId: string) => {
    try {
      await api.post(`/rides/${rideId}/join`, {});
      fetchRides();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join ride');
    }
  };

  const handleLeaveRide = async (rideId: string) => {
    try {
      await api.post(`/rides/${rideId}/leave`, {});
      fetchRides();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to leave ride');
    }
  };

  const handleCancelRide = async (rideId: string) => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rides/${rideId}`);
            fetchRides();
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel ride');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/360_F_1516542978_mc3KOajI3kbhFHs8pGvbuUvaK0YHXJT2-removebg-preview_1760856241070_1764548149934.png')}
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>Rides</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {showCreateRide ? (
            <View style={styles.createForm}>
              <Text style={styles.formTitle}>Offer a Ride</Text>

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
                  onPress={() => setShowCreateRide(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleCreateRide}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Creating...' : 'Offer Ride'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateRide(true)}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>Offer a Ride</Text>
              </TouchableOpacity>

              {rides.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="car-outline" size={48} color={Colors.grayMedium} />
                  <Text style={styles.emptyText}>No rides offered yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to offer a ride!</Text>
                </View>
              ) : (
                rides.map((ride) => {
                  const isDriver = ride.driver_id === user?.id;
                  const isPassenger = ride.passengers?.some((p: any) => p.userId === user?.id);
                  const spotsLeft = ride.spots_available - (ride.passenger_count || 0);

                  return (
                    <View key={ride.id} style={styles.rideCard}>
                      <View style={styles.rideHeader}>
                        {ride.profile_photo ? (
                          <Image source={{ uri: ride.profile_photo }} style={styles.driverPhoto} />
                        ) : (
                          <View style={styles.driverPhotoPlaceholder}>
                            <Text style={styles.driverInitial}>
                              {ride.first_name?.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.rideInfo}>
                          <Text style={styles.driverName}>{ride.first_name}'s Ride</Text>
                          <Text style={styles.rideDetails}>
                            {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                          </Text>
                        </View>
                        {isDriver && (
                          <TouchableOpacity onPress={() => handleCancelRide(ride.id)}>
                            <Ionicons name="trash-outline" size={20} color={Colors.red} />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.rideDetail}>
                        <Ionicons name="location-outline" size={16} color={Colors.gray} />
                        <Text style={styles.rideDetailText}>{ride.pickup_location}</Text>
                      </View>

                      <View style={styles.rideDirections}>
                        {ride.can_drive_to && (
                          <View style={styles.directionBadge}>
                            <Ionicons name="arrow-forward" size={12} color={Colors.green} />
                            <Text style={styles.directionText}>To event</Text>
                          </View>
                        )}
                        {ride.can_drive_from && (
                          <View style={styles.directionBadge}>
                            <Ionicons name="arrow-back" size={12} color={Colors.green} />
                            <Text style={styles.directionText}>From event</Text>
                          </View>
                        )}
                      </View>

                      {ride.passengers && ride.passengers.length > 0 && (
                        <View style={styles.passengers}>
                          <Text style={styles.passengersLabel}>Passengers:</Text>
                          <View style={styles.passengersList}>
                            {ride.passengers.map((passenger: any) => (
                              <View key={passenger.id} style={styles.passengerBadge}>
                                <Text style={styles.passengerName}>{passenger.firstName}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {!isDriver && (
                        <TouchableOpacity
                          style={[
                            styles.joinButton,
                            isPassenger && styles.leaveButton,
                          ]}
                          onPress={() => isPassenger ? handleLeaveRide(ride.id) : handleJoinRide(ride.id)}
                        >
                          <Text style={[styles.joinButtonText, isPassenger && styles.leaveButtonText]}>
                            {isPassenger ? 'Leave Ride' : 'Join Ride'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  rideCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  driverPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInitial: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  rideInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  rideDetails: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideDetailText: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 6,
  },
  rideDirections: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  directionText: {
    fontSize: 12,
    color: Colors.green,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  passengers: {
    marginBottom: 12,
  },
  passengersLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
  },
  passengersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  passengerBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  joinButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  leaveButtonText: {
    color: Colors.red,
  },
  createForm: {
    backgroundColor: Colors.grayLight,
    borderRadius: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
});
