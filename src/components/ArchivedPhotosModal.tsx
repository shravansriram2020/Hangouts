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
  Dimensions,
  Share,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../constants/theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassModal from './GlassModal';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

interface Photo {
  id: string;
  photo_url: string;
  first_name: string;
  user_id?: string;
  uploader_id?: string;
  profile_photo?: string;
  created_at: string;
  expires_at: string;
}

export default function ArchivedPhotosModal({ visible, onClose, eventId, eventTitle }: Props) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const modalContentWidth = Math.min(width * 0.92, 500) - 48;
  const PHOTO_SIZE = (modalContentWidth - 8) / 2;

  useEffect(() => {
    if (visible) {
      fetchPhotos();
    }
  }, [visible, eventId]);

  const fetchPhotos = async () => {
    try {
      console.log('[ArchivedPhotos] Fetching photos for event:', eventId);
      const data = await api.get(`/photos/event/${eventId}`);
      console.log('[ArchivedPhotos] Received photos:', data?.length || 0);
      setPhotos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      setPhotos([]);
    }
  };

  const handleAddPhoto = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access photos is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.5,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
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
          await fetchPhotos();
        } catch (error) {
          console.error('Upload failed:', error);
          Alert.alert('Error', 'Failed to upload photos');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/photos/${photoId}`);
            setSelectedPhoto(null);
            await fetchPhotos();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete photo');
          }
        },
      },
    ]);
  };

  const handleDownloadPhoto = async (photo: Photo) => {
    try {
      setDownloading(true);
      await Share.share({
        url: photo.photo_url,
        message: `Photo from ${photo.first_name}`,
        title: 'Share Photo',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share photo');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    try {
      setDownloading(true);
      const urls = photos.map(p => p.photo_url).join('\n');
      await Share.share({
        message: `${photos.length} photos from ${eventTitle}:\n${urls}`,
        title: 'Share All Photos',
      });
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity 
      style={[styles.photoItem, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  return (
    <GlassModal visible={visible} onClose={onClose} title={`${eventTitle} Photos`} fullHeight noScroll>
      <View style={styles.container}>
        <View style={styles.headerActions}>
          {Platform.OS === 'web' ? (
            <>
              <TouchableOpacity 
                style={styles.addPhotoButtonWeb}
                onPress={handleAddPhoto}
                disabled={uploading}
              >
                <Ionicons name="images-outline" size={20} color={Colors.secondary} />
                <Text style={styles.addPhotoText}>
                  {uploading ? 'Uploading...' : 'Add Photos'}
                </Text>
              </TouchableOpacity>
              {photos.length > 0 && (
                <TouchableOpacity 
                  style={styles.downloadAllButtonWeb}
                  onPress={handleDownloadAll}
                >
                  <Ionicons name="download-outline" size={18} color={Colors.secondary} />
                  <Text style={styles.downloadAllText}>All</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <BlurView intensity={80} tint="light" style={styles.addPhotoButtonGlass}>
                <TouchableOpacity 
                  style={styles.glassButtonInner}
                  onPress={handleAddPhoto}
                  disabled={uploading}
                >
                  <Ionicons name="images-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.addPhotoText}>
                    {uploading ? 'Uploading...' : 'Add Photos'}
                  </Text>
                </TouchableOpacity>
              </BlurView>
              {photos.length > 0 && (
                <BlurView intensity={80} tint="light" style={styles.downloadAllButtonGlass}>
                  <TouchableOpacity 
                    style={styles.glassButtonInnerSmall}
                    onPress={handleDownloadAll}
                  >
                    <Ionicons name="download-outline" size={18} color={Colors.secondary} />
                    <Text style={styles.downloadAllText}>All</Text>
                  </TouchableOpacity>
                </BlurView>
              )}
            </>
          )}
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="camera-outline" size={64} color={Colors.grayMedium} />
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySubtitle}>Photos expire 30 days after the event</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            renderItem={renderPhoto}
            numColumns={2}
            contentContainerStyle={styles.photoGrid}
            columnWrapperStyle={styles.photoRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoModal}>
          <TouchableOpacity 
            style={styles.photoModalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          {selectedPhoto && (
            <>
              <Image 
                source={{ uri: selectedPhoto.photo_url }} 
                style={[styles.photoModalImage, { width: screenWidth - 32, height: screenWidth - 32 }]}
                resizeMode="contain"
              />
              <View style={styles.photoModalInfo}>
                <Text style={styles.photoModalUser}>{selectedPhoto.first_name}</Text>
                <Text style={styles.photoModalDate}>
                  {new Date(selectedPhoto.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.photoModalActions}>
                <TouchableOpacity 
                  style={styles.photoModalButton}
                  onPress={() => handleDownloadPhoto(selectedPhoto)}
                  disabled={downloading}
                >
                  <Ionicons name="download-outline" size={20} color={Colors.white} />
                  <Text style={styles.photoModalButtonText}>Download</Text>
                </TouchableOpacity>
                {(user?.id === selectedPhoto.user_id || user?.id === selectedPhoto.uploader_id) && (
                  <TouchableOpacity 
                    style={[styles.photoModalButton, styles.photoModalButtonDelete]}
                    onPress={() => handleDeletePhoto(selectedPhoto.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.white} />
                    <Text style={styles.photoModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 12,
  },
  addPhotoButtonGlass: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addPhotoButtonWeb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassButtonInnerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  addPhotoText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  downloadAllButtonGlass: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  downloadAllButtonWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  downloadAllText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.semiBold,
    color: Colors.grayMedium,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 4,
  },
  photoGrid: {
    paddingBottom: 20,
  },
  photoRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoModalImage: {
    borderRadius: 12,
  },
  photoModalInfo: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  photoModalUser: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  photoModalDate: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  photoModalActions: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  photoModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(90, 172, 230, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoModalButtonDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  photoModalButtonText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
