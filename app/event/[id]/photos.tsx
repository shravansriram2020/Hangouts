import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48 - 16) / 2;

interface Photo {
  id: string;
  photo_url: string;
  first_name: string;
  user_id?: string;
  created_at: string;
  expires_at: string;
}

export default function PhotosScreen() {
  const { event } = useEvent();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const gradientColors = event?.gradient_color1 && event?.gradient_color2 
    ? [event.gradient_color1, event.gradient_color2]
    : [Colors.backgroundGradientStart, Colors.backgroundGradientEnd];

  useEffect(() => {
    if (event?.id) {
      fetchPhotos();
    }
  }, [event?.id]);

  const fetchPhotos = async () => {
    if (!event?.id) return;
    try {
      const data = await api.get(`/photos/event/${event.id}`);
      setPhotos(data);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access photos is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          const photoData = `data:image/jpeg;base64,${result.assets[0].base64}`;
          await api.post('/photos', {
            eventId: event?.id,
            photoUrl: photoData,
          });
          await fetchPhotos();
        } catch (error) {
          console.error('Failed to upload photo:', error);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
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

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    try {
      setDownloading(true);
      const urls = photos.map(p => p.photo_url).join('\n');
      await Share.share({
        message: `${photos.length} photos from event:\n${urls}`,
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
      style={styles.photoItem}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.innerContainer}>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.addPhotoButton}
          onPress={handleAddPhoto}
          disabled={uploading}
        >
          <Ionicons name="camera-outline" size={20} color={Colors.secondary} />
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
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.grayMedium} />
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share a moment!</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderPhoto}
          numColumns={2}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

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
                style={styles.photoModalImage}
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
                {user?.id === selectedPhoto.user_id && (
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  addPhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.secondary,
  },
  downloadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
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
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
    width: width - 32,
    height: width - 32,
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
