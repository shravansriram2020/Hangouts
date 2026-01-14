import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import GlassModal from './GlassModal';
import FriendsListModal from './FriendsListModal';

const PRIVACY_POLICY_CONTENT = `Effective Date: January 14, 2026

This Privacy Policy describes how Hangouts ("the App," "we," "us," or "our") collects, uses, and protects personal information when users access or interact with our services.

1. Information We Collect

We collect the following categories of information to operate and enhance our services:

• Personal Information: First and last name, email address, and username.
• Location Data: Real-time location (when enabled) and specific location coordinates associated with content you choose to post.
• User Content: Images, captions, and location tags you upload to the Explore Page.
• Friends' Data: First and last names, email addresses, and usernames of contacts you choose to connect with.

2. Use of Information

Collected information is used to:

• Enable user interactions and friend visibility features.
• Facilitate real-time location sharing and the "Explore Page" posting feature.
• Display usernames and shared content to your selected audience (Friends or Everyone).
• Maintain, improve, and personalize the App's functionality and user experience.
• Ensure security, integrity, and reliability of services.

3. Information Sharing and Visibility

We provide different levels of visibility depending on how you use the App:

• Usernames: Your username is publicly visible to all users of the App.
• Event Participation: First and last names are visible only to participants within the same event.
• Location Sharing: Real-time location data is visible solely to approved friends and only when the user has opted in.
• Explore Page Posts: If you share to "Friends Only," your image, username, and the hangout location are visible only to your confirmed friends. If you share to "Everyone," your image, username, and the hangout location are visible to all users of the Hangouts App.

Hangouts does not sell, rent, or commercially share personal information with third parties.

4. Explore Page Content Guidelines

Users are expected to contribute to a safe community. When sharing images and locations:

• Ensure you have permission from others appearing in your photos.
• Avoid sharing images that reveal sensitive private locations (e.g., your home address).
• All content must comply with our Terms of Service regarding prohibited or harmful material.

5. Data Security

Appropriate technical and organizational measures are implemented to protect personal data against unauthorized access, alteration, disclosure, or destruction. While these measures meet industry standards, no system is completely secure, and users acknowledge inherent risks in transmitting data electronically.

6. User Controls and Data Management

Users maintain control over their data through the following:

• Toggle Sharing: Enable or disable real-time location sharing at any time.
• Post Management: Users can delete their Explore Page posts at any time, which removes the image and associated location data from the feed.
• Account Updates: Update or delete personal information within account settings.
• Data Deletion: Request permanent data deletion in accordance with applicable data protection laws.

7. Children's Privacy

The App is not directed toward individuals under the age of 13. We do not knowingly collect personal data from minors. If such data is inadvertently collected, it will be promptly deleted upon discovery.

8. Policy Updates

This Privacy Policy may be updated periodically to reflect changes in our practices or for legal, regulatory, or operational reasons. Updates will be communicated by revising the "Effective Date" above. Continued use of the App constitutes acceptance of the updated policy.`;

