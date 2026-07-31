import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, serviceHistoriesApi, vehiclesApi } from '@/lib/api';
import type { ServiceHistory, Vehicle } from '@/types';

const allVehiclesValue = 'all';

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ServiceHistoriesScreen() {
  const { user, validateSession } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceHistories, setServiceHistories] = useState<ServiceHistory[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(allVehiclesValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<ServiceHistory | null>(null);

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
    async (vehicleId = selectedVehicleId, quiet = false) => {
      if (!user || user.role !== 'customer') return;
      if (!quiet) setLoading(true);

      try {
        const currentVehicleId = vehicleId === allVehiclesValue ? undefined : vehicleId;
        const [nextVehicles, nextHistories] = await Promise.all([
          vehiclesApi.list(user.role),
          serviceHistoriesApi.listMine(currentVehicleId),
        ]);
        setVehicles(nextVehicles);
        setServiceHistories(nextHistories);
      } catch (error) {
        await handleError(error, 'Không thể tải lịch sử dịch vụ');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleError, selectedVehicleId, user],
  );

  useEffect(() => {
    const task = Promise.resolve().then(() => load());
    return () => {
      void task;
    };
  }, [load]);

  const summary = useMemo(() => {
    const totalSpent = serviceHistories.reduce((sum, item) => sum + item.totalPrice, 0);
    const nextMaintenance = serviceHistories
      .map((item) => item.nextMaintenanceDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    return { total: serviceHistories.length, totalSpent, nextMaintenance };
  }, [serviceHistories]);

  if (user?.role !== 'customer') {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chức năng này hiện dành cho khách hàng</Text>
          <Text style={styles.emptyText}>Lịch sử dịch vụ trên app hiện chỉ mở cho tài khoản khách hàng.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(selectedVehicleId, true);
          }}
        />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử dịch vụ</Text>
        <Text style={styles.subtitle}>
          Theo dõi các lần chăm sóc xe đã hoàn thành, chi phí và mốc bảo dưỡng tiếp theo.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard label="Tổng lần" value={String(summary.total)} />
        <SummaryCard label="Tổng chi phí" value={formatCurrency(summary.totalSpent)} />
        <SummaryCard label="Bảo dưỡng tiếp" value={summary.nextMaintenance ? formatDate(summary.nextMaintenance) : '-'} />
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Lọc theo xe</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip
            active={selectedVehicleId === allVehiclesValue}
            label="Tất cả"
            onPress={() => {
              setSelectedVehicleId(allVehiclesValue);
              setRefreshing(true);
              void load(allVehiclesValue, true);
            }}
          />
          {vehicles.map((vehicle) => (
            <FilterChip
              key={vehicle._id}
              active={selectedVehicleId === vehicle._id}
              label={`${vehicle.brand} ${vehicle.model}`}
              onPress={() => {
                setSelectedVehicleId(vehicle._id);
                setRefreshing(true);
                void load(vehicle._id, true);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
      {!loading && serviceHistories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chưa có lịch sử dịch vụ</Text>
          <Text style={styles.emptyText}>Khi một lịch hẹn được hoàn thành, thông tin sẽ hiện tại đây.</Text>
        </View>
      ) : null}

      {!loading &&
        serviceHistories.map((item) => (
          <Pressable key={item._id} style={styles.card} onPress={() => setDetail(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardCode}>#{item._id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.cardDate}>{formatDate(item.servicedAt)}</Text>
            </View>
            <Text style={styles.cardTitle}>
              {item.vehicleId.brand} {item.vehicleId.model} - {item.vehicleId.licensePlate}
            </Text>
            <Text style={styles.cardServices}>{item.services.map((service) => service.nameSnapshot).join(', ')}</Text>
            <View style={styles.cardMetaRow}>
              <InfoPill label={`Thời lượng ${item.totalEstimatedDuration} phút`} />
              <InfoPill label={formatCurrency(item.totalPrice)} strong />
            </View>
            {item.nextMaintenanceDate ? (
              <Text style={styles.maintenanceText}>Bảo dưỡng tiếp theo: {formatDate(item.nextMaintenanceDate)}</Text>
            ) : null}
          </Pressable>
        ))}

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chi tiết lịch sử dịch vụ</Text>
            {detail ? (
              <>
                <DetailRow label="Xe" value={`${detail.vehicleId.brand} ${detail.vehicleId.model} - ${detail.vehicleId.licensePlate}`} />
                <DetailRow label="Hoàn thành lúc" value={formatDate(detail.servicedAt)} />
                <DetailRow label="Nhân viên" value={detail.handledBy?.displayName ?? '-'} />
                <DetailRow label="Thanh toán" value={detail.appointmentId.paymentStatus ?? '-'} />
                <DetailRow label="Tổng chi phí" value={formatCurrency(detail.totalPrice)} />
                <DetailRow label="Dịch vụ" value={detail.services.map((service) => service.nameSnapshot).join(', ')} />
                {detail.note ? <DetailRow label="Ghi chú" value={detail.note} /> : null}
                {detail.nextMaintenanceDate ? <DetailRow label="Bảo dưỡng tiếp" value={formatDate(detail.nextMaintenanceDate)} /> : null}
              </>
            ) : null}
            <Pressable onPress={() => setDetail(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InfoPill({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.infoPill, strong && styles.infoPillStrong]}>
      <Text style={[styles.infoPillText, strong && styles.infoPillTextStrong]}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 20 },
  summaryRow: { gap: 10 },
  summaryCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 6 },
  filterSection: { gap: 10 },
  filterLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  filterRow: { gap: 10, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.tint, borderColor: colors.primary },
  filterChipText: { color: colors.muted, fontWeight: '700' },
  filterChipTextActive: { color: colors.primary },
  loader: { paddingVertical: 40 },
  emptyState: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardCode: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  cardDate: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  cardServices: { color: colors.muted, lineHeight: 20 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.background },
  infoPillStrong: { backgroundColor: colors.tint },
  infoPillText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  infoPillTextStrong: { color: colors.primary },
  maintenanceText: { color: colors.warning, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 22, backgroundColor: colors.surface, padding: 20, gap: 14 },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  detailRow: { gap: 4 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  detailValue: { color: colors.ink, lineHeight: 20, fontWeight: '700' },
  closeButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  closeButtonText: { color: '#fff', fontWeight: '800' },
});
