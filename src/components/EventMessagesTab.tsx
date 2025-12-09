import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  eventId: string;
  onConflictPress: () => void;
}

interface ReplyTo {
  id: string;
  content: string;
  first_name: string;
}

export default function EventMessagesTab({ eventId, onConflictPress }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    initialScrollDoneRef.current = false;
    fetchMessages(true);
    const interval = setInterval(() => fetchNewMessages(), 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const data = await api.get(`/messages/event/${eventId}`);
      setMessages(data);
      if (data.length > 0) {
        lastMessageIdRef.current = data[data.length - 1].id;
      }
      if (initial && data.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          initialScrollDoneRef.current = true;
        }, 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (initial) setLoading(false);
    }
  }, [eventId]);

  const fetchNewMessages = useCallback(async () => {
    try {
      const data = await api.get(`/messages/event/${eventId}`);
      if (data.length > 0) {
        const lastId = data[data.length - 1].id;
        if (lastId !== lastMessageIdRef.current) {
          setMessages(data);
          lastMessageIdRef.current = lastId;
        }
      }
    } catch (error) {
      console.error('Failed to fetch new messages:', error);
    }
  }, [eventId]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post('/messages', {
        eventId,
        content: newMessage,
        replyToId: replyTo?.id || null,
      });
      setNewMessage('');
      setReplyTo(null);
      fetchMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      first_name: message.first_name,
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;

    return (
      <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
        <View style={[styles.messageBubble, isOwnMessage && styles.messageBubbleOwn]}>
          {item.reply_to_id && item.reply_to_content && (
            <View style={[styles.replyPreview, isOwnMessage && styles.replyPreviewOwn]}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={[styles.replyPreviewName, isOwnMessage && styles.replyPreviewNameOwn]}>
                  {item.reply_to_user}
                </Text>
                <Text 
                  style={[styles.replyPreviewText, isOwnMessage && styles.replyPreviewTextOwn]} 
                  numberOfLines={2}
                >
                  {item.reply_to_content}
                </Text>
              </View>
            </View>
          )}
          <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn]}>
            {item.content}
          </Text>

          {(item.has_time_suggestion || item.has_location_suggestion) && (
            <TouchableOpacity style={styles.conflictSuggestion} onPress={onConflictPress}>
              <Ionicons
                name={item.has_time_suggestion ? 'time-outline' : 'location-outline'}
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.conflictSuggestionText}>
                {item.has_time_suggestion ? 'Time suggestion' : 'Location suggestion'}
              </Text>
              <TouchableOpacity style={styles.addToConflictsButton} onPress={onConflictPress}>
                <Text style={styles.addToConflictsText}>Add to Conflicts</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.messageFooter}>
          {!isOwnMessage && <Text style={styles.senderName}>{item.first_name}</Text>}
          <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
          {item.profile_photo && !isOwnMessage ? (
            <Image source={{ uri: item.profile_photo }} style={styles.messageAvatar} />
          ) : isOwnMessage && item.profile_photo ? (
            <Image source={{ uri: item.profile_photo }} style={styles.messageAvatar} />
          ) : (
            <View style={[styles.messageAvatarPlaceholder, isOwnMessage && styles.ownAvatar]}>
              <Text style={styles.avatarInitial}>{item.first_name?.charAt(0)}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item)}>
          <Ionicons name="arrow-undo-outline" size={12} color={Colors.gray} />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {replyTo && (
        <View style={styles.replyingToContainer}>
          <View style={styles.replyingToContent}>
            <View style={styles.replyBar} />
            <View style={styles.replyingToText}>
              <Text style={styles.replyingToLabel}>Replying to {replyTo.first_name}</Text>
              <Text style={styles.replyingToMessage} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
            <Ionicons name="close" size={18} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder={replyTo ? `Reply to ${replyTo.first_name}...` : "Type a message..."}
          placeholderTextColor={Colors.grayMedium}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons name="send" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        Hangouts can detect messages that suggest a new location or time and add them as conflicts.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
  },
  messageBubbleOwn: {
    backgroundColor: Colors.secondary,
  },
  messageText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  messageTextOwn: {
    color: Colors.white,
  },
  conflictSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  conflictSuggestionText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'Prompt-Regular',
    marginLeft: 4,
  },
  addToConflictsButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  addToConflictsText: {
    fontSize: 11,
    color: Colors.white,
    fontFamily: 'Prompt-Medium',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  senderName: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginRight: 4,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  messageAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownAvatar: {
    backgroundColor: Colors.secondary,
  },
  avatarInitial: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replyText: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  helpText: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  replyPreviewOwn: {
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  replyBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Prompt-Medium',
    marginBottom: 2,
  },
  replyPreviewNameOwn: {
    color: Colors.primaryLight,
  },
  replyPreviewText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  replyPreviewTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  replyingToContent: {
    flex: 1,
    flexDirection: 'row',
  },
  replyingToText: {
    flex: 1,
  },
  replyingToLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Prompt-Medium',
  },
  replyingToMessage: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  cancelReplyButton: {
    padding: 4,
  },
});
