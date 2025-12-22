import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

interface UserResult {
  id: string;
  username: string;
  firstName: string;
  profilePhoto: string | null;
  isFriend?: boolean;
}

export default function ShareModal({ visible, onClose, eventId, eventTitle }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'username'>('url');
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eventLink = `https://api.hangouts-app.com/share/${eventId}`;

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

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }

    setSearchingUsers(true);
    try {
      const results = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setUserResults(results);
    } catch (error) {
      console.error('User search failed:', error);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchUsers(text);
    }, 300);
  };

  const toggleFriend = async (userId: string, isFriend: boolean) => {
    try {
      if (isFriend) {
        await api.delete(`/users/friends/${userId}`);
      } else {
        await api.post(`/users/friends/${userId}`, {});
      }
      setUserResults(userResults.map(u => 
        u.id === userId ? { ...u, isFriend: !isFriend } : u
      ));
    } catch (error) {
      console.error('Toggle friend failed:', error);
    }
  };

  const handleInviteUser = async (user: UserResult) => {
    setInvitingUser(user.id);
    try {
      await api.post(`/events/${eventId}/invite`, { userId: user.id });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Invite Sent', `Invitation sent to @${user.username}`);
      setUserResults(userResults.filter(u => u.id !== user.id));
      setUsername('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invite');
    } finally {
      setInvitingUser(null);
    }
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
              Search for Friends
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

            <View style={styles.separator} />
          </>
        ) : (
          <>
            <TextInput
              style={styles.usernameSearchInput}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Search friends..."
              placeholderTextColor={Colors.grayMedium}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchingUsers && (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.searchLoader} />
            )}
            
            {userResults.length > 0 && (
              <View style={styles.suggestionsList}>
                {userResults.slice(0, 5).map((user) => (
                  <View key={user.id} style={styles.userItem}>
                    <TouchableOpacity
                      style={styles.friendButton}
                      onPress={() => toggleFriend(user.id, user.isFriend || false)}
                    >
                      <Ionicons 
                        name={user.isFriend ? "heart" : "heart-outline"} 
                        size={20} 
                        color={user.isFriend ? Colors.red : Colors.grayMedium} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.userItemContent}
                      onPress={() => handleInviteUser(user)}
                      disabled={invitingUser === user.id}
                    >
                      {user.profilePhoto ? (
                        <Image source={{ uri: user.profilePhoto }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {user.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.userName}>@{user.username}</Text>
                      {invitingUser === user.id && (
                        <ActivityIndicator size="small" color={Colors.green} style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.helperText}>
              Search for friends to invite
            </Text>
            <View style={styles.separator} />
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
    marginBottom: 24,
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
    paddingVertical: 14,
    marginBottom: 28,
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
  searchLoader: {
    marginLeft: 8,
    marginBottom: 8,
  },
  usernameSearchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    marginBottom: 12,
  },
  suggestionsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendButton: {
    padding: 6,
    marginRight: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  userName: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
    marginLeft: 12,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 16,
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
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 20,
  },
});
