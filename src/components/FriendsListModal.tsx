import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      {item.profilePhoto ? (
        <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.firstName?.charAt(0).toUpperCase() || item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.firstName || item.username}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFriend(item.id, item.firstName || item.username)}
      >
        <Ionicons name="heart-dislike-outline" size={20} color={Colors.red} />
      </TouchableOpacity>
    </View>
  );

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
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={renderFriend}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
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
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
