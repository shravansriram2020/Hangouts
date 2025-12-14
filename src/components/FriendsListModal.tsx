import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';
import LoadingDots from './LoadingDots';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Friend {
  id: string;
  username: string;
  firstName: string;
  profilePhoto: string | null;
  friendedAt: string;
}

export default function FriendsListModal({ visible, onClose }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchFriends();
    }
  }, [visible]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users/friends');
      setFriends(data);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/friends/${friendId}`);
              setFriends(friends.filter(f => f.id !== friendId));
            } catch (error) {
              console.error('Failed to remove friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Friends List" fullHeight>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots size={12} />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={Colors.grayMedium} />
            <Text style={styles.emptyTitle}>No Friends Yet</Text>
            <Text style={styles.emptyText}>
              Add friends by tapping the heart icon when searching for users to invite to events.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>{friends.length} friend{friends.length !== 1 ? 's' : ''}</Text>
            <View style={styles.listContent}>
              {friends.map((friend) => (
                <View key={friend.id} style={styles.friendItem}>
                  {friend.profilePhoto ? (
                    <Image source={{ uri: friend.profilePhoto }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {friend.firstName?.charAt(0).toUpperCase() || friend.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.firstName || friend.username}</Text>
                    <Text style={styles.friendUsername}>@{friend.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFriend(friend.id, friend.firstName || friend.username)}
                  >
                    <Ionicons name="heart-dislike-outline" size={20} color={Colors.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: Fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  countText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.grayMedium,
    marginTop: 4,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 30,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
  },
  friendUsername: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
});
