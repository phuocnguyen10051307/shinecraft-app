import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, vehiclesApi } from '@/lib/api';
import type { Vehicle, VehicleInput, VehicleType } from '@/types';

const emptyForm: VehicleInput = {
  type: 'car',
  brand: '',
  model: '',
  licensePlate: '',
  year: new Date().getFullYear(),
  note: '',
};

export default function VehiclesScreen() {
  const { user, validateSession } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleInput>(emptyForm);
  const [modalVisible, setModalVisible] = useState(false);

  const handleError = useCallback(
    async (error: unknown, title: string) => {
      if (error instanceof ApiError && error.status === 401) {
        await validateSession();
        return;
      }
      Alert.alert(title, getApiErrorMessage(error));
    },
    [validateSession],
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!user) return;
      if (!quiet) setLoading(true);
      try {
        setVehicles(await vehiclesApi.list(user.role));
      } catch (error) {
        await handleError(error, 'Không tải được danh sách xe');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleError, user],
  );

  useEffect(() => {
    const task = Promise.resolve().then(() => load());
    return () => {
      void task;
    };
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setForm({
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      year: vehicle.year,
      note: vehicle.note ?? '',
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.brand.trim() || !form.model.trim() || !form.licensePlate.trim()) {
      Alert.alert('Thiếu thông tin', 'Hãng xe, mẫu xe và biển số là bắt buộc.');
      return;
    }
    if (form.year < 1900 || form.year > new Date().getFullYear() + 1) {
      Alert.alert('Năm sản xuất không hợp lệ');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await vehiclesApi.update(editing._id, form);
        setVehicles((current) =>
          current.map((vehicle) => (vehicle._id === updated._id ? updated : vehicle)),
        );
      } else {
        const created = await vehiclesApi.create(form);
        setVehicles((current) => [created, ...current]);
      }
      setModalVisible(false);
    } catch (error) {
      await handleError(error, editing ? 'Không thể cập nhật xe' : 'Không thể thêm xe');
    } finally {
      setSaving(false);
    }
  };

  const remove = (vehicle: Vehicle) => {
    Alert.alert('Xóa xe', `Bạn chắc chắn muốn xóa ${vehicle.brand} ${vehicle.model}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiclesApi.remove(vehicle._id);
            setVehicles((current) => current.filter((item) => item._id !== vehicle._id));
          } catch (error) {
            await handleError(error, 'Không thể xóa xe');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{user?.role === 'customer' ? 'Xe của tôi' : 'Quản lý xe'}</Text>
            <Text style={styles.subtitle}>Thông tin xe được đồng bộ trực tiếp với server.</Text>
          </View>
          {user?.role === 'customer' ? (
            <Pressable onPress={openCreate} style={styles.addButton}>
              <Text style={styles.addButtonText}>Thêm xe</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Tổng số xe</Text>
          <Text style={styles.summaryValue}>{vehicles.length}</Text>
          <Text style={styles.summaryHint}>Kéo xuống để làm mới dữ liệu</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có xe nào</Text>
            <Text style={styles.emptyText}>Thêm chiếc xe đầu tiên để bắt đầu quản lý.</Text>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <View key={vehicle._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.vehicleMark}>
                  <Text style={styles.vehicleMarkText}>{vehicle.type === 'car' ? 'CAR' : 'BIKE'}</Text>
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleMeta}>
                    {vehicle.year} · {vehicle.licensePlate}
                  </Text>
                </View>
              </View>
              {vehicle.note ? <Text style={styles.note}>{vehicle.note}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => openEdit(vehicle)} style={styles.editButton}>
                  <Text style={styles.editText}>Chỉnh sửa</Text>
                </Pressable>
                <Pressable onPress={() => remove(vehicle)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Xóa</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <VehicleModal
        visible={modalVisible}
        editing={editing}
        form={form}
        saving={saving}
        setForm={setForm}
        onClose={() => setModalVisible(false)}
        onSave={save}
      />
    </SafeAreaView>
  );
}

function VehicleModal({
  visible,
  editing,
  form,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: Vehicle | null;
  form: VehicleInput;
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<VehicleInput>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof VehicleInput) => (value: string) =>
    setForm((current) => ({
      ...current,
      [key]: key === 'year' ? Number(value.replace(/\D/g, '')) || 0 : value,
    }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Đóng</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Loại xe</Text>
          <View style={styles.typeRow}>
            {[
              ['car', 'Ô tô'],
              ['motorbike', 'Xe máy'],
              ['other', 'Khác'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() =>
                  setForm((current) => ({ ...current, type: value as VehicleType }))
                }
                style={[styles.typeButton, form.type === value && styles.typeButtonActive]}>
                <Text style={[styles.typeText, form.type === value && styles.typeTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormField label="Hãng xe" value={form.brand} onChangeText={update('brand')} />
          <FormField label="Mẫu xe" value={form.model} onChangeText={update('model')} />
          <FormField
            label="Biển số"
            value={form.licensePlate}
            onChangeText={update('licensePlate')}
            autoCapitalize="characters"
          />
          <FormField
            label="Năm sản xuất"
            value={form.year ? String(form.year) : ''}
            onChangeText={update('year')}
            keyboardType="number-pad"
          />
          <FormField
            label="Ghi chú"
            value={form.note}
            onChangeText={update('note')}
            multiline
            numberOfLines={4}
            style={styles.noteInput}
          />
          <Pressable disabled={saving} onPress={onSave} style={styles.saveButton}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{editing ? 'Lưu thay đổi' : 'Thêm xe'}</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  addButton: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary },
  addButtonText: { color: '#fff', fontWeight: '800' },
  summary: { padding: 20, borderRadius: 21, backgroundColor: colors.ink },
  summaryLabel: { color: '#d0d5dd', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 3 },
  summaryHint: { color: '#98a2b3', fontSize: 11, marginTop: 4 },
  loader: { paddingVertical: 50 },
  empty: { padding: 28, borderRadius: 18, alignItems: 'center', backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  emptyText: { color: colors.muted, marginTop: 6, textAlign: 'center' },
  card: {
    padding: 18,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 13,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  vehicleMark: { width: 54, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  vehicleMarkText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  vehicleInfo: { flex: 1 },
  vehicleName: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  vehicleMeta: { color: colors.muted, marginTop: 4 },
  note: { color: colors.muted, lineHeight: 20, backgroundColor: colors.background, padding: 12, borderRadius: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  editButton: { flex: 1, alignItems: 'center', padding: 11, borderRadius: 11, backgroundColor: colors.tint },
  editText: { color: colors.primary, fontWeight: '800' },
  deleteButton: { paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fef3f2' },
  deleteText: { color: colors.danger, fontWeight: '800' },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: 20, paddingBottom: 40, gap: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  modalTitle: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  close: { color: colors.primary, fontWeight: '800' },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: -8 },
  typeRow: { flexDirection: 'row', gap: 9 },
  typeButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  typeButtonActive: { backgroundColor: colors.tint, borderColor: colors.primary },
  typeText: { color: colors.muted, fontWeight: '700' },
  typeTextActive: { color: colors.primary },
  noteInput: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  saveButton: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
