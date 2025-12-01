import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  TextInput,
  Alert,
} from 'react-native';
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

const REPLIT_DOMAIN = 'dbb898f2-249b-4b2e-b351-918c5bf49456-00-1odvwsre5ud0.riker.replit.dev';

export default function ShareModal({ visible, onClose, eventId, eventTitle }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'username'>('url');
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');

  const eventLink = `https://${REPLIT_DOMAIN}/event/${eventId}`;

  const handleCopyLink = async () => {
    try {
      await Share.share({
        message: eventLink,
        title: 'Event Link',
      });
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to copy link');
      }
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

  const handleInviteByUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    Alert.alert('Invite Sent', `Invitation sent to @${username}`);
    setUsername('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Share Event">
      <View style={styles.content}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'url' && styles.tabActive]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>
              Share by URL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'username' && styles.tabActive]}
            onPress={() => setActiveTab('username')}
          >
            <Text style={[styles.tabText, activeTab === 'username' && styles.tabTextActive]}>
              Share by Username
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'url' ? (
          <>
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
              <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
                <View style={[styles.shareIconCircle, { backgroundColor: '#34C759' }]}>
                  <Ionicons name="chatbubble" size={24} color={Colors.white} />
                </View>
                <Text style={styles.shareOptionText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
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
          </>
        ) : (
          <>
            <View style={styles.usernameInputContainer}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username..."
                placeholderTextColor={Colors.grayMedium}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity 
              style={[styles.inviteButton, !username.trim() && styles.inviteButtonDisabled]}
              onPress={handleInviteByUsername}
              disabled={!username.trim()}
            >
              <Ionicons name="paper-plane" size={18} color={Colors.white} />
              <Text style={styles.inviteButtonText}>Send Invite</Text>
            </TouchableOpacity>
          </>
        )}

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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.gray,
  },
  tabTextActive: {
    color: Colors.secondary,
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
    fontSize: 13,
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
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  atSymbol: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    paddingVertical: 12,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  inviteButtonDisabled: {
    backgroundColor: Colors.grayMedium,
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
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
