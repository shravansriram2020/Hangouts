import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { Colors, Fonts } from '../../constants/theme';

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
  onSwitchToSignIn: () => void;
}

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configApiUrl) {
    return configApiUrl;
  }
  return 'https://api.hangouts-app.com/api';
};

const API_URL = getApiUrl();

export default function SignUpScreen({ onSwitchToSignIn }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  const handleSendCode = async () => {
    if (!email || !username || !firstName || !lastName || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          firstName,
          lastName,
          password,
          agreedToTerms,
          agreedToPrivacy,
        }),
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Unable to connect to server. Please check your connection.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setStep('verify');
      if (data.devCode) {
        const codeDigits = data.devCode.toString().split('');
        setVerificationCode(codeDigits);
      } else {
        setVerificationCode(['', '', '', '', '', '']);
      }
    } catch (err: any) {
      if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError(err.message || 'Failed to send verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          username,
          firstName,
          lastName,
          password,
          agreedToTerms,
          agreedToPrivacy,
        }),
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Unable to connect to server. Please check your connection.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      await signUp({
        email,
        username,
        firstName,
        lastName,
        password,
        agreedToTerms,
        agreedToPrivacy,
        token: data.token,
        user: data.user,
      });
    } catch (err: any) {
      if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError(err.message || 'Failed to verify code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          firstName,
          lastName,
          password,
          agreedToTerms,
          agreedToPrivacy,
        }),
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Unable to connect to server. Please check your connection.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setVerificationCode(['', '', '', '', '', '']);
      setError('');
    } catch (err: any) {
      if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError(err.message || 'Failed to resend code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      const chars = text.split('').slice(0, 6 - index);
      const newCode = [...verificationCode];
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + chars.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = text;
      setVerificationCode(newCode);
      if (text && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const CheckBox = ({
    checked,
    onPress,
    children,
  }: {
    checked: boolean;
    onPress: () => void;
    children: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
      </View>
      <View style={styles.checkboxLabel}>{children}</View>
    </TouchableOpacity>
  );

  if (step === 'verify') {
    return (
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/Untitled design (6)_1762746470600_1764548145064.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.tagline}>Verify Your Email</Text>

            <Text style={styles.verifyMessage}>
              We've sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { codeInputRefs.current[index] = ref; }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text.replace(/[^0-9]/g, ''), index)}
                  onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Verify & Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('form')}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.secondary} />
              <Text style={styles.backText}>Back to sign up</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/Untitled design (6)_1762746470600_1764548145064.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.tagline}>Connect, Plan, Sync Together</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.grayMedium}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.grayMedium}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.inputContainer, styles.nameInput]}>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={Colors.grayMedium}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.inputContainer, styles.nameInput]}>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={Colors.grayMedium}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.grayMedium}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={Colors.gray}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.agreementContainer}>
            <CheckBox
              checked={agreedToTerms}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <Text style={styles.agreementText}>
                I agree to the{' '}
                <Text
                  style={styles.link}
                  onPress={() => setLegalModalType('terms')}
                >
                  Terms of Service
                </Text>
              </Text>
            </CheckBox>

            <CheckBox
              checked={agreedToPrivacy}
              onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
            >
              <Text style={styles.agreementText}>
                I agree to the{' '}
                <Text
                  style={styles.link}
                  onPress={() => setLegalModalType('privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </CheckBox>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToSignIn}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={legalModalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLegalModalType(null)}
      >
        <BlurView intensity={20} style={styles.legalModalOverlay}>
          <SafeAreaView style={styles.legalModalContainer}>
            <View style={styles.legalModalHeader}>
              <Text style={styles.legalModalTitle}>
                {legalModalType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </Text>
              <TouchableOpacity
                style={styles.legalModalClose}
                onPress={() => setLegalModalType(null)}
              >
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.legalModalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.legalModalText}>
                {legalModalType === 'terms' ? TERMS_OF_SERVICE_CONTENT : PRIVACY_POLICY_CONTENT}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 280,
    height: 80,
  },
  tagline: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Prompt-Regular',
  },
  verifyMessage: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Prompt-Regular',
    lineHeight: 24,
  },
  emailHighlight: {
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  errorText: {
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Prompt-Regular',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.black,
    fontFamily: 'Prompt-Regular',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  agreementContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.grayMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    flex: 1,
  },
  agreementText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  link: {
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    textDecorationLine: 'underline',
  },
  createButton: {
    backgroundColor: Colors.backgroundGradientEnd,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
  },
  signInLink: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    textDecorationLine: 'underline',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 12,
    fontSize: 24,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    color: Colors.secondary,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    textDecorationLine: 'underline',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  backText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: 'Prompt-Medium',
  },
  legalModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  legalModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  legalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  legalModalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
    color: Colors.secondary,
  },
  legalModalClose: {
    padding: 4,
  },
  legalModalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  legalModalText: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: Colors.secondary,
    lineHeight: 22,
    paddingBottom: 40,
  },
});
