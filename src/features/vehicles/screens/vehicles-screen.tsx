import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, vehicleAccessRequestsApi, vehiclesApi } from '@/lib/api';
import type {
  Vehicle,
  VehicleAccessRequest,
  VehicleAccessRequestInput,
  VehicleInput,
} from '@/types';

import { VehicleDetailModal } from '../components/vehicle-detail-modal';
import { SummaryCard, StatusBadge } from '../components/vehicle-primitives';
import { vehicleStyles } from '../components/vehicle-styles';
import { VehicleModal } from '../components/vehicle-modal';
import { VehicleVerificationModal } from '../components/vehicle-verification-modal';

const currentYear = new Date().getFullYear();
const vietnamLicensePlatePattern = /^[0-9]{2}[A-Z]{1,2}-?[0-9]{3}\.?[0-9]{2}$/i;
const emptyForm: VehicleInput = {
  brand: '',
  model: '',
  licensePlate: '',
  year: currentYear,
  images: [],
};

export function VehiclesScreen() {
  const { user, validateSession } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accessRequests, setAccessRequests] = useState<VehicleAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleInput>(emptyForm);
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationPlate, setVerificationPlate] = useState<string | null>(null);

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
        const [nextVehicles, nextAccessRequests] = await Promise.all([
          vehiclesApi.list(user.role),
          user.role === 'customer' ? vehicleAccessRequestsApi.listMine() : Promise.resolve([]),
        ]);
        setVehicles(nextVehicles);
        setAccessRequests(nextAccessRequests);
      } catch (error) {
        await handleError(error, 'Không tải được dữ liệu xe');
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

  const pendingRequests = accessRequests.filter((request) => request.status === 'pending').length;
  const approvedRequests = accessRequests.filter((request) => request.status === 'approved').length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

const openEdit = (vehicle: Vehicle) => {
  setEditing(vehicle);

  setForm({
    brand: vehicle.brand,
    model: vehicle.model,
    licensePlate: vehicle.licensePlate,
    year: vehicle.year,
    images: [],
  });

  setModalVisible(true);
};

  const closeForm = () => {
    setModalVisible(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    const normalizedPayload: VehicleInput = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      licensePlate: form.licensePlate.replace(/\s+/g, '').toUpperCase(),
      year: form.year,
      images: form.images ?? [],
    };

    if (!normalizedPayload.brand || !normalizedPayload.model || !normalizedPayload.licensePlate) {
      Alert.alert(
        'Thiếu thông tin',
        'Hãng xe, dòng xe và biển số là bắt buộc.',
      );
      return;
    }
    if (!vietnamLicensePlatePattern.test(normalizedPayload.licensePlate)) {
      Alert.alert(
        'Biển số chưa đúng',
        'Ví dụ hợp lệ: 70A-99999 hoặc 30A-123.45.',
      );
      return;
    }
    if (normalizedPayload.year < 1900 || normalizedPayload.year > currentYear) {
      Alert.alert('Năm sản xuất không hợp lệ');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await vehiclesApi.update(editing._id, normalizedPayload);
        setVehicles((current) =>
          current.map((vehicle) => (vehicle._id === updated._id ? updated : vehicle)),
        );
      } else {
        const created = await vehiclesApi.create(normalizedPayload);
        setVehicles((current) => [created, ...current]);
      }
      closeForm();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VEHICLE_VERIFICATION_REQUIRED') {
        setVerificationPlate(normalizedPayload.licensePlate);
        closeForm();
        return;
      }
      await handleError(
        error,
        editing ? 'Không thể cập nhật xe' : 'Không thể thêm xe',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (vehicle: Vehicle) => {
    Alert.alert('Xóa xe', 'Bạn chắc chắn muốn xóa ' + vehicle.brand + ' ' + vehicle.model + '?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiclesApi.remove(vehicle._id);
            setVehicles((current) => current.filter((item) => item._id !== vehicle._id));
            if (detailVehicle?._id === vehicle._id) {
              setDetailVehicle(null);
            }
          } catch (error) {
            if (
              error instanceof ApiError &&
              (error.code === 'VEHICLE_ACTIVE_APPOINTMENT' || error.status === 409)
            ) {
              Alert.alert(
                'Không thể xóa xe',
                'Không thể xóa xe vì xe đang có lịch hẹn chờ xác nhận hoặc đang được thực hiện.',
              );
              return;
            }
            await handleError(error, 'Không thể xóa xe');
          }
        },
      },
    ]);
  };

  const submitVerification = async (payload: {
    relationship: string;
    documents: NonNullable<VehicleAccessRequestInput['documents']>;
  }) => {
    if (!verificationPlate) return;
    setRequestSaving(true);
    try {
      const created = await vehicleAccessRequestsApi.create({
        licensePlate: verificationPlate,
        relationship: payload.relationship,
        documents: payload.documents,
      });
      setAccessRequests((current) => [created, ...current]);
      setVerificationPlate(null);
      Alert.alert(
        'Đã gửi yêu cầu',
        'Yêu cầu xác minh đã được gửi đến hệ thống.',
      );
    } catch (error) {
      await handleError(error, 'Không thể gửi yêu cầu xác minh');
    } finally {
      setRequestSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={vehicleStyles.safe}>
      <ScrollView
        contentContainerStyle={vehicleStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
          />
        }>
        <View style={vehicleStyles.header}>
          <View style={vehicleStyles.headerText}>
            <Text style={vehicleStyles.eyebrow}>QUẢN LÝ XE</Text>
            <Text style={vehicleStyles.title}>{'Xe của tôi'}</Text>
            <Text style={vehicleStyles.subtitle}>
              {'Quản lý thông tin xe để đặt lịch và theo dõi lịch sử chăm sóc thuận tiện hơn.'}
            </Text>
          </View>
          {user?.role === 'customer' ? (
            <Pressable onPress={openCreate} style={vehicleStyles.addButton}>
              <Text style={vehicleStyles.addButtonText}>{'Thêm xe'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={vehicleStyles.statsRow}>
          <SummaryCard label={'Tổng số xe'} value={String(vehicles.length)} />
          <SummaryCard label={'Chờ xác minh'} value={String(pendingRequests)} />
          <SummaryCard label={'Đã xác minh'} value={String(approvedRequests)} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={vehicleStyles.loader} />
        ) : vehicles.length === 0 ? (
          <View style={vehicleStyles.empty}>
            <Text style={vehicleStyles.emptyTitle}>{'Chưa có xe nào'}</Text>
            <Text style={vehicleStyles.emptyText}>
              {'Thêm xe đầu tiên để bắt đầu đặt lịch và theo dõi lịch sử.'}
            </Text>
            <Pressable onPress={openCreate} style={vehicleStyles.emptyButton}>
              <Text style={vehicleStyles.emptyButtonText}>{'Thêm xe đầu tiên'}</Text>
            </Pressable>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <View key={vehicle._id} style={vehicleStyles.card}>
              <Pressable onPress={() => setDetailVehicle(vehicle)} style={vehicleStyles.cardHeader}>
                <View style={vehicleStyles.vehicleMark}>
                  <Text style={vehicleStyles.vehicleMarkText}>{String(vehicle.year).slice(-2)}</Text>
                </View>
                <View style={vehicleStyles.vehicleInfo}>
                  <Text style={vehicleStyles.vehicleName}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={vehicleStyles.vehicleMeta}>{vehicle.licensePlate}</Text>
                  <Text style={vehicleStyles.vehicleSubMeta}>
                    {'Năm sản xuất ' + vehicle.year + ' · ' + (vehicle.images?.length ?? 0) + ' ảnh'}
                  </Text>
                </View>
              </Pressable>
              <View style={vehicleStyles.actions}>
                <Pressable onPress={() => setDetailVehicle(vehicle)} style={vehicleStyles.secondaryButton}>
                  <Text style={vehicleStyles.secondaryButtonText}>{'Chi tiết'}</Text>
                </Pressable>
                <Pressable onPress={() => openEdit(vehicle)} style={vehicleStyles.secondaryButton}>
                  <Text style={vehicleStyles.secondaryButtonText}>{'Chỉnh sửa'}</Text>
                </Pressable>
                <Pressable onPress={() => remove(vehicle)} style={vehicleStyles.deleteButton}>
                  <Text style={vehicleStyles.deleteText}>{'Xóa'}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {user?.role === 'customer' && accessRequests.length ? (
          <View style={vehicleStyles.requestSection}>
            <Text style={vehicleStyles.sectionTitle}>{'Yêu cầu xác minh xe'}</Text>
            <Text style={vehicleStyles.sectionSubtitle}>
              {'Trạng thái các biển số đã gửi xác minh.'}
            </Text>
            <View style={vehicleStyles.requestList}>
              {accessRequests.map((request) => (
                <View key={request._id} style={vehicleStyles.requestCard}>
                  <View style={vehicleStyles.requestTopRow}>
                    <Text style={vehicleStyles.requestPlate}>{request.licensePlate}</Text>
                    <StatusBadge status={request.status} />
                  </View>
                  <Text style={vehicleStyles.requestRelationship}>{request.relationship}</Text>
                  {request.reviewNote ? (
                    <Text style={vehicleStyles.requestNote}>{'Phản hồi: ' + request.reviewNote}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <VehicleModal
        visible={modalVisible}
        editing={editing}
        form={form}
        saving={saving}
        setForm={setForm}
        onClose={closeForm}
        onSave={save}
      />

      <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />

      <VehicleVerificationModal
        visible={Boolean(verificationPlate)}
        plate={verificationPlate ?? ''}
        saving={requestSaving}
        onClose={() => setVerificationPlate(null)}
        onSubmit={submitVerification}
      />
    </SafeAreaView>
  );
}
