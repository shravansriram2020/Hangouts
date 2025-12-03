import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  attendees: any[];
  onCreated: () => void;
}

export default function CreateMoneyModal({ visible, onClose, eventId, attendees, onCreated }: Props) {
  const [selectedOwer, setSelectedOwer] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showAttendeesList, setShowAttendeesList] = useState(false);

  const selectedAttendee = attendees?.find(a => a.id === selectedOwer);

  const handleCreateRequest = async () => {
    if (!selectedOwer || !amount) {
      Alert.alert('Required', 'Please select a person and enter an amount');
      return;
    }

    // Optimistically close and update UI
    setSelectedOwer('');
    setAmount('');
    setDescription('');
    onCreated();
    onClose();

    // Make API call in background
    try {
      await api.post('/money', {
        eventId,
        owerId: selectedOwer,
        amount: parseFloat(amount),
        description,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    }
  };

  const handleClose = () => {
    setSelectedOwer('');
    setAmount('');
    setDescription('');
    onClose();
  };

  const otherAttendees = attendees?.filter((a: any) => true) || [];
  const hasAttendees = attendees && attendees.length > 0;

  return (
    <GlassModal visible={visible} onClose={handleClose} title="Request Payment" fullHeight>
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Who owes you money?</Text>
          {Platform.OS === 'ios' ? (
            <>
              <TouchableOpacity 
                style={styles.attendeeSelector}
                onPress={() => hasAttendees && setShowAttendeesList(!showAttendeesList)}
                disabled={!hasAttendees}
              >
                {selectedAttendee ? (
                  <View style={styles.selectedAttendeeRow}>
                    {selectedAttendee.profile_photo ? (
                      <Image source={{ uri: selectedAttendee.profile_photo }} style={styles.attendeeAvatar} />
                    ) : (
                      <View style={styles.attendeeAvatarPlaceholder}>
                        <Text style={styles.attendeeInitial}>{selectedAttendee.first_name?.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.attendeeName}>{selectedAttendee.first_name}</Text>
                  </View>
                ) : (
                  <Text style={styles.attendeePlaceholder}>
                    {hasAttendees ? 'Tap to select a person' : 'No attendees added'}
                  </Text>
                )}
                <Ionicons name="chevron-down" size={20} color={Colors.gray} />
              </TouchableOpacity>
              {showAttendeesList && hasAttendees && (
                <ScrollView style={styles.attendeesList} nestedScrollEnabled>
                  {otherAttendees.map((attendee: any) => (
                    <TouchableOpacity
                      key={attendee.id}
                      style={[
                        styles.attendeeItem,
                        selectedOwer === attendee.id && styles.attendeeItemSelected
                      ]}
                      onPress={() => {
                        setSelectedOwer(attendee.id);
                        setShowAttendeesList(false);
                      }}
                    >
                      {attendee.profile_photo ? (
                        <Image source={{ uri: attendee.profile_photo }} style={styles.attendeeAvatar} />
                      ) : (
                        <View style={styles.attendeeAvatarPlaceholder}>
                          <Text style={styles.attendeeInitial}>{attendee.first_name?.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={styles.attendeeName}>{attendee.first_name}</Text>
                      {selectedOwer === attendee.id && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.green} style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedOwer}
                onValueChange={setSelectedOwer}
                style={styles.picker}
                enabled={hasAttendees}
              >
                <Picker.Item label={hasAttendees ? "Select a person" : "No attendees added"} value="" />
                {otherAttendees.map((attendee: any) => (
                  <Picker.Item
                    key={attendee.id}
                    label={attendee.first_name}
                    value={attendee.id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.grayMedium}
            editable={hasAttendees}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>What for? (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., dinner split, gas money..."
            placeholderTextColor={Colors.grayMedium}
            editable={hasAttendees}
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
            style={[styles.submitButton, !hasAttendees && styles.submitButtonDisabled]}
            onPress={handleCreateRequest}
            disabled={!hasAttendees}
          >
            <Text style={styles.submitButtonText}>Send Request</Text>
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
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  attendeeSelector: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedAttendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendeePlaceholder: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
  },
  attendeesList: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginTop: 8,
    maxHeight: 180,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  attendeeItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  attendeeAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attendeeInitial: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
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
    opacity: 0.5,
    backgroundColor: Colors.grayMedium,
  },
  submitButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
