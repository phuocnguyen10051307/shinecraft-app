import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, appointmentsApi, servicesApi, vehiclesApi } from '@/lib/api';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Service,
  Vehicle,
} from '@/types';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const statusConfig: Record<AppointmentStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Chờ xác nhận', color: colors.warning, background: '#fffaeb' },
  confirmed: { label: 'Đã xác nhận', color: colors.success, background: '#ecfdf3' },
  in_progress: { label: 'Đang thực hiện', color: '#6938ef', background: '#f4f3ff' },
  completed: { label: 'Hoàn thành', color: colors.primary, background: colors.tint },
  cancelled: { label: 'Đã hủy', color: colors.danger, background: '#fef3f2' },
};

function createBookingDates(count = 14) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index + 1);

    return {
      value: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-'),
      weekday: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      day: String(date.getDate()).padStart(2, '0'),
      month: `Th${date.getMonth() + 1}`,
    };
  });
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} giờ ${remaining} phút` : `${hours} giờ`;
}

export default function AppointmentsScreen() {
  const { user, validateSession } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming');

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

  const loadAppointments = useCallback(
    async (quiet = false) => {
      if (!user) return;
      if (!quiet) setLoading(true);
      try {
        setAppointments(await appointmentsApi.list(user.role));
      } catch (error) {
        await handleError(error, 'Không tải được lịch hẹn');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleError, user],
  );

  const loadBookingOptions = useCallback(async () => {
    if (!user || user.role !== 'customer') return;
    setOptionsLoading(true);
    try {
      const [nextVehicles, nextServices] = await Promise.all([
        vehiclesApi.list(user.role),
        servicesApi.listActive(),
      ]);
      setVehicles(nextVehicles);
      setServices(nextServices);
    } catch (error) {
      await handleError(error, 'Không tải được dữ liệu đặt lịch');
    } finally {
      setOptionsLoading(false);
    }
  }, [handleError, user]);

  useEffect(() => {
    const task = Promise.resolve().then(() =>
      Promise.all([loadAppointments(), loadBookingOptions()]),
    );
    return () => {
      void task;
    };
  }, [loadAppointments, loadBookingOptions]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        filter === 'history'
          ? ['completed', 'cancelled'].includes(appointment.status)
          : !['completed', 'cancelled'].includes(appointment.status),
      ),
    [appointments, filter],
  );

  const openBooking = async () => {
    if (user?.role !== 'customer') return;
    if (!vehicles.length || !services.length) {
      await loadBookingOptions();
    }
    setBookingVisible(true);
  };

  const createAppointment = async (input: CreateAppointmentInput) => {
    setSaving(true);
    try {
      const created = await appointmentsApi.create(input);
      setAppointments((current) => [created, ...current]);
      setBookingVisible(false);
      Alert.alert('Đặt lịch thành công', 'Lịch hẹn đang chờ gara xác nhận.');
    } catch (error) {
      await handleError(error, 'Không thể đặt lịch');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async (reason?: string) => {
    if (!cancelAppointment) return;
    setCancelling(true);
    try {
      const updated = await appointmentsApi.cancelMine(cancelAppointment._id, reason);
      setAppointments((current) =>
        current.map((appointment) => (appointment._id === updated._id ? updated : appointment)),
      );
      setCancelAppointment(null);
      Alert.alert('Đã hủy lịch hẹn');
    } catch (error) {
      await handleError(error, 'Không thể hủy lịch hẹn');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.all([loadAppointments(true), loadBookingOptions()]);
            }}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SHINECRAFT BOOKING</Text>
            <Text style={styles.title}>Lịch hẹn của bạn</Text>
            <Text style={styles.subtitle}>Đặt dịch vụ và theo dõi tiến độ chăm sóc xe.</Text>
          </View>
          {user?.role === 'customer' ? (
            <Pressable onPress={() => void openBooking()} style={styles.addButton}>
              <Text style={styles.addButtonIcon}>+</Text>
            </Pressable>
          ) : null}
        </View>

        {user?.role === 'customer' ? (
          <Pressable onPress={() => void openBooking()} style={styles.bookingBanner}>
            <View style={styles.bannerIcon}>
              <Text style={styles.bannerIconText}>SC</Text>
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Đặt lịch chăm sóc xe</Text>
              <Text style={styles.bannerText}>Chọn xe, nhiều dịch vụ và thời gian phù hợp.</Text>
            </View>
            <Text style={styles.bannerArrow}>›</Text>
          </Pressable>
        ) : null}

        <View style={styles.stats}>
          <Stat value={String(appointments.length)} label="Tổng lịch hẹn" />
          <Stat
            value={String(appointments.filter((item) => item.status === 'pending').length)}
            label="Chờ xác nhận"
            accent={colors.warning}
          />
          <Stat
            value={String(appointments.filter((item) => item.status === 'confirmed').length)}
            label="Đã xác nhận"
            accent={colors.success}
          />
        </View>

        <View style={styles.segment}>
          {[
            ['upcoming', 'Sắp tới'],
            ['history', 'Lịch sử'],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value as 'upcoming' | 'history')}
              style={[styles.segmentButton, filter === value && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, filter === value && styles.segmentTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
        ) : filteredAppointments.length ? (
          filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment._id}
              appointment={appointment}
              allowCancel={user?.role === 'customer'}
              onCancel={setCancelAppointment}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có lịch hẹn</Text>
            <Text style={styles.emptyText}>
              Các lịch hẹn {filter === 'history' ? 'đã hoàn tất' : 'sắp tới'} sẽ xuất hiện tại đây.
            </Text>
          </View>
        )}
      </Screen>

      {bookingVisible ? (
        <BookingModal
          vehicles={vehicles}
          services={services}
          loading={optionsLoading}
          saving={saving}
          onClose={() => setBookingVisible(false)}
          onSubmit={createAppointment}
          onRetry={loadBookingOptions}
        />
      ) : null}

      {cancelAppointment ? (
        <CancelAppointmentModal
          appointment={cancelAppointment}
          saving={cancelling}
          onClose={() => setCancelAppointment(null)}
          onConfirm={confirmCancel}
        />
      ) : null}
    </>
  );
}

function AppointmentCard({
  appointment,
  allowCancel,
  onCancel,
}: {
  appointment: Appointment;
  allowCancel: boolean;
  onCancel: (appointment: Appointment) => void;
}) {
  const status = statusConfig[appointment.status];
  const canCancel =
    allowCancel && (appointment.status === 'pending' || appointment.status === 'confirmed');
  const scheduledAt = new Date(appointment.scheduledAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>#{appointment._id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: status.background }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.serviceName}>
        {appointment.services.map((item) => item.nameSnapshot).join(', ')}
      </Text>
      <Text style={styles.vehicleText}>
        {appointment.vehicleId.brand} {appointment.vehicleId.model} ·{' '}
        {appointment.vehicleId.licensePlate}
      </Text>
      <View style={styles.scheduleRow}>
        <View style={styles.scheduleCopy}>
          <Text style={styles.metaLabel}>THỜI GIAN</Text>
          <Text style={styles.metaValue}>
            {scheduledAt.toLocaleDateString('vi-VN')} ·{' '}
            {scheduledAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.durationText}>
            Dự kiến {formatDuration(appointment.totalEstimatedDuration)}
          </Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.metaLabel}>TẠM TÍNH</Text>
          <Text style={styles.price}>{formatCurrency(appointment.totalPrice)}</Text>
        </View>
      </View>
      {appointment.note ? <Text style={styles.appointmentNote}>{appointment.note}</Text> : null}
      {canCancel ? (
        <Pressable onPress={() => onCancel(appointment)} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Hủy lịch</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BookingModal({
  vehicles,
  services,
  loading,
  saving,
  onClose,
  onSubmit,
  onRetry,
}: {
  vehicles: Vehicle[];
  services: Service[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const dates = useMemo(() => createBookingDates(), []);
  const [vehicleId, setVehicleId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(dates[0].value);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [note, setNote] = useState('');

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === vehicleId);
  const filteredServices = selectedVehicle
    ? services.filter((service) => service.vehicleType === selectedVehicle.type)
    : [];
  const selectedServices = services.filter((service) => serviceIds.includes(service._id));
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.estimatedDuration,
    0,
  );

  const selectVehicle = (nextVehicleId: string) => {
    const nextVehicle = vehicles.find((vehicle) => vehicle._id === nextVehicleId);
    setVehicleId(nextVehicleId);
    setServiceIds((current) =>
      current.filter((serviceId) => {
        const service = services.find((item) => item._id === serviceId);
        return service?.vehicleType === nextVehicle?.type;
      }),
    );
  };

  const toggleService = (serviceId: string) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
  };

  const submit = () => {
    if (!vehicleId) {
      Alert.alert('Chọn xe', 'Vui lòng chọn xe của bạn.');
      return;
    }
    if (!serviceIds.length) {
      Alert.alert('Chọn dịch vụ', 'Vui lòng chọn ít nhất một dịch vụ.');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      Alert.alert('Thời gian không hợp lệ', 'Thời gian hẹn phải ở trong tương lai.');
      return;
    }

    void onSubmit({
      vehicleId,
      services: serviceIds.map((serviceId) => ({ serviceId })),
      scheduledAt: scheduledAt.toISOString(),
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Đặt lịch mới</Text>
            <Text style={styles.modalSubtitle}>Chọn xe, dịch vụ và thời gian phù hợp.</Text>
          </View>
          <Pressable disabled={saving} onPress={onClose}>
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalContent}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" style={styles.modalLoader} />
          ) : !vehicles.length || !services.length ? (
            <View style={styles.optionError}>
              <Text style={styles.optionErrorTitle}>Không có dữ liệu đặt lịch</Text>
              <Text style={styles.optionErrorText}>
                Bạn cần có ít nhất một xe và hệ thống cần có dịch vụ đang hoạt động.
              </Text>
              <Pressable onPress={() => void onRetry()} style={styles.retryButton}>
                <Text style={styles.retryText}>Tải lại</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <FormSection
                title="1. Chọn xe"
                caption="Dịch vụ sẽ được lọc theo loại xe bạn chọn.">
                {vehicles.map((vehicle) => {
                  const selected = vehicleId === vehicle._id;
                  return (
                    <Pressable
                      key={vehicle._id}
                      onPress={() => selectVehicle(vehicle._id)}
                      style={[styles.selectCard, selected && styles.selectCardActive]}>
                      <View style={styles.vehicleMark}>
                        <Text style={styles.vehicleMarkText}>
                          {vehicle.type === 'car' ? 'CAR' : vehicle.type === 'motorbike' ? 'BIKE' : 'OTHER'}
                        </Text>
                      </View>
                      <View style={styles.selectCopy}>
                        <Text style={styles.selectTitle}>
                          {vehicle.brand} {vehicle.model}
                        </Text>
                        <Text style={styles.selectDescription}>
                          {vehicle.year} · {vehicle.licensePlate}
                        </Text>
                      </View>
                      <SelectionMark selected={selected} />
                    </Pressable>
                  );
                })}
              </FormSection>

              <FormSection
                title="2. Chọn dịch vụ"
                caption="Bạn có thể chọn nhiều dịch vụ trong cùng một lịch hẹn.">
                {!selectedVehicle ? (
                  <Text style={styles.helperBox}>Hãy chọn xe trước để xem dịch vụ phù hợp.</Text>
                ) : !filteredServices.length ? (
                  <Text style={styles.helperBox}>Chưa có dịch vụ phù hợp với loại xe này.</Text>
                ) : (
                  filteredServices.map((service) => {
                    const selected = serviceIds.includes(service._id);
                    return (
                      <Pressable
                        key={service._id}
                        onPress={() => toggleService(service._id)}
                        style={[styles.serviceCard, selected && styles.selectCardActive]}>
                        <View style={styles.selectCopy}>
                          <Text style={styles.selectTitle}>{service.name}</Text>
                          <Text style={styles.selectDescription}>
                            {service.description?.trim() || 'Dịch vụ chăm sóc xe tiêu chuẩn'}
                          </Text>
                          <Text style={styles.serviceMeta}>
                            {formatDuration(service.estimatedDuration)} ·{' '}
                            {formatCurrency(service.price)}
                          </Text>
                        </View>
                        <SelectionMark selected={selected} multiple />
                      </Pressable>
                    );
                  })
                )}
              </FormSection>

              <FormSection title="3. Chọn thời gian" caption="Thời gian hẹn phải ở trong tương lai.">
                <Text style={styles.fieldTitle}>Ngày hẹn</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateRow}>
                  {dates.map((date) => {
                    const selected = scheduledDate === date.value;
                    return (
                      <Pressable
                        key={date.value}
                        onPress={() => setScheduledDate(date.value)}
                        style={[styles.dateCard, selected && styles.dateCardActive]}>
                        <Text style={[styles.dateWeekday, selected && styles.dateTextActive]}>
                          {date.weekday}
                        </Text>
                        <Text style={[styles.dateDay, selected && styles.dateTextActive]}>
                          {date.day}
                        </Text>
                        <Text style={[styles.dateMonth, selected && styles.dateTextActive]}>
                          {date.month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.fieldTitle}>Giờ hẹn</Text>
                <View style={styles.slotGrid}>
                  {timeSlots.map((slot) => {
                    const selected = scheduledTime === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setScheduledTime(slot)}
                        style={[styles.slot, selected && styles.slotActive]}>
                        <Text style={[styles.slotText, selected && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FormSection>

              <FormSection title="4. Ghi chú" caption="Thông tin này không bắt buộc.">
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ví dụ: cần kiểm tra thêm nội thất..."
                  placeholderTextColor="#98a2b3"
                  multiline
                  maxLength={1000}
                  style={styles.noteInput}
                />
              </FormSection>

              {selectedServices.length ? (
                <View style={styles.summaryCard}>
                  <SummaryRow label="Xe" value={`${selectedVehicle?.brand} ${selectedVehicle?.model}`} />
                  <SummaryRow label="Số dịch vụ" value={String(selectedServices.length)} />
                  <SummaryRow label="Thời lượng" value={formatDuration(totalDuration)} />
                  <View style={styles.summaryDivider} />
                  <SummaryRow label="Tạm tính" value={formatCurrency(totalPrice)} strong />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={saving || loading || !vehicles.length || !services.length}
            onPress={submit}
            style={[
              styles.continueButton,
              (saving || loading || !vehicles.length || !services.length) && styles.buttonDisabled,
            ]}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>Xác nhận đặt lịch</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function CancelAppointmentModal({
  appointment,
  saving,
  onClose,
  onConfirm,
}: {
  appointment: Appointment;
  saving: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Hủy lịch hẹn</Text>
          <Text style={styles.dialogText}>
            Bạn có chắc muốn hủy lịch{' '}
            {appointment.services.map((service) => service.nameSnapshot).join(', ')}?
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Lý do hủy (không bắt buộc)"
            placeholderTextColor="#98a2b3"
            multiline
            maxLength={1000}
            style={styles.cancelReasonInput}
          />
          <View style={styles.dialogActions}>
            <Pressable disabled={saving} onPress={onClose} style={styles.keepButton}>
              <Text style={styles.keepButtonText}>Giữ lịch</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => void onConfirm(reason)}
              style={styles.confirmCancelButton}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmCancelText}>Hủy lịch</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FormSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCaption}>{caption}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SelectionMark({ selected, multiple = false }: { selected: boolean; multiple?: boolean }) {
  return (
    <View style={[styles.selectionMark, multiple && styles.selectionSquare, selected && styles.selectionMarkActive]}>
      {selected ? <Text style={styles.selectionCheck}>✓</Text> : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

function Stat({ value, label, accent = colors.primary }: { value: string; label: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  addButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  addButtonIcon: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -3 },
  bookingBanner: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 21, backgroundColor: colors.ink, gap: 13 },
  bannerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  bannerIconText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  bannerText: { color: '#b9c0cc', fontSize: 12, lineHeight: 17, marginTop: 4 },
  bannerArrow: { color: '#fff', fontSize: 28 },
  stats: { flexDirection: 'row', gap: 9 },
  stat: { flex: 1, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#e9edf3' },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segmentButtonActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.ink, fontWeight: '900' },
  loader: { paddingVertical: 50 },
  card: { padding: 18, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  serviceName: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '900', marginTop: 3 },
  vehicleText: { color: colors.muted, lineHeight: 20 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 13, marginTop: 7, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleCopy: { flex: 1 },
  metaLabel: { color: '#98a2b3', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  metaValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 4 },
  durationText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  priceWrap: { alignItems: 'flex-end' },
  price: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  appointmentNote: { color: colors.muted, lineHeight: 19, padding: 11, borderRadius: 12, backgroundColor: colors.background },
  cancelButton: { alignSelf: 'flex-end', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 11, backgroundColor: '#fef3f2' },
  cancelButtonText: { color: colors.danger, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 30, borderRadius: 18, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  modalSubtitle: { color: colors.muted, marginTop: 4 },
  closeText: { color: colors.primary, fontWeight: '800', paddingTop: 5 },
  modalContent: { padding: 20, paddingBottom: 34, gap: 18 },
  modalLoader: { paddingVertical: 70 },
  optionError: { alignItems: 'center', padding: 24, borderRadius: 18, backgroundColor: colors.surface },
  optionErrorTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  optionErrorText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 7 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontWeight: '800' },
  formSection: { padding: 17, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  sectionCaption: { color: colors.muted, lineHeight: 19, marginTop: 4 },
  sectionContent: { gap: 11, marginTop: 15 },
  selectCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  serviceCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  selectCardActive: { borderColor: colors.primary, backgroundColor: '#f5f9ff' },
  vehicleMark: { width: 52, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  vehicleMarkText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  selectCopy: { flex: 1 },
  selectTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  selectDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  serviceMeta: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 8 },
  selectionMark: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#cbd1da' },
  selectionSquare: { borderRadius: 6 },
  selectionMarkActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  selectionCheck: { color: '#fff', fontSize: 13, fontWeight: '900' },
  helperBox: { color: colors.muted, lineHeight: 20, padding: 14, borderRadius: 13, backgroundColor: colors.background },
  fieldTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  dateRow: { gap: 9, paddingBottom: 4 },
  dateCard: { width: 64, alignItems: 'center', paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dateCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateWeekday: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  dateDay: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 3 },
  dateMonth: { color: colors.muted, fontSize: 10, marginTop: 2 },
  dateTextActive: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  slot: { width: '23%', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  slotText: { color: colors.ink, fontWeight: '800' },
  slotTextActive: { color: '#fff' },
  noteInput: { minHeight: 110, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, textAlignVertical: 'top' },
  summaryCard: { padding: 18, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  summaryValue: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  summaryStrong: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  continueButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.primary },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  buttonDisabled: { opacity: 0.5 },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16, 24, 40, 0.55)' },
  dialogCard: { width: '100%', maxWidth: 520, padding: 20, borderRadius: 20, backgroundColor: colors.surface },
  dialogTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  dialogText: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  cancelReasonInput: { minHeight: 100, marginTop: 17, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, color: colors.ink, textAlignVertical: 'top' },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 17 },
  keepButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: colors.border },
  keepButtonText: { color: colors.ink, fontWeight: '800' },
  confirmCancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.danger },
  confirmCancelText: { color: '#fff', fontWeight: '800' },
});
