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
  Alert,
  ActivityIndicator,
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
  profilePhoto: string | null;
}

export default function CreateEventModal({ visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [eventImage, setEventImage] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [gradientColor1, setGradientColor1] = useState('');
  const [gradientColor2, setGradientColor2] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<UserResult[]>([]);
  const [radius, setRadius] = useState(5);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestingLocation, setSuggestingLocation] = useState(false);

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
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const photoData = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEventImage(photoData);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

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
      setLocationSuggestions(results);
    } catch (error) {
      console.error('Location search failed:', error);
    }
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
    setSearchQuery('');
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

  const handleCreate = async () => {
    if (!title || !eventDate || !eventTime) {
      Alert.alert('Required Fields', 'Please fill in title, date, and time');
      return;
    }

    setLoading(true);
    try {
      await api.post('/events', {
        title,
        eventImage,
        eventDate,
        eventTime,
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
    setEventDate('');
    setEventTime('');
    setLocationName('');
    setLocationAddress('');
    setLocationLat(null);
    setLocationLng(null);
    setNotes('');
    setGradientColor1('');
    setGradientColor2('');
    setInvitedUsers([]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Hangout</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Plan something awesome with your friends</Text>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Hangout Image</Text>
          <TouchableOpacity style={styles.imageUpload} onPress={handlePickImage}>
            {eventImage ? (
              <Image source={{ uri: eventImage }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color={Colors.grayMedium} />
                <Text style={styles.uploadText}>Upload Hangout Image</Text>
              </>
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
              <TextInput
                style={styles.input}
                value={eventDate}
                onChangeText={setEventDate}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={Colors.grayMedium}
              />
            </View>
            <View style={styles.dateTimeInput}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.input}
                value={eventTime}
                onChangeText={setEventTime}
                placeholder="--:-- --"
                placeholderTextColor={Colors.grayMedium}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            style={styles.input}
            value={searchQuery || locationAddress || locationName}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchLocations(text);
            }}
            placeholder="Start typing a location (e.g., Central Park, NYC)"
            placeholderTextColor={Colors.grayMedium}
          />

          {locationSuggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {locationSuggestions.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(loc)}
                >
                  <Ionicons name="location-outline" size={16} color={Colors.gray} />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionName}>{loc.name}</Text>
                    <Text style={styles.suggestionAddress}>{loc.address}</Text>
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
              <TextInput
                style={styles.input}
                value={gradientColor1}
                onChangeText={setGradientColor1}
                placeholder="#000000"
                placeholderTextColor={Colors.grayMedium}
              />
            </View>
            <View style={styles.colorInput}>
              <Text style={styles.inputLabel}>Color 2</Text>
              <TextInput
                style={styles.input}
                value={gradientColor2}
                onChangeText={setGradientColor2}
                placeholder="#000000"
                placeholderTextColor={Colors.grayMedium}
              />
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
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Event'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
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
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.grayMedium,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  uploadText: {
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginTop: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
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
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  suggestionText: {
    marginLeft: 8,
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
  },
  colorInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.grayMedium,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 6,
  },
});
