import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { Colors, Fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://docs.google.com/document/d/1z0lmETsm7Q2AfkAm6J8G2JNhin9Ldcuc12yXgyZM_S4/edit?usp=sharing';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://docs.google.com/document/d/1Zu47SM7RqdmfCxaQ4oO6BHhrIlYTXtdddGh0eBOt7G0/edit?usp=sharing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface CreditEntry {
  role: string;
  name: string;
}

interface CreditSection {
  title: string;
  entries: CreditEntry[];
}

const CREDITS_DATA: CreditSection[] = [
  {
    title: 'Hangouts Dev Team',
    entries: [
      { role: 'UI/UX, Feature Design, Concept', name: 'Jude Kerman' },
      { role: 'Testing, Feature Design, Concept', name: 'Shravan Sriram' },
      { role: 'Planning, Development', name: 'Deva Amruthurulu' },
    ],
  },
  {
    title: 'Development & Business Contributors',
    entries: [
      { role: 'Android Testing', name: 'Theodor Geertsen' },
      { role: 'Development Support', name: 'Tudor Marinescu' },
      { role: 'Business/Marketing Support', name: 'Jackson Siedon' },
    ],
  },
  {
    title: 'Brand Contributors',
    entries: [
      { role: 'Motion Graphics/Branding', name: 'David Kerman' },
      { role: 'Opening SFX', name: 'Lily Ross' },
    ],
  },
  {
    title: 'Advertisement Contributors',
    entries: [
      { role: '', name: 'Aiden Rohrbach' },
      { role: '', name: 'Dante Maritato' },
      { role: '', name: 'Dylan Milne' },
      { role: '', name: 'Sophia Romany' },
      { role: '', name: 'Mason Hayes' },
    ],
  },
  {
    title: 'Special Thanks',
    entries: [
      { role: '', name: 'Hangouts Team Friends, Family and Pets' },
      { role: '', name: 'Joseph Keays & Other AHS Staff' },
      { role: '', name: 'The Argylians' },
      { role: '', name: '' },
      { role: '', name: 'You! Thank you for supporting us!' },
    ],
  },
];

const creditsStyles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.grayMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  entry: {
    marginBottom: 10,
  },
  role: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.grayDark,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
  },
  nameOnly: {
    marginBottom: 4,
  },
});

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
  const [showCredits, setShowCredits] = useState(false);

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
    <>
    <GlassModal visible={visible} onClose={onClose} title="Settings" fullHeight>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color={Colors.grayMedium} />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={14} color={Colors.secondary} />
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
              <Ionicons name="play-outline" size={18} color={Colors.secondary} />
              <Text style={styles.actionButtonText}>Replay Tutorial</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={Colors.secondary} />
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
                <Ionicons name="trash-outline" size={14} color={Colors.secondary} />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Other</Text>

            <TouchableOpacity style={styles.creditsButton} onPress={() => setShowCredits(true)}>
              <Ionicons name="people-outline" size={16} color={Colors.grayDark} />
              <Text style={styles.creditsButtonText}>Credits</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.grayMedium} />
            </TouchableOpacity>

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
    </GlassModal>
    
    <GlassModal visible={showCredits} onClose={() => setShowCredits(false)} title="Credits" fullHeight>
      <View style={{ paddingVertical: 10 }}>
        {CREDITS_DATA.map((section, sectionIndex) => (
          <View key={sectionIndex} style={creditsStyles.section}>
            <Text style={creditsStyles.sectionTitle}>{section.title}</Text>
            {section.entries.map((entry, entryIndex) => (
              <View key={entryIndex} style={creditsStyles.entry}>
                {entry.role ? (
                  <>
                    <Text style={creditsStyles.role}>{entry.role}</Text>
                    <Text style={creditsStyles.name}>{entry.name}</Text>
                  </>
                ) : entry.name ? (
                  <Text style={[creditsStyles.name, creditsStyles.nameOnly]}>{entry.name}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </GlassModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changePhotoText: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginTop: 20,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.grayDark,
    fontFamily: 'Prompt-Medium',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  inputHelper: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 3,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  nameInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    padding: 14,
    borderRadius: 10,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.grayDark,
    fontFamily: 'Prompt-Regular',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  actionButtonText: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  link: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    textDecorationLine: 'underline',
    marginBottom: 10,
  },
  dangerZone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.redLight,
    padding: 14,
    borderRadius: 10,
  },
  dangerInfo: {
    flex: 1,
    marginRight: 12,
  },
  dangerTitle: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: 'Prompt-Medium',
  },
  dangerDescription: {
    fontSize: 11,
    color: Colors.red,
    fontFamily: 'Prompt-Regular',
    opacity: 0.8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  deleteButtonText: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginBottom: 20,
  },
  creditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  creditsButtonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.grayDark,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
});
