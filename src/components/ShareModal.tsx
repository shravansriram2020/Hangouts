import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import GlassModal from './GlassModal';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export default function ShareModal({ visible, onClose, eventId, eventTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const eventLink = `https://hangouts.app/event/${eventId}`;

  const handleCopyLink = async () => {
    try {
      Clipboard.setString(eventLink);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me at "${eventTitle}"! ${eventLink}`,
        title: eventTitle,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  const handleShareToMessage = () => {
    handleShare();
  };

  const handleShareToWhatsApp = async () => {
    const message = encodeURIComponent(`Join me at "${eventTitle}"! ${eventLink}`);
    try {
      await Share.share({
        message: `Join me at "${eventTitle}"! ${eventLink}`,
      });
    } catch (error) {
      handleShare();
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Share Event">
      <View style={styles.content}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        
        <View style={styles.linkContainer}>
          <Text style={styles.linkText} numberOfLines={1}>{eventLink}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
            <Ionicons 
              name={copied ? 'checkmark-circle' : 'copy-outline'} 
              size={20} 
              color={copied ? Colors.green : Colors.secondary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.shareOptions}>
          <TouchableOpacity style={styles.shareOption} onPress={handleShareToMessage}>
            <View style={[styles.shareIconCircle, { backgroundColor: '#34C759' }]}>
              <Ionicons name="chatbubble" size={24} color={Colors.white} />
            </View>
            <Text style={styles.shareOptionText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareOption} onPress={handleShareToWhatsApp}>
            <View style={[styles.shareIconCircle, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={24} color={Colors.white} />
            </View>
            <Text style={styles.shareOptionText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
            <View style={[styles.shareIconCircle, { backgroundColor: Colors.secondary }]}>
              <Ionicons name="share-social" size={24} color={Colors.white} />
            </View>
            <Text style={styles.shareOptionText}>More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.mainShareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={Colors.white} />
          <Text style={styles.mainShareButtonText}>Share Event</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  shareOption: {
    alignItems: 'center',
  },
  shareIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.grayDark,
  },
  mainShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  mainShareButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
