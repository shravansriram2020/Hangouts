import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
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

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  attendees: any[];
}

export default function MoneyModal({ visible, onClose, eventId, attendees }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedOwer, setSelectedOwer] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleCreateRequest = async () => {
    if (!selectedOwer || !amount) {
      Alert.alert('Required', 'Please select a person and enter an amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/money', {
        eventId,
        owerId: selectedOwer,
        amount: parseFloat(amount),
        description,
      });

      setShowCreateRequest(false);
      setSelectedOwer('');
      setAmount('');
      setDescription('');
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setLoading(false);
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

  const otherAttendees = attendees?.filter(a => a.id !== user?.id) || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/7630510_1756853409509_1764548151597.png')}
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>Money</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {showCreateRequest ? (
            <View style={styles.createForm}>
              <Text style={styles.formTitle}>Request Payment</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Who owes you money?</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedOwer}
                    onValueChange={setSelectedOwer}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a person" value="" />
                    {otherAttendees.map((attendee) => (
                      <Picker.Item
                        key={attendee.id}
                        label={attendee.first_name}
                        value={attendee.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.grayMedium}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>What for? (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., dinner split, gas money..."
                  placeholderTextColor={Colors.grayMedium}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateRequest(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleCreateRequest}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Sending...' : 'Send Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateRequest(true)}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>Request Payment</Text>
              </TouchableOpacity>

              {requests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={48} color={Colors.grayMedium} />
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
                          <Ionicons name="arrow-forward" size={16} color={Colors.gray} style={styles.arrowIcon} />
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
                            <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
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
                            <Ionicons name="trash-outline" size={18} color={Colors.red} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  requestAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  requestAmount: {
    fontSize: 20,
    color: Colors.green,
    fontFamily: 'Prompt-Bold',
  },
  requestInfo: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusRow: {
    marginBottom: 12,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  paidText: {
    fontSize: 12,
    color: Colors.green,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  unpaidBadge: {
    backgroundColor: Colors.yellowLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  unpaidText: {
    fontSize: 12,
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
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  markPaidButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  clearButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  deleteRequestButton: {
    padding: 10,
    backgroundColor: Colors.redLight,
    borderRadius: 10,
  },
  createForm: {
    backgroundColor: Colors.grayLight,
    borderRadius: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'Prompt-Medium',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.white,
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
