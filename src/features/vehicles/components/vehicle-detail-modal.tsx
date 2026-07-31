import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  return (
    <Modal visible={Boolean(vehicle)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={vehicleStyles.modalSafe}>
        <ScrollView contentContainerStyle={vehicleStyles.modalContent}>
          <View style={vehicleStyles.modalHeader}>
            <Text style={vehicleStyles.modalTitle}>{'Chi tiết xe'}</Text>
            <Pressable onPress={onClose}>
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
              {vehicle.images?.length ? (
                <View style={vehicleStyles.gallery}>
                  {vehicle.images.map((image) => (
                    <Image
                      key={image.id}
                      source={{ uri: image.url }}
                      style={vehicleStyles.galleryImage}
                      contentFit="cover"
                    />
                  ))}
                </View>
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
      </SafeAreaView>
    </Modal>
  );
}
