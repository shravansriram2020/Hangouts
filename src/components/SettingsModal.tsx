import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://docs.google.com/document/d/1z0lmETsm7Q2AfkAm6J8G2JNhin9Ldcuc12yXgyZM_S4/edit?usp=sharing';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://docs.google.com/document/d/1Zu47SM7RqdmfCxaQ4oO6BHhrIlYTXtdddGh0eBOt7G0/edit?usp=sharing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: Props) {
  const { user, updateUser, signOut } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [locationEnabled, setLocationEnabled] = useState(user?.locationEnabled || false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setProfilePhoto(user.profilePhoto || '');
      setLocationEnabled(user.locationEnabled || false);
    }
  }, [user]);

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
      setProfilePhoto(photoData);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', {
        username,
        firstName,
        lastName,
        profilePhoto,
        locationEnabled,
      });

      if (newPassword && newPassword === confirmPassword) {
        await api.put('/users/password', { newPassword, confirmPassword });
        setNewPassword('');
        setConfirmPassword('');
      }

      updateUser({ username, firstName, lastName, profilePhoto, locationEnabled });
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/account');
              signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleReplayTutorial = () => {
    onClose();
    updateUser({ tutorialCompleted: false });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="settings-outline" size={24} color={Colors.secondary} />
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color={Colors.grayMedium} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage}>
              <Ionicons name="camera-outline" size={16} color={Colors.secondary} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Text style={styles.inputHelper}>Your unique username for invitations and sharing</Text>
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, styles.nameInput]}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.inputGroup, styles.nameInput]}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Location & Privacy</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Share Location</Text>
              <Text style={styles.switchDescription}>Allow friends to see your location for events</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: Colors.grayLight, true: Colors.greenLight }}
              thumbColor={locationEnabled ? Colors.green : Colors.grayMedium}
            />
          </View>

          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor={Colors.grayMedium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={Colors.grayMedium}
            />
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={handleReplayTutorial}>
            <Ionicons name="play-outline" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Replay Tutorial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Legal & Privacy</Text>

          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <View style={styles.dangerZone}>
            <View style={styles.dangerInfo}>
              <Text style={styles.dangerTitle}>Delete Account</Text>
              <Text style={styles.dangerDescription}>
                Permanently delete your account and all data
              </Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={16} color={Colors.red} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>Version 1.0</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginTop: 24,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  inputHelper: {
    fontSize: 11,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    padding: 16,
    borderRadius: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  link: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  dangerZone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.redLight,
    padding: 16,
    borderRadius: 12,
  },
  dangerInfo: {
    flex: 1,
    marginRight: 16,
  },
  dangerTitle: {
    fontSize: 14,
    color: Colors.red,
    fontFamily: 'Prompt-Medium',
  },
  dangerDescription: {
    fontSize: 12,
    color: Colors.red,
    fontFamily: 'Prompt-Regular',
    opacity: 0.8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  deleteButtonText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grayLight,
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
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginBottom: 40,
  },
});
