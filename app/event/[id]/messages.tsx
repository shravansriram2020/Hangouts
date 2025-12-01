import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  user_profile_image?: string;
  content: string;
  created_at: string;
  has_time_suggestion: boolean;
  has_location_suggestion: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_user?: string;
}

export default function MessagesScreen() {
  const { event } = useEvent();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (event?.id) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [event?.id]);

  const fetchMessages = async () => {
    if (!event?.id) return;
    try {
      const data = await api.get(`/messages/event/${event.id}`);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !event?.id || sending) return;

    setSending(true);
    try {
      await api.post('/messages', {
        eventId: event.id,
        content: newMessage.trim(),
        replyToId: replyingTo?.id,
      });
      setNewMessage('');
      setReplyingTo(null);
      await fetchMessages();
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleAddToConflicts = async (message: Message) => {
    if (!event?.id) return;
    
    try {
      const conflictType = message.has_time_suggestion ? 'time' : 'location';
      await api.post('/conflicts', {
        eventId: event.id,
        type: conflictType,
        description: `Suggestion from ${message.user_name}: "${message.content}"`,
        suggestedValue: message.content,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added to Conflicts', 'The suggestion has been added as a conflict for voting.');
    } catch (error: any) {
      console.error('Failed to add conflict:', error);
      Alert.alert('Error', error.message || 'Failed to add to conflicts');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === user?.id;

    return (
      <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {item.user_profile_image ? (
              <Image source={{ uri: item.user_profile_image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.user_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageContent, !isOwnMessage && styles.messageContentOther]}>
          {!isOwnMessage && (
            <Text style={styles.messageSender}>{item.user_name}</Text>
          )}
          <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
          <View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
            <Text style={[styles.messageText, !isOwnMessage && styles.messageTextOther]}>{item.content}</Text>
            {item.has_time_suggestion && (
              <View style={styles.suggestionBadge}>
                <Ionicons name="time" size={12} color={Colors.blue} />
                <Text style={styles.suggestionText}>Time suggestion</Text>
              </View>
            )}
            {(item.has_time_suggestion || item.has_location_suggestion) && (
              <TouchableOpacity 
                style={styles.addToConflictsButton}
                onPress={() => handleAddToConflicts(item)}
              >
                <Ionicons name="add-circle-outline" size={14} color={Colors.white} />
                <Text style={styles.addToConflictsText}>Add to Conflicts</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => setReplyingTo(item)}
          >
            <Text style={styles.replyText}>← Reply</Text>
          </TouchableOpacity>
        </View>
        {isOwnMessage && (
          <View style={styles.avatarContainer}>
            {item.user_profile_image ? (
              <Image source={{ uri: item.user_profile_image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.user_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const gradientColors = event?.gradient_color1 && event?.gradient_color2 
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  return (
    <LinearGradient colors={gradientColors} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView 
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.grayMedium} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />
      
      <View style={styles.inputArea}>
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewLabel}>Replying to {replyingTo.user_name}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.grayMedium}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>
          Hangouts can detect messages that suggest a new location or time and add them as conflicts.
        </Text>
      </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.grayMedium,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    alignItems: 'flex-end',
    maxWidth: '70%',
  },
  messageContentOther: {
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginBottom: 4,
  },
  messageBubble: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.secondary,
  },
  messageBubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  messageText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.white,
  },
  messageTextOther: {
    color: Colors.secondary,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    gap: 4,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  addToConflictsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  addToConflictsText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  replyButton: {
    marginTop: 4,
  },
  replyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  avatarContainer: {
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  inputArea: {
    padding: 16,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.gray,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.secondary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.grayMedium,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
