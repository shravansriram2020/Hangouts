import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';

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
      case 'invite':
        return 'calendar-outline';
      case 'ride':
        return 'car-outline';
      case 'money':
        return 'cash-outline';
      case 'conflict':
        return 'alert-circle-outline';
      case 'rsvp':
        return 'checkmark-circle-outline';
      case 'message':
        return 'chatbubble-outline';
      case 'photo':
        return 'image-outline';
      default:
        return 'notifications-outline';
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.containerWrapper}>
          <BlurView intensity={80} tint="light" style={styles.container}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSubtitle}>
                  {unreadCount > 0 ? `${unreadCount} new` : 'All caught up!'}
                </Text>
              </View>
              <View style={styles.headerRight}>
                {notifications.length > 0 && (
                  <TouchableOpacity style={styles.clearAllButton} onPress={handleDismissAll}>
                    <Ionicons name="trash-outline" size={16} color={Colors.gray} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={20} color={Colors.secondary} />
                </TouchableOpacity>
              </View>
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
                scrollEnabled={true}
                nestedScrollEnabled={true}
                bounces={true}
              />
            )}
          </BlurView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  containerWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  container: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  closeButton: {
  },
  clearAllButton: {
    padding: 4,
  },
  list: {
    paddingHorizontal: 16,
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  notification: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  unread: {
    backgroundColor: 'rgba(30, 58, 95, 0.08)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  notificationMessage: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 1,
  },
  notificationTime: {
    fontSize: 10,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  emptyDescription: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  dismissAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  dismissAllText: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
  },
});