const TERMS_OF_SERVICE_CONTENT = `Last Updated: January 14, 2026

These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Hangouts ("Company," "we," "us," or "our") governing your access to and use of the Hangouts mobile application, website, and related services (collectively, the "Service"). By accessing, downloading, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you may not access or use the Service.

1. Eligibility

You must be at least thirteen (13) years of age to create an account or use the Service. By accessing or using Hangouts, you represent and warrant that you are legally permitted to do so and that all information you provide is accurate and truthful. If you are using the Service on behalf of an entity, you represent that you have authority to bind that entity to these Terms.

2. Account Registration and Security

To use certain features of Hangouts, you must register for an account. By doing so, you agree to:

• Provide complete, accurate, and current information, including your first and last name, email address, and location data;
• Maintain the confidentiality of your login credentials and restrict access to your account;
• Accept full responsibility for all activities that occur under your account.

You agree to notify us immediately of any unauthorized access or suspected breach of security. Hangouts shall not be liable for any loss or damage arising from your failure to maintain the security of your account.

3. Privacy and Data Usage

Your use of Hangouts is subject to our Privacy Policy, which describes how we collect, use, disclose, and safeguard your information. By using the Service, you consent to our data practices as outlined in that policy.

We collect personal information such as your name, email, and location. Location data is only shared with friends when both parties have explicitly enabled location sharing, or when you choose to post to the Explore Page as described in Section 6. You acknowledge and agree that Hangouts may process and store data on servers located within or outside your country of residence.

4. User Conduct and Responsibilities

You are solely responsible for your interactions, content, and behavior while using the Service. You agree not to:

• Use the Service in violation of any applicable law, regulation, or third-party right;
• Upload, post, or transmit any unlawful, defamatory, obscene, or harmful content;
• Engage in harassment, stalking, or abuse of other users;
• Impersonate any person or entity, or misrepresent your affiliation with any individual or organization;
• Interfere with or disrupt the integrity, performance, or security of the Service;
• Attempt to gain unauthorized access to any systems or data connected to Hangouts.

5. Location Sharing

The Service includes optional location-sharing features that allow users to view the real-time or recent locations of their friends. By enabling this feature, you expressly consent to share your location with selected users. You may disable location sharing at any time within the app's settings. You acknowledge that accuracy of location data cannot be guaranteed and that Hangouts is not liable for any reliance placed on such data.

6. Explore Page and Shared Content

The Service provides an "Explore Page" feature that allows you to share images and details of your activities ("Hangouts") with a broader audience.

• Sharing Options: When you post to the Explore Page, you may choose to share your post with "Friends Only" or with "Everyone" (the general Hangouts community).
• Visibility: By posting to the Explore Page, you acknowledge and agree that your username, the image provided, and the specific location of the Hangout will be visible to the audience you have selected.
• User Responsibility: You are solely responsible for the content you post. Because Explore posts include location data, we urge you to exercise caution and discretion when sharing your real-world coordinates.

7. Explore Post Guidelines

To maintain a safe and positive community, all content shared on the Explore Page must adhere to the following standards. We reserve the right to remove any post or terminate accounts that violate these guidelines:

• Respect Privacy: Do not post images of others without their express consent.
• Safety First: Do not share sensitive or private information of third parties. Content intended to bully, harass, stalk, or intimidate is strictly prohibited.
• Appropriate Content: Do not post sexually explicit, pornographic, excessively violent, or illegal content.
• Authenticity: Do not post "spam" or misleading content. Posts should represent genuine Hangouts and locations.
• Ownership: Only post images that you own or have the legal right to share.

8. Intellectual Property Rights

All intellectual property rights in and to the Service—including its design, interface, software, text, graphics, logos, and trademarks—are owned by Hangouts or its licensors.

User Content License: By posting content (including images) to the Explore Page or elsewhere on the Service, you grant Hangouts a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to use, store, display, reproduce, and distribute your content solely for the purposes of operating and providing the Service.

9. Suspension and Termination

We may, at our sole discretion and without prior notice, suspend or terminate your access to the Service if we reasonably believe you have violated these Terms, engaged in fraudulent or illegal conduct, or otherwise acted in a manner detrimental to the Service or other users.

Upon termination, all rights granted to you under these Terms will immediately cease. Certain provisions—including Sections 3, 8, 10, 11, and 12—shall survive termination.

10. Disclaimers

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT ANY WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, HANGOUTS DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.

11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL HANGOUTS, ITS AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, PROFITS, OR REPUTATION, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.

OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID (IF ANY) FOR ACCESS TO THE SERVICE DURING THE SIX (6) MONTHS PRECEDING THE CLAIM.

12. Governing Law and Dispute Resolution

These Terms shall be governed by the laws of the State of California. Any dispute shall first be attempted to be resolved through good-faith negotiations. If no resolution is reached, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association in Los Angeles County, California. You agree to waive any right to participate in class actions.

13. Changes to These Terms

We reserve the right to modify or update these Terms at any time. Material changes will be communicated through the Service or via email. Continued use of the Service after such modifications constitutes your acceptance of the revised Terms.

By accessing or using Hangouts, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.`;

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
      { role: 'Business/Marketing Support', name: 'Jackson Sieden' },
      { role: 'Testing, Security, Backend', name: 'Reda Darwiche' },
    ],
  },
  {
    title: 'Brand',
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
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  entry: {
    marginBottom: 10,
    alignItems: 'center',
  },
  role: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.grayMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  name: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    textAlign: 'center',
  },
  nameOnly: {
    marginBottom: 3,
  },
  nameOnlyCompact: {
    marginBottom: 1,
  },
});

