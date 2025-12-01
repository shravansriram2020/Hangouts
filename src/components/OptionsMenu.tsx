import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  isHost: boolean;
  attendees: any[];
  onEventDeleted: () => void;
  onAttendeeRemoved: () => void;
  onGradientChange?: () => void;
}

export default function OptionsMenu({
  visible,
  onClose,
  eventId,
  isHost,
  attendees,
  onEventDeleted,
  onAttendeeRemoved,
  onGradientChange,
}: Props) {
  const [showRemoveAttendee, setShowRemoveAttendee] = useState(false);
  const [removing, setRemoving] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible]);

  const handleDeleteEvent = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/events/${eventId}`);
              onEventDeleted();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handleRemoveAttendee = async (attendeeId: string, attendeeName: string) => {
    Alert.alert(
      'Remove Attendee',
      `Remove ${attendeeName} from this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await api.delete(`/events/${eventId}/attendees/${attendeeId}`);
              onAttendeeRemoved();
              setShowRemoveAttendee(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove attendee');
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
          <Animated.View 
            style={[styles.menuContainer, { transform: [{ translateY: slideAnim }] }]} 
            onTouchEnd={() => {}}
          >
            <TouchableOpacity onPress={() => {}} activeOpacity={1}>
              {isHost && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      attendees.length === 0 && styles.menuItemDisabled,
                    ]}
                    onPress={() => setShowRemoveAttendee(true)}
                    disabled={attendees.length === 0}
                  >
                    <Ionicons 
                      name="person-remove-outline" 
                      size={18} 
                      color={attendees.length === 0 ? Colors.grayMedium : Colors.secondary} 
                    />
                    <Text 
                      style={[
                        styles.menuItemText,
                        attendees.length === 0 && styles.menuItemTextDisabled,
                      ]}
                    >
                      Remove Attendees
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onGradientChange?.();
                    }}
                  >
                    <Ionicons name="color-palette-outline" size={18} color={Colors.secondary} />
                    <Text style={styles.menuItemText}>Change Background</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemDanger]}
                    onPress={() => {
                      onClose();
                      handleDeleteEvent();
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.red} />
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Event</Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showRemoveAttendee} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowRemoveAttendee(false)}
          activeOpacity={1}
        >
          <View style={styles.removeAttendeeModal}>
            <View style={styles.removeAttendeeHeader}>
              <Text style={styles.removeAttendeeTitle}>Remove Attendees</Text>
              <TouchableOpacity onPress={() => setShowRemoveAttendee(false)}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.removeAttendeeList} showsVerticalScrollIndicator={false}>
              {attendees.map((attendee) => (
                <TouchableOpacity
                  key={attendee.id}
                  style={styles.attendeeItem}
                  onPress={() =>
                    handleRemoveAttendee(attendee.id, attendee.first_name)
                  }
                  disabled={removing}
                >
                  <View style={styles.attendeeInfo}>
                    {attendee.profile_photo ? (
                      <Image
                        source={{ uri: attendee.profile_photo }}
                        style={styles.attendeeAvatar}
                      />
                    ) : (
                      <View style={styles.attendeeAvatarPlaceholder}>
                        <Text style={styles.attendeeInitial}>
                          {attendee.first_name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.attendeeName}>{attendee.first_name}</Text>
                  </View>
                  <Ionicons name="trash-outline" size={18} color={Colors.red} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 58, 95, 0.05)',
  },
  menuItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginLeft: 12,
  },
  menuItemTextDanger: {
    color: Colors.red,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemTextDisabled: {
    color: Colors.grayMedium,
  },
  removeAttendeeModal: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '80%',
  },
  removeAttendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  removeAttendeeTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
  },
  removeAttendeeList: {
    flex: 1,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  attendeeAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeInitial: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
});
