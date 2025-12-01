import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  attendees?: any[];
  onCreateClick?: () => void;
  attendeeCount?: number;
}

export default function MoneyModal({ visible, onClose, eventId, attendees, onCreateClick, attendeeCount = 0 }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchRequests();
    }
  }, [visible]);

  const fetchRequests = async () => {
    try {
      const data = await api.get(`/money/event/${eventId}`);
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch money requests:', error);
    }
  };


  const handleMarkPaid = async (requestId: string) => {
    try {
      await api.put(`/money/${requestId}/pay`, {});
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as paid');
    }
  };

  const handleClear = async (requestId: string) => {
    try {
      await api.put(`/money/${requestId}/clear`, {});
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to clear request');
    }
  };

  const handleDelete = async (requestId: string) => {
    Alert.alert('Delete Request', 'Are you sure you want to delete this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/money/${requestId}`);
            fetchRequests();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete request');
          }
        },
      },
    ]);
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Money" fullHeight>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {attendeeCount > 0 ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateClick}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.createButtonText}>Request Payment</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledButton}>
            <Ionicons name="add" size={18} color={Colors.grayMedium} />
            <Text style={styles.disabledButtonText}>Request Payment (no attendees yet)</Text>
          </View>
        )}

                {requests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cash-outline" size={40} color={Colors.grayMedium} />
                    <Text style={styles.emptyText}>No money requests</Text>
                    <Text style={styles.emptySubtext}>Keep track of who owes what</Text>
                  </View>
                ) : (
                  requests.map((request) => {
                    const isRequester = request.requester_id === user?.id;
                    const isOwer = request.ower_id === user?.id;

                    return (
                      <View key={request.id} style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                          <View style={styles.avatarsRow}>
                            {request.requester_photo ? (
                              <Image source={{ uri: request.requester_photo }} style={styles.requestAvatar} />
                            ) : (
                              <View style={styles.requestAvatarPlaceholder}>
                                <Text style={styles.avatarInitial}>
                                  {request.requester_first_name?.charAt(0)}
                                </Text>
                              </View>
                            )}
                            <Ionicons name="arrow-forward" size={14} color={Colors.gray} style={styles.arrowIcon} />
                            {request.ower_photo ? (
                              <Image source={{ uri: request.ower_photo }} style={styles.requestAvatar} />
                            ) : (
                              <View style={styles.requestAvatarPlaceholder}>
                                <Text style={styles.avatarInitial}>
                                  {request.ower_first_name?.charAt(0)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.requestAmount}>${parseFloat(request.amount).toFixed(2)}</Text>
                        </View>

                        <Text style={styles.requestInfo}>
                          {request.requester_first_name} requested from {request.ower_first_name}
                        </Text>

                        {request.description && (
                          <Text style={styles.requestDescription}>{request.description}</Text>
                        )}

                        <View style={styles.statusRow}>
                          {request.is_paid ? (
                            <View style={styles.paidBadge}>
                              <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
                              <Text style={styles.paidText}>Paid</Text>
                            </View>
                          ) : (
                            <View style={styles.unpaidBadge}>
                              <Text style={styles.unpaidText}>Pending</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.requestActions}>
                          {isOwer && !request.is_paid && (
                            <TouchableOpacity
                              style={styles.markPaidButton}
                              onPress={() => handleMarkPaid(request.id)}
                            >
                              <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
                            </TouchableOpacity>
                          )}
                          {isRequester && request.is_paid && (
                            <TouchableOpacity
                              style={styles.clearButton}
                              onPress={() => handleClear(request.id)}
                            >
                              <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                          {isRequester && (
                            <TouchableOpacity
                              style={styles.deleteRequestButton}
                              onPress={() => handleDelete(request.id)}
                            >
                              <Ionicons name="trash-outline" size={16} color={Colors.red} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
      </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 6,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  disabledButtonText: {
    fontSize: 14,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 2,
  },
  requestCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  requestAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  arrowIcon: {
    marginHorizontal: 6,
  },
  requestAmount: {
    fontSize: 18,
    color: Colors.green,
    fontFamily: 'Prompt-Bold',
  },
  requestInfo: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginBottom: 3,
  },
  requestDescription: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  statusRow: {
    marginBottom: 10,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  paidText: {
    fontSize: 11,
    color: Colors.green,
    fontFamily: 'Prompt-Medium',
    marginLeft: 3,
  },
  unpaidBadge: {
    backgroundColor: Colors.yellowLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  unpaidText: {
    fontSize: 11,
    color: Colors.yellow,
    fontFamily: 'Prompt-Medium',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markPaidButton: {
    flex: 1,
    backgroundColor: Colors.green,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  markPaidButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  clearButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  clearButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  deleteRequestButton: {
    padding: 8,
    backgroundColor: Colors.redLight,
    borderRadius: 8,
  },
  createForm: {
    backgroundColor: Colors.grayLight,
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
});
