import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface UserResult {
  id: string;
  username: string;
  firstName: string;
  profilePhoto: string | null;
}

export default function CreateEventModal({ visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [eventImage, setEventImage] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [gradientColor1, setGradientColor1] = useState('');
  const [gradientColor2, setGradientColor2] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<UserResult[]>([]);
  const [radius, setRadius] = useState(5);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestingLocation, setSuggestingLocation] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationCache = useRef<Map<string, LocationSuggestion[]>>(new Map());

  useEffect(() => {
    if (visible) {
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const photoData = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEventImage(photoData);
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
        radius: radius.toString(),
      });

      const results = await api.get(`/location/search?${params}`);
      locationCache.current.set(query, results);
      setLocationSuggestions(results);
    } catch (error) {
      console.error('Location search failed:', error);
    } finally {
      setSearchingLocation(false);
    }
  }, [currentLocation, radius]);

  const handleLocationChange = (text: string) => {
    setLocationQuery(text);
    setLocationName('');
    setLocationAddress('');
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchLocations(text);
    }, 300);
  };

  const handleSuggestLocation = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services');
      return;
    }

    setSuggestingLocation(true);
    try {
      const params = new URLSearchParams({
        title: title || 'fun',
        lat: currentLocation.lat.toString(),
        lng: currentLocation.lng.toString(),
        radius: radius.toString(),
      });

      const results = await api.get(`/location/suggest?${params}`);
      setLocationSuggestions(results);
    } catch (error) {
      console.error('Location suggestion failed:', error);
    } finally {
      setSuggestingLocation(false);
    }
  };

  const selectLocation = (location: LocationSuggestion) => {
    setLocationName(location.name);
    setLocationAddress(location.address);
    setLocationLat(location.lat);
    setLocationLng(location.lng);
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      setUserResults([]);
      return;
    }

    try {
      const results = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setUserResults(results.filter((u: UserResult) => !invitedUsers.find(i => i.id === u.id)));
    } catch (error) {
      console.error('User search failed:', error);
    }
  };

  const inviteUser = (user: UserResult) => {
    setInvitedUsers([...invitedUsers, user]);
    setUserResults(userResults.filter(u => u.id !== user.id));
    setUserSearchQuery('');
  };

  const removeInvite = (userId: string) => {
    setInvitedUsers(invitedUsers.filter(u => u.id !== userId));
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatTimeDisplay = (time: Date | null) => {
    if (!time) return '';
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleCreate = async () => {
    if (!title) {
      Alert.alert('Required Fields', 'Please enter a hangout title');
      return;
    }
    if (!eventDate) {
      Alert.alert('Required Fields', 'Please select a date');
      return;
    }
    if (!eventTime) {
      Alert.alert('Required Fields', 'Please select a time');
      return;
    }

    setLoading(true);
    try {
      const dateStr = eventDate.toISOString().split('T')[0];
      const timeStr = `${eventTime.getHours().toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}`;

      await api.post('/events', {
        title,
        eventImage,
        eventDate: dateStr,
        eventTime: timeStr,
        locationName,
        locationAddress,
        locationLat,
        locationLng,
        notes,
        gradientColor1,
        gradientColor2,
        invitedUsers: invitedUsers.map(u => u.id),
      });

      resetForm();
      onCreated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setEventImage('');
    setEventDate(null);
    setEventTime(null);
    setLocationQuery('');
    setLocationName('');
    setLocationAddress('');
    setLocationLat(null);
    setLocationLng(null);
    setNotes('');
    setGradientColor1('');
    setGradientColor2('');
    setInvitedUsers([]);
    locationCache.current.clear();
  };

  const isFormValid = title && eventDate && eventTime;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Create New Hangout</Text>
              <Text style={styles.headerSubtitle}>Plan something awesome with your friends</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Hangout Image</Text>
            <TouchableOpacity style={styles.imageUpload} onPress={handlePickImage}>
              {eventImage ? (
                <Image source={{ uri: eventImage }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={28} color={Colors.grayMedium} />
                  <Text style={styles.uploadText}>Upload Hangout</Text>
                  <Text style={styles.uploadText}>Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Hangout Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Movie Night, Beach Day"
              placeholderTextColor={Colors.grayMedium}
            />

            <Text style={styles.sectionTitle}>When is it happening?</Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeInput}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={eventDate ? styles.pickerText : styles.pickerPlaceholder}>
                    {eventDate ? formatDateDisplay(eventDate) : 'mm/dd/yyyy'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              <View style={styles.dateTimeInput}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={eventTime ? styles.pickerText : styles.pickerPlaceholder}>
                    {eventTime ? formatTimeDisplay(eventTime) : '--:-- --'}
                  </Text>
                  <Ionicons name="time-outline" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <View style={styles.inlinePicker}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateGrid}>
                  {Array.from({ length: 30 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isSelected = eventDate && 
                      date.toDateString() === eventDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                        onPress={() => {
                          setEventDate(date);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={[styles.dateOptionDay, isSelected && styles.dateOptionTextSelected]}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.dateOptionNum, isSelected && styles.dateOptionTextSelected]}>
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {showTimePicker && (
              <View style={styles.inlinePicker}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.timeGrid} horizontal showsHorizontalScrollIndicator={false}>
                  {Array.from({ length: 48 }, (_, i) => {
                    const hours = Math.floor(i / 2);
                    const minutes = (i % 2) * 30;
                    const time = new Date();
                    time.setHours(hours, minutes, 0, 0);
                    const isSelected = eventTime && 
                      time.getHours() === eventTime.getHours() &&
                      time.getMinutes() === eventTime.getMinutes();
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                        onPress={() => {
                          setEventTime(time);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationInputRow}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                value={locationQuery || locationAddress || locationName}
                onChangeText={handleLocationChange}
                placeholder="Start typing a location (e.g., Central Park, NYC)"
                placeholderTextColor={Colors.grayMedium}
              />
              {searchingLocation && (
                <ActivityIndicator size="small" color={Colors.primary} style={styles.locationLoader} />
              )}
              <Ionicons name="location-outline" size={20} color={Colors.gray} style={styles.locationIcon} />
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
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{loc.name}</Text>
                      <Text style={styles.suggestionAddress} numberOfLines={1}>{loc.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.helperText}>
              Hangouts suggests a location based on your hangout title and your location.
            </Text>

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

            <Text style={styles.sectionTitle}>Invite People</Text>
            <TextInput
              style={styles.input}
              value={userSearchQuery}
              onChangeText={(text) => {
                setUserSearchQuery(text);
                searchUsers(text);
              }}
              placeholder="Search by username..."
              placeholderTextColor={Colors.grayMedium}
            />

            {userResults.length > 0 && (
              <View style={styles.suggestionsList}>
                {userResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userItem}
                    onPress={() => inviteUser(user)}
                  >
                    {user.profilePhoto ? (
                      <Image source={{ uri: user.profilePhoto }} style={styles.userAvatar} />
                    ) : (
                      <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarText}>
                          {user.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.userName}>@{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {invitedUsers.length > 0 && (
              <View style={styles.invitedList}>
                {invitedUsers.map((user) => (
                  <View key={user.id} style={styles.invitedUser}>
                    <Text style={styles.invitedUsername}>@{user.username}</Text>
                    <TouchableOpacity onPress={() => removeInvite(user.id)}>
                      <Ionicons name="close-circle" size={18} color={Colors.grayMedium} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.helperText}>
              Start typing a username to search for people to invite
            </Text>

            <Text style={styles.sectionTitle}>Hangout Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Bring snacks, Meet at the front entrance, BYOB"
              placeholderTextColor={Colors.grayMedium}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.helperText}>
              These notes will be visible to all attendees on the hangout page
            </Text>

            <Text style={styles.sectionTitle}>Custom Background Gradient</Text>
            <View style={styles.colorRow}>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Color 1</Text>
                <View style={styles.colorPickerRow}>
                  <View style={[styles.colorPreview, { backgroundColor: gradientColor1 || '#000' }]} />
                  <TextInput
                    style={[styles.input, styles.colorTextInput]}
                    value={gradientColor1}
                    onChangeText={setGradientColor1}
                    placeholder="#000000"
                    placeholderTextColor={Colors.grayMedium}
                  />
                </View>
              </View>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Color 2</Text>
                <View style={styles.colorPickerRow}>
                  <View style={[styles.colorPreview, { backgroundColor: gradientColor2 || '#000' }]} />
                  <TextInput
                    style={[styles.input, styles.colorTextInput]}
                    value={gradientColor2}
                    onChangeText={setGradientColor2}
                    placeholder="#000000"
                    placeholderTextColor={Colors.grayMedium}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.helperText}>
              Leave empty to use the default gradient. Both colors must be selected to apply custom gradient.
            </Text>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !isFormValid && styles.createButtonDisabled]}
                onPress={handleCreate}
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="add" size={20} color={isFormValid ? Colors.white : Colors.grayMedium} />
                    <Text style={[styles.createButtonText, !isFormValid && styles.createButtonTextDisabled]}>
                      Create Event
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: Colors.grayLight,
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  imageUpload: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.grayMedium,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    fontSize: 13,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateTimeInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
  },
  pickerButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
  },
  inlinePicker: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  pickerDone: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'Prompt-SemiBold',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateOption: {
    width: 50,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateOptionSelected: {
    backgroundColor: Colors.primary,
  },
  dateOptionDay: {
    fontSize: 10,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
  },
  dateOptionNum: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  dateOptionTextSelected: {
    color: Colors.white,
  },
  timeGrid: {
    flexDirection: 'row',
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.grayLight,
    marginRight: 8,
  },
  timeOptionSelected: {
    backgroundColor: Colors.primary,
  },
  timeOptionText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  timeOptionTextSelected: {
    color: Colors.white,
  },
  locationInputRow: {
    position: 'relative',
  },
  locationInput: {
    paddingRight: 70,
  },
  locationLoader: {
    position: 'absolute',
    right: 40,
    top: 14,
  },
  locationIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  helperText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 6,
  },
  suggestionsList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  suggestionText: {
    marginLeft: 10,
    flex: 1,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  userName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  invitedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  invitedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  invitedUsername: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginRight: 6,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorInput: {
    flex: 1,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  colorTextInput: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.grayLight,
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 6,
  },
  createButtonTextDisabled: {
    color: Colors.grayMedium,
  },
});
