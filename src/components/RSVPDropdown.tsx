import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';
import { api } from '../services/api';

interface Props {
  eventId: string;
  userId: string;
  onStatusChanged: () => void;
}

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going', icon: 'checkmark-circle', color: Colors.green },
  { value: 'maybe', label: 'Maybe', icon: 'help-circle', color: Colors.yellow },
  { value: 'not_going', label: 'Not Going', icon: 'close-circle', color: Colors.red },
];

export default function RSVPDropdown({ eventId, userId, onStatusChanged }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRSVP = async (status: string) => {
    setLoading(true);
    try {
      await api.post(`/events/${eventId}/rsvp`, {
        status,
      });
      setShowMenu(false);
      onStatusChanged();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update RSVP status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.rsvpButton}
        onPress={() => setShowMenu(true)}
        disabled={loading}
      >
        <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        <Text style={styles.rsvpButtonText}>RSVP</Text>
      </TouchableOpacity>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <View style={styles.dropdownMenu}>
            {RSVP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => handleRSVP(option.value)}
                disabled={loading}
              >
                <Ionicons name={option.icon as any} size={18} color={option.color} />
                <Text style={styles.dropdownItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(90, 172, 230, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  rsvpButtonText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 140,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
});
