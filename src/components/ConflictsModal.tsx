import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
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
  isHost?: boolean;
  onConflictUpdate?: () => void;
  onEventUpdated?: () => void;
}

const CONFLICT_TYPES = [
  { id: 'time', label: 'Time Conflict', icon: 'time-outline', color: Colors.blue },
  { id: 'location', label: 'Location Conflict', icon: 'location-outline', color: Colors.green },
  { id: 'other', label: 'Other', icon: 'warning-outline', color: Colors.yellow },
];

export default function ConflictsModal({ visible, onClose, eventId, isHost, onConflictUpdate, onEventUpdated }: Props) {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showCreateConflict, setShowCreateConflict] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [reason, setReason] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [suggestedLocation, setSuggestedLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchConflicts();
    }
  }, [visible]);

  const fetchConflicts = async () => {
    try {
      const data = await api.get(`/conflicts/event/${eventId}`);
      setConflicts(data);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    }
  };

  const handleCreateConflict = async () => {
    if (!selectedType) {
      Alert.alert('Required', 'Please select a conflict type');
      return;
    }

    if (selectedType === 'time' && !suggestedTime) {
      Alert.alert('Required', 'Please enter a suggested time');
      return;
    }

    if (selectedType === 'location' && !suggestedLocation) {
      Alert.alert('Required', 'Please enter a suggested location');
      return;
    }

    setLoading(true);
    try {
      await api.post('/conflicts', {
        eventId,
        conflictType: selectedType,
        reason,
        suggestedTime: selectedType === 'time' ? suggestedTime : null,
        suggestedLocation: selectedType === 'location' ? suggestedLocation : null,
      });

      setShowCreateConflict(false);
      setSelectedType('');
      setReason('');
      setSuggestedTime('');
      setSuggestedLocation('');
      fetchConflicts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report conflict');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (conflictId: string, vote: string) => {
    try {
      await api.post(`/conflicts/${conflictId}/vote`, { vote });
      fetchConflicts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  const handleResolve = async (conflictId: string) => {
    Alert.alert('Resolve Conflict', 'Accept this change?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await api.put(`/conflicts/${conflictId}/resolve`, {});
            fetchConflicts();
            onConflictUpdate?.();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resolve conflict');
          }
        },
      },
    ]);
  };

  const getTypeInfo = (type: string) => {
    return CONFLICT_TYPES.find(t => t.id === type) || CONFLICT_TYPES[2];
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Event Conflicts" fullHeight>
      <Text style={styles.headerSubtitle}>
        Report and vote on conflicts for this event
      </Text>
      <ScrollView style={styles.content}>
            {showCreateConflict ? (
              <View style={styles.createForm}>
                <Text style={styles.formLabel}>Conflict Type</Text>
                
                {CONFLICT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      selectedType === type.id && styles.typeOptionSelected,
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text style={styles.typeOptionText}>{type.label}</Text>
                    {selectedType === type.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                <Text style={styles.formLabel}>Reason (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Explain the conflict..."
                  placeholderTextColor={Colors.grayMedium}
                  multiline
                  numberOfLines={3}
                />

                {selectedType === 'time' && (
                  <>
                    <Text style={styles.formLabel}>Suggested Time *</Text>
                    <TextInput
                      style={styles.input}
                      value={suggestedTime}
                      onChangeText={setSuggestedTime}
                      placeholder="mm/dd/yyyy --:-- --"
                      placeholderTextColor={Colors.grayMedium}
                    />
                  </>
                )}

                {selectedType === 'location' && (
                  <>
                    <Text style={styles.formLabel}>Suggested Location *</Text>
                    <TextInput
                      style={styles.input}
                      value={suggestedLocation}
                      onChangeText={setSuggestedLocation}
                      placeholder="Enter a new location"
                      placeholderTextColor={Colors.grayMedium}
                    />

                    <TouchableOpacity style={styles.suggestButton}>
                      <Ionicons name="sparkles" size={18} color={Colors.white} />
                      <Text style={styles.suggestButtonText}>Have Hangouts Suggest a Location</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowCreateConflict(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleCreateConflict}
                    disabled={loading}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Reporting...' : 'Report Conflict'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {conflicts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No conflicts reported yet.</Text>
                  </View>
                ) : (
                  conflicts.map((conflict) => {
                    const typeInfo = getTypeInfo(conflict.conflict_type);
                    const userVote = conflict.votes?.find((v: any) => v.userId === user?.id);
                    const yesVotes = conflict.votes?.filter((v: any) => v.vote === 'yes').length || 0;
                    const noVotes = conflict.votes?.filter((v: any) => v.vote === 'no').length || 0;

                    return (
                      <View key={conflict.id} style={styles.conflictCard}>
                        <View style={styles.conflictHeader}>
                          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                          <Text style={styles.conflictType}>{typeInfo.label}</Text>
                        </View>

                        {conflict.reason && (
                          <Text style={styles.conflictReason}>{conflict.reason}</Text>
                        )}

                        {conflict.suggested_time && (
                          <View style={styles.suggestionRow}>
                            <Ionicons name="time-outline" size={14} color={Colors.gray} />
                            <Text style={styles.suggestionText}>
                              Suggested: {conflict.suggested_time}
                            </Text>
                          </View>
                        )}

                        {conflict.suggested_location && (
                          <View style={styles.suggestionRow}>
                            <Ionicons name="location-outline" size={14} color={Colors.gray} />
                            <Text style={styles.suggestionText}>
                              Suggested: {conflict.suggested_location}
                            </Text>
                          </View>
                        )}

                        <View style={styles.votingSection}>
                          <Text style={styles.votesText}>
                            Votes: {yesVotes} Yes / {noVotes} No
                          </Text>
                          <View style={styles.voteButtons}>
                            <TouchableOpacity
                              style={[
                                styles.voteButton,
                                userVote?.vote === 'yes' && styles.voteButtonActive,
                              ]}
                              onPress={() => handleVote(conflict.id, 'yes')}
                            >
                              <Ionicons
                                name="thumbs-up"
                                size={16}
                                color={userVote?.vote === 'yes' ? Colors.white : Colors.green}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.voteButton,
                                userVote?.vote === 'no' && styles.voteButtonActiveNo,
                              ]}
                              onPress={() => handleVote(conflict.id, 'no')}
                            >
                              <Ionicons
                                name="thumbs-down"
                                size={16}
                                color={userVote?.vote === 'no' ? Colors.white : Colors.red}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {isHost && (
                          <TouchableOpacity
                            style={styles.changeButton}
                            onPress={() => handleResolve(conflict.id)}
                          >
                            <Text style={styles.changeButtonText}>Change</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}

                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setShowCreateConflict(true)}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.reportButtonText}>Report Conflict</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  conflictCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictType: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  conflictReason: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginLeft: 6,
  },
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  votesText: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
  },
  voteButtons: {
    flexDirection: 'row',
  },
  voteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voteButtonActive: {
    backgroundColor: Colors.green,
  },
  voteButtonActiveNo: {
    backgroundColor: Colors.red,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changeButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  reportButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 8,
  },
  createForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 8,
    marginTop: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  typeOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginLeft: 12,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  suggestButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
});
