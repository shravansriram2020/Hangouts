import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  notes: any[];
  onNoteAdded: () => void;
}

export default function NotesModal({ visible, onClose, eventId, notes, onNoteAdded }: Props) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/events/${eventId}/notes`, { content: newNote });
      setNewNote('');
      onNoteAdded();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/events/${eventId}/notes/${noteId}`);
      onNoteAdded();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete note');
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Event Notes" fullHeight>
      <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Add your note..."
              placeholderTextColor={Colors.grayMedium}
              multiline
            />
            <TouchableOpacity
              style={[styles.addButton, !newNote.trim() && styles.addButtonDisabled]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || loading}
            >
              <Text style={styles.addButtonText}>
                {loading ? 'Adding...' : 'Add Note'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notesList}>
            {notes?.length === 0 ? (
              <Text style={styles.emptyText}>No notes yet</Text>
            ) : (
              notes?.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    {note.profile_photo ? (
                      <Image source={{ uri: note.profile_photo }} style={styles.noteAvatar} />
                    ) : (
                      <View style={styles.noteAvatarPlaceholder}>
                        <Text style={styles.noteAvatarText}>
                          {note.first_name?.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.noteName}>{note.first_name}</Text>
                    {note.user_id === user?.id && (
                      <TouchableOpacity
                        style={styles.deleteNoteButton}
                        onPress={() => handleDeleteNote(note.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </View>
              ))
            )}
          </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: Colors.grayLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  notesList: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noteItem: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  noteAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  noteAvatarText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  noteName: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
  },
  deleteNoteButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    lineHeight: 20,
  },
});
