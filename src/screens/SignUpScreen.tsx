import React, { useState } from 'react';
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

  const handleSignUp = async () => {
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
      await signUp({
        email,
        username,
        firstName,
        lastName,
        password,
        agreedToTerms,
        agreedToPrivacy,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
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
            onPress={handleSignUp}
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
});
