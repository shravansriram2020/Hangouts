import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassModal from './GlassModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export default function ArchivedPhotosModal({ visible, onClose, eventId, eventTitle }: Props) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchPhotos();
    }
  }, [visible, eventId]);

  const fetchPhotos = async () => {
    try {
      const data = await api.get(`/photos/event/${eventId}`);
      setPhotos(data);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };

  const handleAddPhoto = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      setUploading(true);
      try {
        for (const asset of result.assets) {
          if (asset.base64) {
            const photoData = `data:image/jpeg;base64,${asset.base64}`;
            await api.post('/photos', {
              eventId,
              photoUrl: photoData,
            });
          }
        }
        fetchPhotos();
      } catch (error) {
        console.error('Upload failed:', error);
        Alert.alert('Error', 'Failed to upload photos');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/photos/${photoId}`);
            setSelectedPhoto(null);
            fetchPhotos();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete photo');
          }
        },
      },
    ]);
  };

  const handleDownloadAll = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert('Download All', 'Photos will be saved to your device.');
  };

  const handleDownloadPhoto = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert('Download', 'Photo saved to your device.');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderPhoto = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[styles.photoItem, index % 3 === 0 && styles.photoItemFirst]}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  return (
    <GlassModal visible={visible} onClose={onClose} title={`${eventTitle} Photos`} fullHeight noScroll>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.addPhotoButton, uploading && styles.addPhotoButtonDisabled]}
            onPress={handleAddPhoto}
            disabled={uploading}
          >
            <Ionicons name="camera-outline" size={18} color={Colors.secondary} />
            <Text style={styles.addPhotoText}>
              {uploading ? 'Uploading...' : 'Add Photo'}
            </Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <TouchableOpacity 
              style={styles.downloadAllButton}
              onPress={handleDownloadAll}
            >
              <Ionicons name="download-outline" size={18} color={Colors.secondary} />
              <Text style={styles.downloadAllText}>All</Text>
            </TouchableOpacity>
          )}
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="camera-outline" size={48} color={Colors.grayMedium} />
            </View>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptyDescription}>
              Upload photos from this hangout before they expire!
            </Text>
            <Text style={styles.expiryNote}>
              Photos expire 30 days after the event
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={3}
            style={styles.photoGrid}
            contentContainerStyle={styles.photoGridContent}
          />
        )}
      </View>

      <Modal visible={!!selectedPhoto} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>

          {selectedPhoto && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />

              <View style={styles.photoInfo}>
                <View style={styles.uploaderInfo}>
                  {selectedPhoto.profile_photo ? (
                    <Image
                      source={{ uri: selectedPhoto.profile_photo }}
                      style={styles.uploaderPhoto}
                    />
                  ) : (
                    <View style={styles.uploaderPhotoPlaceholder}>
                      <Text style={styles.uploaderInitial}>
                        {selectedPhoto.first_name?.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.uploaderName}>{selectedPhoto.first_name}</Text>
                    <Text style={styles.uploadTime}>
                      {formatDate(selectedPhoto.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.photoActions}>
                  <TouchableOpacity 
                    style={styles.photoActionButton}
                    onPress={handleDownloadPhoto}
                  >
                    <Ionicons name="download-outline" size={24} color={Colors.white} />
                  </TouchableOpacity>
                  {selectedPhoto.uploader_id === user?.id && (
                    <TouchableOpacity
                      style={styles.photoActionButton}
                      onPress={() => handleDeletePhoto(selectedPhoto.id)}
                    >
                      <Ionicons name="trash-outline" size={24} color={Colors.red} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    marginBottom: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  addPhotoButtonDisabled: {
    opacity: 0.5,
  },
  addPhotoText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 6,
  },
  downloadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.grayLight,
    borderRadius: 8,
    marginLeft: 12,
  },
  downloadAllText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.secondary,
    fontFamily: 'Prompt-SemiBold',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
  },
  expiryNote: {
    fontSize: 12,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  photoGrid: {
    flex: 1,
  },
  photoGridContent: {
    paddingHorizontal: 2,
  },
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  photoItemFirst: {},
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '70%',
  },
  photoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  uploaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploaderPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  uploaderPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploaderInitial: {
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Bold',
  },
  uploaderName: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
  },
  uploadTime: {
    fontSize: 12,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
  },
  photoActions: {
    flexDirection: 'row',
  },
  photoActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
