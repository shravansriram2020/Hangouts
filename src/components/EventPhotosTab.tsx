import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingDots from './LoadingDots';

interface Props {
  eventId: string;
}

// Use blurhash for image placeholders (smoother loading)
const BLURHASH = '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7teleayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuay';

export default function EventPhotosTab({ eventId }: Props) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetchPhotos();
  }, [eventId]);

  const fetchPhotos = useCallback(async (isRefresh = false) => {
    try {
      const data = await api.get(`/photos/event/${eventId}`);
      setPhotos(data);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [eventId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos(true);
  }, [fetchPhotos]);

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const photoUrls = result.assets
        .filter(asset => asset.base64)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      
      if (photoUrls.length === 0) {
        Alert.alert('Error', 'No valid photos selected');
        return;
      }

      setUploading(true);
      try {
        const response = await api.post('/photos/batch', {
          eventId,
          photoUrls,
        });
        
        fetchPhotos();
        
        if (response.failedCount > 0) {
          Alert.alert(
            'Partial Upload', 
            `${response.uploadedCount} photo(s) uploaded successfully. ${response.failedCount} photo(s) could not be uploaded.`
          );
        }
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
      <Image 
        source={{ uri: item.photo_url }} 
        style={styles.photoImage}
        placeholder={BLURHASH}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    </TouchableOpacity>
  );

  return (
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
          <TouchableOpacity style={styles.downloadAllButton}>
            <Ionicons name="download-outline" size={18} color={Colors.secondary} />
            <Text style={styles.downloadAllText}>All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={48} color={Colors.grayMedium} />
          </View>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptyDescription}>
            Be the first to share a moment!
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
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Upload Loading Overlay */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadModal}>
            <LoadingDots size={14} />
            <Text style={styles.uploadText}>Uploading photos...</Text>
          </View>
        </View>
      </Modal>

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
                contentFit="contain"
                cachePolicy="memory-disk"
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
                  <TouchableOpacity style={styles.photoActionButton}>
                    <Ionicons name="download-outline" size={24} color={Colors.white} />
                  </TouchableOpacity>
                  {selectedPhoto.uploader_id === user?.id && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.photoActionButton,
                          styles.shareToggle,
                          selectedPhoto.share_to_explore && styles.shareToggleActive
                        ]}
                        onPress={async () => {
                          try {
                            const newValue = !selectedPhoto.share_to_explore;
                            const response = await api.patch(`/photos/${selectedPhoto.id}/share`, { share_to_explore: newValue });
                            const updatedStatus = response.moderation_status || (newValue ? 'pending' : null);
                            setSelectedPhoto({ ...selectedPhoto, share_to_explore: newValue, moderation_status: updatedStatus });
                            setPhotos(photos.map(p => p.id === selectedPhoto.id ? { ...p, share_to_explore: newValue, moderation_status: updatedStatus } : p));
                          } catch (error) {
                            Alert.alert('Error', 'Failed to update sharing preference');
                          }
                        }}
                      >
                        <Ionicons
                          name={selectedPhoto.share_to_explore ? "globe" : "globe-outline"}
                          size={24}
                          color={selectedPhoto.share_to_explore ? Colors.primary : Colors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.photoActionButton}
                        onPress={() => handleDeletePhoto(selectedPhoto.id)}
                      >
                        <Ionicons name="trash-outline" size={24} color={Colors.red} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {selectedPhoto.uploader_id === user?.id && (
                  <Text style={[
                    styles.shareHint,
                    selectedPhoto.moderation_status === 'approved' && styles.shareHintApproved,
                    selectedPhoto.moderation_status === 'rejected' && styles.shareHintRejected,
                  ]}>
                    {selectedPhoto.share_to_explore
                      ? selectedPhoto.moderation_status === 'approved'
                        ? 'Live on Explore page!'
                        : selectedPhoto.moderation_status === 'rejected'
                        ? 'Not approved for Explore'
                        : 'Shared to Explore (pending review)'
                      : 'Tap globe to share to Explore'}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
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
  photoGrid: {
    flex: 1,
    marginTop: 12,
  },
  photoGridContent: {
    paddingHorizontal: 14,
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
  shareToggle: {},
  shareToggleActive: {
    backgroundColor: 'rgba(102, 205, 170, 0.3)',
  },
  shareHint: {
    fontSize: 12,
    color: Colors.grayMedium,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  shareHintApproved: {
    color: '#4CAF50',
  },
  shareHintRejected: {
    color: '#F44336',
  },
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 40,
    paddingVertical: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  uploadText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.white,
    fontFamily: 'Prompt-Medium',
  },
});
