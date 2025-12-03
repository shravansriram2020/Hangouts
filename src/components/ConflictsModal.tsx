import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassModal from './GlassModal';

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMiles?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  isHost?: boolean;
  onConflictUpdate?: () => void;
  onEventUpdated?: () => void;
}

const CONFLICT_TYPES = [
  { id: 'time', label: 'Time Conflict', icon: 'time-outline', color: Colors.blue },
  { id: 'location', label: 'Location Conflict', icon: 'location-outline', color: Colors.green },
  { id: 'other', label: 'Other', icon: 'warning-outline', color: Colors.yellow },
];

export default function ConflictsModal({ visible, onClose, eventId, isHost, onConflictUpdate, onEventUpdated }: Props) {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showCreateConflict, setShowCreateConflict] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [reason, setReason] = useState('');
  const [suggestedDate, setSuggestedDate] = useState<Date | null>(null);
  const [suggestedTime, setSuggestedTime] = useState<Date | null>(null);
  const [suggestedLocation, setSuggestedLocation] = useState('');
  const [suggestedLocationName, setSuggestedLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [suggestingLocation, setSuggestingLocation] = useState(false);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationCache = useRef<Map<string, LocationSuggestion[]>>(new Map());
  
  const datePickerSlideAnim = useRef(new Animated.Value(300)).current;
  const datePickerOverlayOpacity = useRef(new Animated.Value(0)).current;
  const timePickerSlideAnim = useRef(new Animated.Value(300)).current;
  const timePickerOverlayOpacity = useRef(new Animated.Value(0)).current;

  const openDatePicker = () => {
    setShowDatePicker(true);
    Animated.parallel([
      Animated.timing(datePickerOverlayOpacity, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(datePickerSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
    ]).start();
  };

  const closeDatePicker = () => {
    Animated.parallel([
      Animated.timing(datePickerOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(datePickerSlideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowDatePicker(false));
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
    Animated.parallel([
      Animated.timing(timePickerOverlayOpacity, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(timePickerSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
    ]).start();
  };

  const closeTimePicker = () => {
    Animated.parallel([
      Animated.timing(timePickerOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(timePickerSlideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowTimePicker(false));
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatDisplayTime = (time: Date | null) => {
    if (!time) return 'Select Time';
    return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatSuggestedDateTime = () => {
    if (!suggestedDate || !suggestedTime) return null;
    const date = formatDisplayDate(suggestedDate);
    const time = formatDisplayTime(suggestedTime);
    return `${date} ${time}`;
  };

  useEffect(() => {
    if (visible) {
      fetchConflicts();
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setSearchingLocation(false);
      return;
    }

    if (locationCache.current.has(query)) {
      setLocationSuggestions(locationCache.current.get(query) || []);
      setSearchingLocation(false);
      return;
    }

    setSearchingLocation(true);
    try {
      const params = new URLSearchParams({
        query,
        ...(currentLocation && {
          lat: currentLocation.lat.toString(),
          lng: currentLocation.lng.toString(),
        }),
        radius: '50000',
      });

      const results = await api.get(`/location/search?${params}`);
      locationCache.current.set(query, results);
      setLocationSuggestions(results);
    } catch (error) {
      console.error('Location search failed:', error);
    } finally {
      setSearchingLocation(false);
    }
  }, [currentLocation]);

  const handleLocationQueryChange = (text: string) => {
    setLocationQuery(text);
    setSuggestedLocationName('');
    setSuggestedLocation('');
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchLocations(text);
    }, 300);
  };

  const selectLocation = (location: LocationSuggestion) => {
    setSuggestedLocationName(location.name);
    setSuggestedLocation(location.address);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const handleSuggestLocation = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services');
      return;
    }

    setSuggestingLocation(true);
    try {
      const params = new URLSearchParams({
        title: 'hangout',
        lat: currentLocation.lat.toString(),
        lng: currentLocation.lng.toString(),
        radius: '50000',
      });

      const results = await api.get(`/location/suggest?${params}`);
      setLocationSuggestions(results);
    } catch (error) {
      console.error('Location suggestion failed:', error);
    } finally {
      setSuggestingLocation(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const data = await api.get(`/conflicts/event/${eventId}`);
      setConflicts(data);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    }
  };

  const handleCreateConflict = async () => {
    if (!selectedType) {
      Alert.alert('Required', 'Please select a conflict type');
      return;
    }

    if (selectedType === 'time' && (!suggestedDate || !suggestedTime)) {
      Alert.alert('Required', 'Please select a suggested date and time');
      return;
    }

    if (selectedType === 'location' && !suggestedLocation) {
      Alert.alert('Required', 'Please enter a suggested location');
      return;
    }

    setLoading(true);
    try {
      const formattedDateTime = formatSuggestedDateTime();
      await api.post('/conflicts', {
        eventId,
        conflictType: selectedType,
        reason,
        suggestedTime: selectedType === 'time' ? formattedDateTime : null,
        suggestedLocation: selectedType === 'location' ? suggestedLocation : null,
      });

      setShowCreateConflict(false);
      setSelectedType('');
      setReason('');
      setSuggestedDate(null);
      setSuggestedTime(null);
      setSuggestedLocation('');
      setSuggestedLocationName('');
      setLocationQuery('');
      setLocationSuggestions([]);
      fetchConflicts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report conflict');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (conflictId: string, vote: string) => {
    try {
      await api.post(`/conflicts/${conflictId}/vote`, { vote });
      fetchConflicts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  const handleResolve = async (conflictId: string) => {
    Alert.alert('Resolve Conflict', 'Accept this change?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await api.put(`/conflicts/${conflictId}/resolve`, {});
            fetchConflicts();
            onConflictUpdate?.();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resolve conflict');
          }
        },
      },
    ]);
  };

  const getTypeInfo = (type: string) => {
    return CONFLICT_TYPES.find(t => t.id === type) || CONFLICT_TYPES[2];
  };

  return (
    <>
    <GlassModal visible={visible} onClose={onClose} title="Event Conflicts" fullHeight>
      <ScrollView style={styles.content}>
            {showCreateConflict ? (
              <View style={styles.createForm}>
                <Text style={styles.formLabel}>Conflict Type</Text>
                
                {CONFLICT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      selectedType === type.id && styles.typeOptionSelected,
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text style={styles.typeOptionText}>{type.label}</Text>
                    {selectedType === type.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                <Text style={styles.formLabel}>Reason (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Explain the conflict..."
                  placeholderTextColor={Colors.grayMedium}
                  multiline
                  numberOfLines={3}
                />

                {selectedType === 'time' && (
                  <>
                    <Text style={styles.formLabel}>Suggested Date & Time *</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity 
                        style={styles.dateTimeButton}
                        onPress={openDatePicker}
                      >
                        <Ionicons name="calendar-outline" size={18} color={Colors.gray} />
                        <Text style={[styles.dateTimeText, !suggestedDate && styles.dateTimePlaceholder]}>
                          {formatDisplayDate(suggestedDate)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.dateTimeButton}
                        onPress={openTimePicker}
                      >
                        <Ionicons name="time-outline" size={18} color={Colors.gray} />
                        <Text style={[styles.dateTimeText, !suggestedTime && styles.dateTimePlaceholder]}>
                          {formatDisplayTime(suggestedTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {selectedType === 'location' && (
                  <>
                    <Text style={styles.formLabel}>Suggested Location *</Text>
                    {suggestedLocationName ? (
                      <View style={styles.selectedLocationCard}>
                        <View style={styles.selectedLocationInfo}>
                          <Text style={styles.selectedLocationName}>{suggestedLocationName}</Text>
                          <Text style={styles.selectedLocationAddress} numberOfLines={1}>{suggestedLocation}</Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                          setSuggestedLocationName('');
                          setSuggestedLocation('');
                        }}>
                          <Ionicons name="close-circle" size={22} color={Colors.gray} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <View style={styles.locationInputContainer}>
                          <Ionicons name="search" size={18} color={Colors.gray} style={styles.searchIcon} />
                          <TextInput
                            style={styles.locationInput}
                            value={locationQuery}
                            onChangeText={handleLocationQueryChange}
                            placeholder="Search for a location..."
                            placeholderTextColor={Colors.grayMedium}
                          />
                          {searchingLocation && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </View>

                        {locationSuggestions.length > 0 && (
                          <View style={styles.suggestionsList}>
                            {locationSuggestions.slice(0, 5).map((loc) => (
                              <TouchableOpacity
                                key={loc.id}
                                style={styles.suggestionItem}
                                onPress={() => selectLocation(loc)}
                              >
                                <Ionicons name="location" size={16} color={Colors.primary} />
                                <View style={styles.suggestionItemText}>
                                  <Text style={styles.suggestionName}>{loc.name}</Text>
                                  <Text style={styles.suggestionAddress} numberOfLines={1}>{loc.address}</Text>
                                </View>
                                {loc.distanceMiles && (
                                  <View style={styles.distanceBadge}>
                                    <Text style={styles.distanceText}>{loc.distanceMiles} mi</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <TouchableOpacity 
                      style={styles.suggestButton}
                      onPress={handleSuggestLocation}
                      disabled={suggestingLocation}
                    >
                      {suggestingLocation ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color={Colors.white} />
                          <Text style={styles.suggestButtonText}>Have Hangouts Suggest a Location</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreateConflict(false);
                      setSelectedType('');
                      setReason('');
                      setSuggestedDate(null);
                      setSuggestedTime(null);
                      setSuggestedLocation('');
                      setSuggestedLocationName('');
                      setLocationQuery('');
                      setLocationSuggestions([]);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleCreateConflict}
                    disabled={loading}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Reporting...' : 'Report Conflict'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {conflicts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No conflicts reported yet.</Text>
                  </View>
                ) : (
                  conflicts.map((conflict) => {
                    const typeInfo = getTypeInfo(conflict.conflict_type);
                    const userVote = conflict.votes?.find((v: any) => v.userId === user?.id);
                    const yesVotes = conflict.votes?.filter((v: any) => v.vote === 'yes').length || 0;
                    const noVotes = conflict.votes?.filter((v: any) => v.vote === 'no').length || 0;

                    return (
                      <View key={conflict.id} style={styles.conflictCard}>
                        <View style={styles.conflictHeader}>
                          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                          <Text style={styles.conflictType}>{typeInfo.label}</Text>
                        </View>

                        {conflict.reason && (
                          <Text style={styles.conflictReason}>{conflict.reason}</Text>
                        )}

                        {conflict.suggested_time && (
                          <View style={styles.suggestionRow}>
                            <Ionicons name="time-outline" size={14} color={Colors.gray} />
                            <Text style={styles.suggestionText}>
                              Suggested: {conflict.suggested_time}
                            </Text>
                          </View>
                        )}

                        {conflict.suggested_location && (
                          <View style={styles.suggestionRow}>
                            <Ionicons name="location-outline" size={14} color={Colors.gray} />
                            <Text style={styles.suggestionText}>
                              Suggested: {conflict.suggested_location}
                            </Text>
                          </View>
                        )}

                        <View style={styles.votingSection}>
                          <Text style={styles.votesText}>
                            Votes: {yesVotes} Yes / {noVotes} No
                          </Text>
                          <View style={styles.voteButtons}>
                            <TouchableOpacity
                              style={[
                                styles.voteButton,
                                userVote?.vote === 'yes' && styles.voteButtonActive,
                              ]}
                              onPress={() => handleVote(conflict.id, 'yes')}
                            >
                              <Ionicons
                                name="thumbs-up"
                                size={16}
                                color={userVote?.vote === 'yes' ? Colors.white : Colors.green}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.voteButton,
                                userVote?.vote === 'no' && styles.voteButtonActiveNo,
                              ]}
                              onPress={() => handleVote(conflict.id, 'no')}
                            >
                              <Ionicons
                                name="thumbs-down"
                                size={16}
                                color={userVote?.vote === 'no' ? Colors.white : Colors.red}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {isHost && (
                          <TouchableOpacity
                            style={styles.changeButton}
                            onPress={() => handleResolve(conflict.id)}
                          >
                            <Text style={styles.changeButtonText}>Change</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}

                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setShowCreateConflict(true)}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.reportButtonText}>Report Conflict</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
    </GlassModal>

    {Platform.OS === 'ios' && showDatePicker && (
      <Modal transparent animationType="none" visible={showDatePicker}>
        <View style={styles.pickerModalRoot}>
          <Animated.View style={[styles.pickerModalOverlay, { opacity: datePickerOverlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={closeDatePicker} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[styles.pickerModalContent, { transform: [{ translateY: datePickerSlideAnim }] }]}>
            <View style={styles.pickerModalHeader}>
              <TouchableOpacity onPress={closeDatePicker}>
                <Text style={styles.pickerModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerModalTitle}>Select Date</Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Text style={styles.pickerModalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={suggestedDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setSuggestedDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
                style={styles.iosDatePicker}
                textColor={Colors.secondary}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    )}

    {Platform.OS === 'ios' && showTimePicker && (
      <Modal transparent animationType="none" visible={showTimePicker}>
        <View style={styles.pickerModalRoot}>
          <Animated.View style={[styles.pickerModalOverlay, { opacity: timePickerOverlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={closeTimePicker} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[styles.pickerModalContent, { transform: [{ translateY: timePickerSlideAnim }] }]}>
            <View style={styles.pickerModalHeader}>
              <TouchableOpacity onPress={closeTimePicker}>
                <Text style={styles.pickerModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerModalTitle}>Select Time</Text>
              <TouchableOpacity onPress={closeTimePicker}>
                <Text style={styles.pickerModalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={suggestedTime || new Date()}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setSuggestedTime(selectedTime);
                  }
                }}
                style={styles.iosDatePicker}
                textColor={Colors.secondary}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    )}

    {Platform.OS === 'android' && showDatePicker && (
      <DateTimePicker
        value={suggestedDate || new Date()}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowDatePicker(false);
          if (selectedDate) {
            setSuggestedDate(selectedDate);
          }
        }}
        minimumDate={new Date()}
      />
    )}

    {Platform.OS === 'android' && showTimePicker && (
      <DateTimePicker
        value={suggestedTime || new Date()}
        mode="time"
        display="default"
        onChange={(event, selectedTime) => {
          setShowTimePicker(false);
          if (selectedTime) {
            setSuggestedTime(selectedTime);
          }
        }}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  conflictCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictType: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  conflictReason: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 6,
  },
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  votesText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  voteButtons: {
    flexDirection: 'row',
  },
  voteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voteButtonActive: {
    backgroundColor: Colors.green,
  },
  voteButtonActiveNo: {
    backgroundColor: Colors.red,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changeButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  reportButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  createForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 8,
    marginTop: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  typeOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginLeft: 12,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  suggestButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grayLight,
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  dateTimePlaceholder: {
    color: Colors.grayMedium,
  },
  pickerModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  pickerModalCancel: {
    fontSize: 17,
    fontFamily: 'Prompt-Regular',
    color: Colors.gray,
  },
  pickerModalDone: {
    fontSize: 17,
    fontFamily: 'Prompt-SemiBold',
    color: '#007AFF',
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    paddingVertical: 10,
  },
  selectedLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  selectedLocationAddress: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  suggestionsList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.grayLight,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  suggestionItemText: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  suggestionAddress: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
  },
});
