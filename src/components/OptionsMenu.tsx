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
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import NativeGradientPicker from './NativeGradientPicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  isHost: boolean;
  attendees: any[];
  onEventDeleted: () => void;
  onAttendeeRemoved: () => void;
  onGradientChange?: (color1: string, color2: string) => void;
  onTitleChange?: (newTitle: string) => void;
  currentTitle?: string;
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
  onTitleChange,
  currentTitle,
}: Props) {
  const [showRemoveAttendee, setShowRemoveAttendee] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const titleSlideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
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

  useEffect(() => {
    if (showTitleEdit) {
      setNewTitle(currentTitle || '');
      Animated.spring(titleSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    } else {
      titleSlideAnim.setValue(400);
    }
  }, [showTitleEdit]);

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, { title: newTitle.trim() });
      onTitleChange?.(newTitle.trim());
      setShowTitleEdit(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update title');
    } finally {
      setSaving(false);
    }
  };

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
                      attendees.length <= 1 && styles.menuItemDisabled,
                    ]}
                    onPress={() => setShowRemoveAttendee(true)}
                    disabled={attendees.length <= 1}
                  >
                    <Ionicons 
                      name="person-remove-outline" 
                      size={18} 
                      color={attendees.length <= 1 ? Colors.grayMedium : Colors.secondary} 
                    />
                    <Text 
                      style={[
                        styles.menuItemText,
                        attendees.length <= 1 && styles.menuItemTextDisabled,
                      ]}
                    >
                      Remove Attendees
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      setTimeout(() => setShowTitleEdit(true), 100);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={Colors.secondary} />
                    <Text style={styles.menuItemText}>Change Hangout Title</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      setTimeout(() => setShowGradientPicker(true), 100);
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

      <NativeGradientPicker
        visible={showGradientPicker}
        onClose={() => setShowGradientPicker(false)}
        onSelect={(color1, color2) => {
          onGradientChange?.(color1, color2);
        }}
        title="Choose Background"
      />

      <Modal visible={showTitleEdit} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setShowTitleEdit(false)}
        >
          <Animated.View 
            style={[styles.titleEditModal, { transform: [{ translateY: titleSlideAnim }] }]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.titleEditHeader}>
                <Text style={styles.titleEditTitle}>Change Hangout Title</Text>
                <TouchableOpacity onPress={() => setShowTitleEdit(false)}>
                  <Ionicons name="close" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.titleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Enter new title"
                placeholderTextColor={Colors.grayMedium}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveTitle}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
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
  titleEditModal: {
    backgroundColor: Colors.white,
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleEditTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
  },
  titleInput: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: Fonts.regular,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
  },
});
