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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

interface UserResult {
  id: string;
  username: string;
  profilePhoto: string | null;
}

export default function ShareEventModal({ visible, onClose, eventId }: Props) {
  const [activeTab, setActiveTab] = useState<'link' | 'username'>('link');
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  const shareLink = `https://hangouts.app/event/${eventId}`;

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

  return (
    <GlassModal visible={visible} onClose={onClose} title="Share Event">
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
                Add by Username
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
                <Text style={styles.label}>Search by Username</Text>
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
                    <TouchableOpacity
                      style={styles.userItem}
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
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'Prompt-Medium',
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
    fontFamily: 'Prompt-Regular',
    marginBottom: 8,
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
    fontFamily: 'Prompt-Regular',
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
    fontFamily: 'Prompt-Medium',
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
    fontFamily: 'Prompt-Regular',
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
    fontFamily: 'Prompt-Bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
});
