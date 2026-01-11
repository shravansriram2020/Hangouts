import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  Image,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  userStatus?: string | null;
  isHost?: boolean;
}

interface UserResult {
  id: string;
  username: string;
  profilePhoto: string | null;
  isFriend: boolean;
}

export default function ShareEventModal({ visible, onClose, eventId, userStatus, isHost }: Props) {
  const [activeTab, setActiveTab] = useState<'link' | 'username'>('link');
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  const canShare = isHost || userStatus === 'accepted' || userStatus === 'maybe';

  const shareLink = `https://api.hangouts-app.com/share/${eventId}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my hangout! ${shareLink}`,
        url: shareLink,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      setUserResults([]);
      return;
    }

    try {
      const results = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setUserResults(results);
    } catch (error) {
      console.error('User search failed:', error);
    }
  };

  const inviteUser = async (userId: string) => {
    try {
      await api.post(`/events/${eventId}/invite`, { userId });
      setUserResults(userResults.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Invite failed:', error);
    }
  };

  const toggleFriend = async (userId: string, isFriend: boolean) => {
    try {
      if (isFriend) {
        await api.delete(`/users/friends/${userId}`);
      } else {
        await api.post(`/users/friends/${userId}`, {});
      }
      // Update local state
      setUserResults(userResults.map(u => 
        u.id === userId ? { ...u, isFriend: !isFriend } : u
      ));
    } catch (error) {
      console.error('Toggle friend failed:', error);
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Share Event">
      {!canShare ? (
        <View style={styles.rsvpRequiredContainer}>
          <Text style={styles.rsvpRequiredText}>Please RSVP to use Share.</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'link' && styles.activeTab]}
              onPress={() => setActiveTab('link')}
            >
              <Text style={[styles.tabText, activeTab === 'link' && styles.activeTabText]}>
                Share Link
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'username' && styles.activeTab]}
              onPress={() => setActiveTab('username')}
            >
              <Text style={[styles.tabText, activeTab === 'username' && styles.activeTabText]}>
                Search for Friends
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'link' ? (
              <View style={styles.linkSection}>
                <Text style={styles.label}>Share this link with friends</Text>
                <View style={styles.linkRow}>
                  <TextInput
                    style={styles.linkInput}
                    value={shareLink}
                    editable={false}
                  />
                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.usernameSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Search for friends to invite</Text>
                  <TouchableOpacity 
                    style={styles.helpButton}
                    onPress={() => Alert.alert('How to Add Friends', 'Add friends by sharing a link and adding a user as a friend on a Hangout page.')}
                  >
                    <Ionicons name="help-circle" size={20} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchUsers(text);
                  }}
                  placeholder="Search..."
                  placeholderTextColor={Colors.grayMedium}
                />

                <FlatList
                  data={userResults}
                  keyExtractor={(item) => item.id}
                  style={styles.userList}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.userItem}>
                      <TouchableOpacity
                        style={styles.friendButton}
                        onPress={() => toggleFriend(item.id, item.isFriend)}
                      >
                        <Ionicons 
                          name={item.isFriend ? "heart" : "heart-outline"} 
                          size={22} 
                          color={item.isFriend ? Colors.red : Colors.grayMedium} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userItemContent}
                        onPress={() => inviteUser(item.id)}
                      >
                        {item.profilePhoto ? (
                          <Image source={{ uri: item.profilePhoto }} style={styles.userAvatar} />
                        ) : (
                          <View style={styles.userAvatarPlaceholder}>
                            <Text style={styles.userAvatarText}>
                              {item.username.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>@{item.username}</Text>
                          {item.isFriend && (
                            <Text style={styles.friendLabel}>Friend</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            )}
          </ScrollView>
        </>
      )}
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  rsvpRequiredContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpRequiredText: {
    fontSize: 16,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    textAlign: 'center',
  },
  scrollContent: {
    maxHeight: '100%',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
  },
  activeTabText: {
    color: Colors.secondary,
  },
  linkSection: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Agrandir-Tight',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpButton: {
    padding: 4,
    marginLeft: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkInput: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    marginRight: 8,
  },
  shareButton: {
    backgroundColor: Colors.grayLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
  },
  usernameSection: {
    padding: 20,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-Tight',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  userList: {
    marginTop: 16,
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendButton: {
    padding: 8,
    marginRight: 4,
  },
  friendLabel: {
    fontSize: 11,
    color: Colors.grayMedium,
    fontFamily: 'Agrandir-Tight',
    marginTop: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Agrandir-TextBold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Agrandir-TextBold',
  },
});
