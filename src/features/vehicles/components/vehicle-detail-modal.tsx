import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Vehicle } from '@/types';

import { DetailRow } from './vehicle-primitives';
import { vehicleStyles } from './vehicle-styles';

export function VehicleDetailModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const images = vehicle?.images ?? [];
  const selectedImage = selectedImageIndex === null ? null : images[selectedImageIndex];

  useEffect(() => {
    setSelectedImageIndex(null);
  }, [vehicle?._id]);

  const handleRequestClose = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(null);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={Boolean(vehicle)} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleRequestClose}>
      <View
        style={[
          vehicleStyles.modalSafe,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
        <ScrollView contentContainerStyle={vehicleStyles.modalContent}>
          <View style={vehicleStyles.modalHeader}>
            <Text style={vehicleStyles.modalTitle}>{'Chi tiết xe'}</Text>
            <Pressable hitSlop={10} onPress={onClose} style={vehicleStyles.modalCloseButton}>
              <Text style={vehicleStyles.close}>{'Đóng'}</Text>
            </Pressable>
          </View>
          {vehicle ? (
            <>
              <View style={vehicleStyles.detailBlock}>
                <DetailRow label={'Hãng xe'} value={vehicle.brand} />
                <DetailRow label={'Dòng xe'} value={vehicle.model} />
                <DetailRow label={'Biển số'} value={vehicle.licensePlate} />
                <DetailRow label={'Năm sản xuất'} value={String(vehicle.year)} />
                <DetailRow label={'Số ảnh'} value={String(vehicle.images?.length ?? 0)} />
              </View>
              {images.length ? (
                <>
                  <Text style={vehicleStyles.galleryTitle}>Hình ảnh xe</Text>
                  <Text style={vehicleStyles.galleryHint}>Chạm vào ảnh để xem kích thước lớn.</Text>
                  <View style={vehicleStyles.gallery}>
                    {images.map((image, index) => (
                      <Pressable
                      key={image.id}
                        accessibilityLabel={`Xem ảnh xe ${index + 1}`}
                        accessibilityRole="button"
                        onPress={() => setSelectedImageIndex(index)}
                        style={vehicleStyles.galleryThumbnail}>
                        <Image
                          source={{ uri: image.url }}
                          style={vehicleStyles.galleryImage}
                          contentFit="cover"
                        />
                        <View style={vehicleStyles.galleryIndexBadge}>
                          <Text style={vehicleStyles.galleryIndexText}>{index + 1}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <View style={vehicleStyles.emptyGallery}>
                  <Text style={vehicleStyles.emptyGalleryText}>
                    {'Xe này chưa có ảnh trên hệ thống.'}
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        {selectedImage ? (
          <View
            style={[
              vehicleStyles.imageViewer,
              { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) },
            ]}>
            <View style={vehicleStyles.imageViewerHeader}>
              <Text style={vehicleStyles.imageViewerCounter}>
                Ảnh {(selectedImageIndex ?? 0) + 1}/{images.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setSelectedImageIndex(null)}
                style={vehicleStyles.imageViewerClose}>
                <Text style={vehicleStyles.imageViewerCloseText}>Đóng ảnh</Text>
              </Pressable>
            </View>

            <Image source={{ uri: selectedImage.url }} style={vehicleStyles.imageViewerImage} contentFit="contain" />

            {images.length > 1 ? (
              <View style={vehicleStyles.imageViewerActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={selectedImageIndex === 0}
                  onPress={() => setSelectedImageIndex((current) => current === null ? null : current - 1)}
                  style={[
                    vehicleStyles.imageViewerButton,
                    selectedImageIndex === 0 && vehicleStyles.imageViewerButtonDisabled,
                  ]}>
                  <Text style={vehicleStyles.imageViewerButtonText}>Ảnh trước</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={selectedImageIndex === images.length - 1}
                  onPress={() => setSelectedImageIndex((current) => current === null ? null : current + 1)}
                  style={[
                    vehicleStyles.imageViewerButton,
                    selectedImageIndex === images.length - 1 && vehicleStyles.imageViewerButtonDisabled,
                  ]}>
                  <Text style={vehicleStyles.imageViewerButtonText}>Ảnh sau</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
