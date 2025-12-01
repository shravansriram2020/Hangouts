import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  attendees: any[];
}

export default function RidesModal({ visible, onClose, eventId, attendees }: Props) {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);

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
    <GlassModal visible={visible} onClose={onClose} title="Rides" fullHeight>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {}} 
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.createButtonText}>Offer a Ride</Text>
        </TouchableOpacity>

                {rides.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="car-outline" size={40} color={Colors.grayMedium} />
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
                              <Ionicons name="trash-outline" size={18} color={Colors.red} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.rideDetail}>
                          <Ionicons name="location-outline" size={14} color={Colors.gray} />
                          <Text style={styles.rideDetailText}>{ride.pickup_location}</Text>
                        </View>

                        <View style={styles.rideDirections}>
                          {ride.can_drive_to && (
                            <View style={styles.directionBadge}>
                              <Ionicons name="arrow-forward" size={10} color={Colors.green} />
                              <Text style={styles.directionText}>To event</Text>
                            </View>
                          )}
                          {ride.can_drive_from && (
                            <View style={styles.directionBadge}>
                              <Ionicons name="arrow-back" size={10} color={Colors.green} />
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
      </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  rideCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  driverPhoto: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  driverPhotoPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverInitial: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  rideInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  rideDetails: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rideDetailText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 5,
  },
  rideDirections: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  directionText: {
    fontSize: 11,
    color: Colors.green,
    fontFamily: 'Prompt-Medium',
    marginLeft: 3,
  },
  passengers: {
    marginBottom: 10,
  },
  passengersLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 4,
  },
  passengersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  passengerBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 3,
  },
  passengerName: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  joinButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  leaveButtonText: {
    color: Colors.red,
  },
  createForm: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 16,
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
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
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
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
});
