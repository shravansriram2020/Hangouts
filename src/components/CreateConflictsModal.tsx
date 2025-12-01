import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  onCreated: () => void;
}

export default function CreateConflictsModal({ visible, onClose, eventId, onCreated }: Props) {
  const [conflictType, setConflictType] = useState('time');
  const [description, setDescription] = useState('');

  const handleCreateConflict = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a conflict description');
      return;
    }

    // Optimistically close and update UI
    setDescription('');
    onCreated();
    onClose();

    // Make API call in background
    try {
      await api.post('/conflicts', {
        eventId,
        type: conflictType,
        description: description.trim(),
        suggestedValue: description.trim(),
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create conflict');
    }
  };

  const handleClose = () => {
    setDescription('');
    setConflictType('time');
    onClose();
  };

  return (
    <GlassModal visible={visible} onClose={handleClose} title="Report a Conflict" fullHeight>
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Conflict Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={conflictType}
              onValueChange={setConflictType}
              style={styles.picker}
            >
              <Picker.Item label="Time Conflict" value="time" />
              <Picker.Item label="Location Conflict" value="location" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the conflict or suggest a new time/location..."
            placeholderTextColor={Colors.grayMedium}
            multiline
            numberOfLines={5}
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
            onPress={handleCreateConflict}
          >
            <Text style={styles.submitButtonText}>Report Conflict</Text>
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
  textArea: {
    paddingTop: 12,
    textAlignVertical: 'top',
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
  submitButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
