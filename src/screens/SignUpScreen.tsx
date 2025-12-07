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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';

interface Props {
  onSwitchToSignIn: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://docs.google.com/document/d/1z0lmETsm7Q2AfkAm6J8G2JNhin9Ldcuc12yXgyZM_S4/edit?usp=sharing';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://docs.google.com/document/d/1Zu47SM7RqdmfCxaQ4oO6BHhrIlYTXtdddGh0eBOt7G0/edit?usp=sharing';

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setStep('verify');
      setVerificationCode(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
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

      const data = await response.json();

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
      setError(err.message || 'Failed to verify code');
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setVerificationCode(['', '', '', '', '', '']);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
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
                  onPress={() => Linking.openURL(TERMS_URL)}
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
                  onPress={() => Linking.openURL(PRIVACY_URL)}
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
});
