import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import type { VehicleAccessRequestInput } from '@/types';

import { vehicleStyles } from './vehicle-styles';

const maxEvidenceFiles = 5;
const maxEvidenceFileSize = 10 * 1024 * 1024;
type EvidenceFile = NonNullable<VehicleAccessRequestInput['documents']>[number];

export function VehicleVerificationModal({
  visible,
  plate,
  saving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  plate: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { relationship: string; documents: EvidenceFile[] }) => Promise<void>;
}) {
  const [relationship, setRelationship] = useState('');
  const [documents, setDocuments] = useState<EvidenceFile[]>([]);

  useEffect(() => {
    if (!visible) {
      setRelationship('');
      setDocuments([]);
    }
  }, [visible]);

  const handleClose = () => {
    setRelationship('');
    setDocuments([]);
    onClose();
  };

  const pickEvidence = async () => {
    const remainingSlots = maxEvidenceFiles - documents.length;
    if (remainingSlots <= 0) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Chưa có quyền truy cập ảnh',
        'Vui lòng cấp quyền thư viện ảnh để chọn ảnh xác minh xe.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });
    if (result.canceled) return;

    const acceptedAssets = result.assets.filter(
      (asset) => typeof asset.fileSize !== 'number' || asset.fileSize <= maxEvidenceFileSize,
    );
    if (acceptedAssets.length !== result.assets.length) {
      Alert.alert('Ảnh quá lớn', 'Mỗi ảnh xác minh phải nhỏ hơn 10 MB.');
    }

    const selectedUris = new Set(documents.map((document) => document.uri));
    const nextDocuments = acceptedAssets
      .filter((asset) => !selectedUris.has(asset.uri))
      .slice(0, remainingSlots)
      .map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `vehicle-evidence-${Date.now()}-${index + 1}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        file: asset.file,
      }));

    setDocuments((current) => [...current, ...nextDocuments]);
  };

  const canSubmit = relationship.trim().length >= 2 && documents.length > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={vehicleStyles.dialogBackdrop}>
        <View style={vehicleStyles.dialogCard}>
          <ScrollView
            contentContainerStyle={vehicleStyles.dialogCardContent}
            keyboardShouldPersistTaps="handled">
          <Text style={vehicleStyles.dialogTitle}>Yêu cầu xác minh quyền sử dụng xe</Text>
          <Text style={vehicleStyles.dialogText}>
            Biển số {plate} đã tồn tại trong hệ thống. Hãy cung cấp ảnh xe hoặc giấy tờ chứng minh
            quyền sở hữu, sử dụng xe.
          </Text>
          <FormField label="Biển số" value={plate} editable={false} />
          <FormField
            label="Mối quan hệ với xe"
            value={relationship}
            onChangeText={setRelationship}
            placeholder="VD: Chủ xe, người được ủy quyền"
          />

          <Text style={vehicleStyles.evidenceLabel}>Ảnh xe hoặc giấy tờ xác minh</Text>
          <Text style={vehicleStyles.evidenceHint}>
            Chọn từ 1 đến 5 ảnh xe hoặc ảnh chụp giấy tờ. Mỗi ảnh tối đa 10 MB.
          </Text>
          <Pressable
            disabled={saving || documents.length >= maxEvidenceFiles}
            onPress={() => void pickEvidence()}
            style={vehicleStyles.evidencePickerButton}>
            <Text style={vehicleStyles.evidencePickerText}>+ Chọn ảnh</Text>
            <Text style={vehicleStyles.evidenceCount}>{documents.length}/5</Text>
          </Pressable>

          {documents.map((document) => (
            <View key={document.uri} style={vehicleStyles.evidenceFileRow}>
              <Text numberOfLines={1} style={vehicleStyles.evidenceFileName}>
                {document.name}
              </Text>
              <Pressable
                disabled={saving}
                onPress={() =>
                  setDocuments((current) => current.filter((item) => item.uri !== document.uri))
                }>
                <Text style={vehicleStyles.evidenceRemoveText}>Xóa</Text>
              </Pressable>
            </View>
          ))}

          </ScrollView>
          <View style={vehicleStyles.dialogActions}>
            <Pressable disabled={saving} onPress={handleClose} style={vehicleStyles.keepButton}>
              <Text style={vehicleStyles.keepButtonText}>Đóng</Text>
            </Pressable>
            <Pressable
              disabled={saving || !canSubmit}
              onPress={() => void onSubmit({ relationship: relationship.trim(), documents })}
              style={[
                vehicleStyles.confirmButton,
                (saving || !canSubmit) && vehicleStyles.buttonDisabled,
              ]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={vehicleStyles.confirmButtonText}>Gửi yêu cầu</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
