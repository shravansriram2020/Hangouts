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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts } from '../../../constants/theme';
import { useEvent } from '../../../context/EventContext';
import { api } from '../../../services/api';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48 - 16) / 3;

interface Photo {
  id: string;
  photo_url: string;
  first_name: string;
  created_at: string;
  expires_at: string;
}

export default function PhotosScreen() {
  const { event } = useEvent();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleDownloadAll = async () => {
    alert('Download all photos functionality');
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
    <View style={styles.container}>
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
          numColumns={3}
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
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
