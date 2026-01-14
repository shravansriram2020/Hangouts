import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import ConflictsModal from '../../../src/components/ConflictsModal';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getGradientLuminance = (color1: string, color2: string) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  const avgR = (rgb1.r + rgb2.r) / 2;
  const avgG = (rgb1.g + rgb2.g) / 2;
  const avgB = (rgb1.b + rgb2.b) / 2;
  return (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;
};

interface Message {
  id: string;
  user_id: string;
  first_name: string;
  profile_photo?: string;
  user_initial?: string;
  content: string;
  created_at: string;
  edited_at?: string;
  has_time_suggestion: boolean;
  has_location_suggestion: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_user?: string;
}

export default function MessagesScreen() {
  const { event, refreshEvent } = useEvent();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [conflictType, setConflictType] = useState<'time' | 'location' | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);
  const messageIndexMap = useRef<Map<string, number>>(new Map());

  const scrollToMessage = (messageId: string) => {
    const index = messageIndexMap.current.get(messageId);
    if (index !== undefined && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }
  };

  useEffect(() => {
    const map = new Map<string, number>();
    messages.forEach((msg, idx) => map.set(msg.id, idx));
    messageIndexMap.current = map;
  }, [messages]);
  
  const isHost = event?.isHost === true;

  const gradientColors = useMemo(() => {
    return event?.gradient_color1 && event?.gradient_color2 
      ? [event.gradient_color1, event.gradient_color2]
      : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];
  }, [event?.gradient_color1, event?.gradient_color2]);

  const isDarkGradient = useMemo(() => {
    const lum = getGradientLuminance(gradientColors[0], gradientColors[1]);
    return lum < 0.5;
  }, [gradientColors]);

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

  const handleStartEdit = (message: Message) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditingMessage(message);
    setEditText(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim() || sending) return;

    setSending(true);
    try {
      await api.put(`/messages/${editingMessage.id}`, {
        content: editText.trim(),
      });
      setEditingMessage(null);
      setEditText('');
      await fetchMessages();
    } catch (error) {
      console.error('Failed to edit message:', error);
      Alert.alert('Error', 'Failed to edit message');
    } finally {
      setSending(false);
    }
  };

  const handleAddToConflicts = (message: Message) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Set conflict type based on message suggestion type
    if (message.has_time_suggestion) {
      setConflictType('time');
    } else if (message.has_location_suggestion) {
      setConflictType('location');
    } else {
      setConflictType(undefined);
    }
    setShowConflictsModal(true);
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
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.user_initial || item.first_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageContent, !isOwnMessage && styles.messageContentOther]}>
          {!isOwnMessage && (
            <Text style={[styles.messageSender, isDarkGradient && styles.messageSenderDark]}>{item.first_name}</Text>
          )}
          <Text style={[styles.messageTime, isDarkGradient && styles.messageTimeDark]}>{formatTime(item.created_at)}</Text>
          <View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
            {item.reply_to_id && item.reply_to_content && (
              <TouchableOpacity 
                style={[styles.replyQuote, isOwnMessage && styles.replyQuoteOwn]}
                onPress={() => scrollToMessage(item.reply_to_id!)}
                activeOpacity={0.7}
              >
                <View style={[styles.replyQuoteBar, isOwnMessage && styles.replyQuoteBarOwn]} />
                <View style={styles.replyQuoteContent}>
                  <Text style={[styles.replyQuoteName, isOwnMessage && styles.replyQuoteNameOwn]}>
                    {item.reply_to_user}
                  </Text>
                  <Text 
                    style={[styles.replyQuoteText, isOwnMessage && styles.replyQuoteTextOwn]} 
                    numberOfLines={2}
                  >
                    {item.reply_to_content}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={[styles.messageText, !isOwnMessage && styles.messageTextOther]}>{item.content}</Text>
            {item.edited_at && (
              <Text style={[styles.editedIndicator, isOwnMessage ? styles.editedIndicatorOwn : styles.editedIndicatorOther]}>edited</Text>
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
          <View style={styles.messageActions}>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => setReplyingTo(item)}
            >
              <Text style={[styles.replyText, isDarkGradient && styles.replyTextDark]}>← Reply</Text>
            </TouchableOpacity>
            {isOwnMessage && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleStartEdit(item)}
              >
                <Text style={[styles.editButtonText, isDarkGradient && styles.editButtonTextDark]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {isOwnMessage && (
          <View style={[styles.avatarContainer, styles.avatarContainerOwn]}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.user_initial || item.first_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const textColor = isDarkGradient ? Colors.white : Colors.secondary;
  const mutedTextColor = isDarkGradient ? 'rgba(255,255,255,0.7)' : Colors.grayMedium;

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
        onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={mutedTextColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedTextColor }]}>Start the conversation!</Text>
          </View>
        }
      />
      
      <View style={styles.inputArea}>
        {editingMessage && (
          <View style={styles.editPreview}>
            <View style={styles.editPreviewContent}>
              <Text style={styles.editPreviewLabel}>Editing message</Text>
              <Text style={styles.editPreviewText} numberOfLines={1}>{editingMessage.content}</Text>
            </View>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Ionicons name="close" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}
        {replyingTo && !editingMessage && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewLabel}>Replying to {replyingTo.first_name}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          {editingMessage ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Edit your message..."
                placeholderTextColor={Colors.grayMedium}
                value={editText}
                onChangeText={setEditText}
                multiline
                maxLength={500}
                autoFocus
              />
              <TouchableOpacity 
                style={[styles.sendButton, !editText.trim() && styles.sendButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={!editText.trim() || sending}
              >
                <Ionicons name="checkmark" size={20} color={Colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
        <Text style={[styles.helperText, { color: mutedTextColor }]}>
          Hangouts can detect messages that suggest a new location or time and add them as conflicts.
        </Text>
      </View>
      </KeyboardAvoidingView>
      
      <ConflictsModal
        visible={showConflictsModal}
        onClose={() => {
          setShowConflictsModal(false);
          setConflictType(undefined);
        }}
        eventId={event?.id || ''}
        eventTitle={event?.title || ''}
        isHost={isHost}
        onEventUpdated={refreshEvent}
        initialType={conflictType}
      />
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
  messageSenderDark: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.gray,
    marginBottom: 4,
  },
  messageTimeDark: {
    color: 'rgba(255, 255, 255, 0.8)',
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
  messageActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  replyButton: {
  },
  replyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  replyTextDark: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editButton: {
  },
  editButtonText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  editButtonTextDark: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editedIndicator: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginTop: 4,
  },
  editedIndicatorOwn: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  editedIndicatorOther: {
    color: Colors.gray,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarContainerOwn: {
    marginRight: 0,
    marginLeft: 10,
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
  editPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 95, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  editPreviewContent: {
    flex: 1,
  },
  editPreviewLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.secondary,
    marginBottom: 2,
  },
  editPreviewText: {
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
  replyQuote: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    minWidth: 120,
  },
  replyQuoteOwn: {
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  replyQuoteBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: 8,
    alignSelf: 'stretch',
  },
  replyQuoteBarOwn: {
    backgroundColor: Colors.primaryLight,
  },
  replyQuoteContent: {
    flex: 1,
    flexShrink: 1,
  },
  replyQuoteName: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  replyQuoteNameOwn: {
    color: Colors.primaryLight,
  },
  replyQuoteText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  replyQuoteTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
