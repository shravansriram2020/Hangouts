import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
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
  const [loading, setLoading] = useState(false);

  const handleCreateRequest = async () => {
    if (!selectedOwer || !amount) {
      Alert.alert('Required', 'Please select a person and enter an amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/money', {
        eventId,
        owerId: selectedOwer,
        amount: parseFloat(amount),
        description,
      });

      setSelectedOwer('');
      setAmount('');
      setDescription('');
      onCreated();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedOwer('');
    setAmount('');
    setDescription('');
    onClose();
  };

  const otherAttendees = attendees?.filter((a: any) => true) || [];

  return (
    <GlassModal visible={visible} onClose={handleClose} title="Request Payment" fullHeight>
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Who owes you money?</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedOwer}
              onValueChange={setSelectedOwer}
              style={styles.picker}
            >
              <Picker.Item label="Select a person" value="" />
              {otherAttendees.map((attendee: any) => (
                <Picker.Item
                  key={attendee.id}
                  label={attendee.first_name}
                  value={attendee.id}
                />
              ))}
            </Picker>
          </View>
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
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateRequest}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Sending...' : 'Send Request'}
            </Text>
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