export default function SettingsModal({ visible, onClose }: Props) {
  const { user, updateUser, signOut } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [locationEnabled, setLocationEnabled] = useState(user?.locationEnabled || false);
  const [exploreVisibility, setExploreVisibility] = useState<'public' | 'friends'>(user?.exploreVisibility || 'public');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentView, setCurrentView] = useState<'settings' | 'credits' | 'privacy' | 'terms'>('settings');
  const [showFriendsList, setShowFriendsList] = useState(false);
  
  const creditsAnimValue = useRef(new Animated.Value(0)).current;
  const creditsSlideValue = useRef(new Animated.Value(30)).current;

  const handleClose = () => {
    setUsername(user?.username || '');
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setProfilePhoto(user?.profilePhoto || '');
    setLocationEnabled(user?.locationEnabled || false);
    setExploreVisibility(user?.exploreVisibility || 'public');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentView('settings');
    creditsAnimValue.setValue(0);
    creditsSlideValue.setValue(30);
    onClose();
  };

  const openCredits = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentView('credits');
    Animated.parallel([
      Animated.spring(creditsAnimValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.spring(creditsSlideValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
    ]).start();
  };

  const closeCredits = () => {
    Animated.parallel([
      Animated.timing(creditsAnimValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(creditsSlideValue, {
        toValue: 30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentView('settings');
    });
  };

  const openLegalView = (view: 'privacy' | 'terms') => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentView(view);
    Animated.parallel([
      Animated.spring(creditsAnimValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.spring(creditsSlideValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
    ]).start();
  };

  const closeLegalView = () => {
    Animated.parallel([
      Animated.timing(creditsAnimValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(creditsSlideValue, {
        toValue: 30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentView('settings');
    });
  };

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
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      const photoData = `data:${mimeType};base64,${result.assets[0].base64}`;
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
        exploreVisibility,
      });

      if (newPassword && newPassword === confirmPassword) {
        await api.put('/users/password', { newPassword, confirmPassword });
        setNewPassword('');
        setConfirmPassword('');
      }

      updateUser({ username, firstName, lastName, profilePhoto, locationEnabled, exploreVisibility });
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

  if (currentView === 'privacy' || currentView === 'terms') {
    const isPrivacy = currentView === 'privacy';
    const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
    const content = isPrivacy ? PRIVACY_POLICY_CONTENT : TERMS_OF_SERVICE_CONTENT;
    
    return (
      <GlassModal key={currentView} visible={visible} onClose={handleClose} title={title} fullHeight>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 8 }}
          onPress={closeLegalView}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.secondary} />
          <Text style={{ fontFamily: Fonts.medium, color: Colors.secondary, marginLeft: 4 }}>Back to Settings</Text>
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false} style={{ paddingBottom: 40 }}>
          <Animated.View style={{ 
            opacity: creditsAnimValue,
            transform: [{ translateY: creditsSlideValue }]
          }}>
            <Text style={{ 
              fontFamily: Fonts.regular, 
              fontSize: 14, 
              color: Colors.secondary, 
              lineHeight: 22,
              paddingBottom: 40
            }}>
              {content}
            </Text>
          </Animated.View>
        </ScrollView>
      </GlassModal>
    );
  }

  if (currentView === 'credits') {
    return (
      <GlassModal key="credits" visible={visible} onClose={handleClose} title="Credits" fullHeight>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 8 }}
          onPress={closeCredits}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.secondary} />
          <Text style={{ fontFamily: Fonts.medium, color: Colors.secondary, marginLeft: 4 }}>Back to Settings</Text>
        </TouchableOpacity>
        <Animated.View style={{ 
          paddingBottom: 20, 
          opacity: creditsAnimValue,
          transform: [{ translateY: creditsSlideValue }]
        }}>
          {CREDITS_DATA.map((section, sectionIndex) => {
            const isCompactSection = section.title === 'Advertisement Contributors' || section.title === 'Special Thanks';
            return (
              <Animated.View 
                key={sectionIndex} 
                style={[
                  creditsStyles.section,
                  {
                    opacity: creditsAnimValue,
                    transform: [{
                      translateY: creditsSlideValue.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 15 + sectionIndex * 5],
                      })
                    }]
                  }
                ]}
              >
                <Text style={creditsStyles.sectionTitle}>{section.title}</Text>
                {section.entries.map((entry, entryIndex) => (
                  <View key={entryIndex} style={isCompactSection ? { marginBottom: 4 } : creditsStyles.entry}>
                    {entry.role ? (
                      <>
                        <Text style={creditsStyles.role}>{entry.role}</Text>
                        <Text style={creditsStyles.name}>{entry.name}</Text>
                      </>
                    ) : entry.name ? (
                      <Text style={[creditsStyles.name, isCompactSection ? creditsStyles.nameOnlyCompact : creditsStyles.nameOnly]}>{entry.name}</Text>
                    ) : null}
                  </View>
                ))}
              </Animated.View>
            );
          })}
        </Animated.View>
      </GlassModal>
    );
  }

  return (
    <GlassModal key="settings" visible={visible} onClose={handleClose} title="Settings" fullHeight>
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

            <View style={styles.exploreVisibilitySection}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Explore Post Preferences</Text>
                <Text style={styles.switchDescription}>Choose who sees your posts</Text>
              </View>
              <View style={styles.visibilityOptions}>
                <TouchableOpacity
                  style={[
                    styles.visibilityOption,
                    exploreVisibility === 'public' && styles.visibilityOptionActive
                  ]}
                  onPress={() => setExploreVisibility('public')}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={16} 
                    color={exploreVisibility === 'public' ? Colors.white : Colors.secondary} 
                  />
                  <Text style={[
                    styles.visibilityOptionText,
                    exploreVisibility === 'public' && styles.visibilityOptionTextActive
                  ]}>Everyone</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.visibilityOption,
                    exploreVisibility === 'friends' && styles.visibilityOptionActive
                  ]}
                  onPress={() => setExploreVisibility('friends')}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="heart-outline" 
                    size={16} 
                    color={exploreVisibility === 'friends' ? Colors.white : Colors.secondary} 
                  />
                  <Text style={[
                    styles.visibilityOptionText,
                    exploreVisibility === 'friends' && styles.visibilityOptionTextActive
                  ]}>Friends only</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.friendsButton} onPress={() => setShowFriendsList(true)}>
              <Ionicons name="heart-outline" size={16} color={Colors.grayDark} />
              <Text style={styles.friendsButtonText}>Friends List</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.grayMedium} />
            </TouchableOpacity>

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

            <TouchableOpacity style={styles.legalButton} onPress={() => openLegalView('terms')}>
              <Ionicons name="document-text-outline" size={16} color={Colors.grayDark} />
              <Text style={styles.legalButtonText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.grayMedium} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.legalButton} onPress={() => openLegalView('privacy')}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.grayDark} />
              <Text style={styles.legalButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.grayMedium} />
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

            <TouchableOpacity style={styles.creditsButton} onPress={openCredits}>
              <Ionicons name="people-outline" size={16} color={Colors.grayDark} />
              <Text style={styles.creditsButtonText}>Credits</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.grayMedium} />
            </TouchableOpacity>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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

      <FriendsListModal
        visible={showFriendsList}
        onClose={() => setShowFriendsList(false)}
      />
    </GlassModal>
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
  exploreVisibilitySection: {
    backgroundColor: Colors.grayLight,
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  visibilityOptions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.grayMedium,
  },
  visibilityOptionActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  visibilityOptionText: {
    fontSize: 13,
    fontFamily: 'Prompt-Medium',
    color: Colors.secondary,
  },
  visibilityOptionTextActive: {
    color: Colors.white,
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
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  friendsButtonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.grayDark,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  legalButtonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.grayDark,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
});
