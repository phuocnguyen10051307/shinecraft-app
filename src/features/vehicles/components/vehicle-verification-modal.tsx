import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';

import { vehicleStyles } from './vehicle-styles';

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
  onSubmit: (payload: { relationship: string; note: string }) => Promise<void>;
}) {
  const [relationship, setRelationship] = useState('');
  const [note, setNote] = useState('');

  const handleClose = () => {
    setRelationship('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={vehicleStyles.dialogBackdrop}>
        <View style={vehicleStyles.dialogCard}>
          <Text style={vehicleStyles.dialogTitle}>{'Yêu cầu xác minh quyền sử dụng xe'}</Text>
          <Text style={vehicleStyles.dialogText}>
            {'Biển số ' + plate + ' đã tồn tại trong hệ thống. Nếu bạn là chủ xe hoặc người được ủy quyền, hãy gửi yêu cầu xác minh.'}
          </Text>
          <FormField label={'Biển số'} value={plate} editable={false} />
          <FormField
            label={'Mối quan hệ / lý do'}
            value={relationship}
            onChangeText={setRelationship}
          />
          <FormField
            label={'Ghi chú'}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            style={vehicleStyles.noteInput}
          />
          <View style={vehicleStyles.dialogActions}>
            <Pressable disabled={saving} onPress={handleClose} style={vehicleStyles.keepButton}>
              <Text style={vehicleStyles.keepButtonText}>{'Đóng'}</Text>
            </Pressable>
            <Pressable
              disabled={saving || relationship.trim().length < 2}
              onPress={() =>
                void onSubmit({ relationship: relationship.trim(), note: note.trim() })
              }
              style={[
                vehicleStyles.confirmButton,
                (saving || relationship.trim().length < 2) && vehicleStyles.buttonDisabled,
              ]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={vehicleStyles.confirmButtonText}>{'Gửi yêu cầu'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
