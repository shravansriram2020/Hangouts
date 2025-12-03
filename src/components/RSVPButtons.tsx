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

  if (isHost) {
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
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => handleRSVP('going')}
          disabled={loading !== null}
        >
          <BlurView intensity={60} tint="light" style={[styles.button, currentStatus === 'accepted' && styles.buttonSelected]}>
            {loading === 'going' ? (
              <ActivityIndicator size="small" color={Colors.green} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={currentStatus === 'accepted' ? Colors.white : Colors.green} />
                <Text style={[styles.buttonText, { color: currentStatus === 'accepted' ? Colors.white : Colors.green }]}>Going</Text>
              </>
            )}
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => handleRSVP('maybe')}
          disabled={loading !== null}
        >
          <BlurView intensity={60} tint="light" style={[styles.button, currentStatus === 'maybe' && styles.buttonSelectedMaybe]}>
            {loading === 'maybe' ? (
              <ActivityIndicator size="small" color={Colors.yellow} />
            ) : (
              <>
                <Ionicons name="help-circle" size={20} color={currentStatus === 'maybe' ? Colors.white : Colors.yellow} />
                <Text style={[styles.buttonText, { color: currentStatus === 'maybe' ? Colors.white : Colors.yellow }]}>Maybe</Text>
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
                <Ionicons name="close-circle" size={20} color={Colors.red} />
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
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    backgroundColor: Colors.green,
  },
  buttonSelectedMaybe: {
    backgroundColor: Colors.yellow,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    marginLeft: 6,
  },
});
