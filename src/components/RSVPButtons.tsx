import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';

interface Props {
  eventId: string;
  currentStatus: string | null;
  isHost: boolean;
  onStatusChanged: (status: string | null, removed?: boolean) => void;
}

export default function RSVPButtons({ eventId, currentStatus, isHost, onStatusChanged }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  if (isHost || currentStatus === 'accepted') {
    return null;
  }

  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(status);
    
    try {
      const response = await api.post(`/events/${eventId}/rsvp`, { status });
      
      if (status === 'not_going') {
        onStatusChanged(null, true);
      } else {
        onStatusChanged(status === 'going' ? 'accepted' : 'maybe');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update RSVP');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Are you attending?</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => handleRSVP('going')}
          disabled={loading !== null}
        >
          <BlurView intensity={60} tint="light" style={styles.button}>
            {loading === 'going' ? (
              <ActivityIndicator size="small" color={Colors.green} />
            ) : (
              <>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={28} color={Colors.green} />
                </View>
                <Text style={[styles.buttonText, { color: Colors.green }]}>Going</Text>
              </>
            )}
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => handleRSVP('maybe')}
          disabled={loading !== null}
        >
          <BlurView intensity={60} tint="light" style={styles.button}>
            {loading === 'maybe' ? (
              <ActivityIndicator size="small" color={Colors.yellow} />
            ) : (
              <>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(230, 184, 90, 0.15)' }]}>
                  <Ionicons name="help-circle" size={28} color={Colors.yellow} />
                </View>
                <Text style={[styles.buttonText, { color: Colors.yellow }]}>Maybe</Text>
              </>
            )}
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => handleRSVP('not_going')}
          disabled={loading !== null}
        >
          <BlurView intensity={60} tint="light" style={styles.button}>
            {loading === 'not_going' ? (
              <ActivityIndicator size="small" color={Colors.red} />
            ) : (
              <>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close-circle" size={28} color={Colors.red} />
                </View>
                <Text style={[styles.buttonText, { color: Colors.red }]}>Not Going</Text>
              </>
            )}
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
});
