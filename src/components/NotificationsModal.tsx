import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  event_title?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsModal({ visible, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
      await api.put('/notifications/read-all', {});
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to dismiss notifications:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invite': return 'calendar-outline';
      case 'ride': return 'car-outline';
      case 'money': return 'cash-outline';
      case 'conflict': return 'alert-circle-outline';
      case 'rsvp': return 'checkmark-circle-outline';
      case 'message': return 'chatbubble-outline';
      case 'photo': return 'image-outline';
      default: return 'notifications-outline';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[styles.notification, !item.is_read && styles.unread]}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon(item.type) as any} size={18} color={Colors.secondary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {item.message && (
          <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
        )}
        <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
      </View>
    </View>
  );

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title="Notifications"
      noScroll={true}
      fullHeight={true}
    >
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>
            {unreadCount > 0 ? `${unreadCount} new` : 'All caught up!'}
          </Text>
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearAllButton} onPress={handleDismissAll}>
              <Ionicons name="trash-outline" size={16} color={Colors.gray} />
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off" size={28} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDescription}>You're all caught up!</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
          />
        )}
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -20,
    marginBottom: -20,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subHeaderText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: Fonts.regular,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearAllText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: Fonts.medium,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notification: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  unread: {
    backgroundColor: 'rgba(30, 58, 95, 0.06)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: Fonts.semiBold,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.grayMedium,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: Fonts.semiBold,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
});
