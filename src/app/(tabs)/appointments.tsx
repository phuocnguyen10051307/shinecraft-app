import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import {
  type Appointment,
  type AppointmentStatus,
  bookingServices,
  bookingVehicles,
  createBookingDates,
  formatCurrency,
  formatDuration,
  initialAppointments,
  serviceCategories,
  timeSlots,
} from '@/features/booking/data/mock-booking';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Chờ xác nhận', color: colors.warning, background: '#fffaeb' },
  confirmed: { label: 'Đã xác nhận', color: colors.success, background: '#ecfdf3' },
  in_progress: { label: 'Đang thực hiện', color: '#6938ef', background: '#f4f3ff' },
  completed: { label: 'Hoàn thành', color: colors.primary, background: colors.tint },
  cancelled: { label: 'Đã hủy', color: colors.danger, background: '#fef3f2' },
};

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming');

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        filter === 'history'
          ? ['completed', 'cancelled'].includes(appointment.status)
          : !['completed', 'cancelled'].includes(appointment.status),
      ),
    [appointments, filter],
  );

  const addAppointment = (appointment: Appointment) => {
    setAppointments((current) => [appointment, ...current]);
    setBookingVisible(false);
    Alert.alert('Đặt lịch thành công', 'Lịch hẹn đang chờ gara xác nhận.');
  };

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SHINECRAFT BOOKING</Text>
            <Text style={styles.title}>Lịch hẹn của bạn</Text>
            <Text style={styles.subtitle}>Đặt dịch vụ và theo dõi tiến độ chăm sóc xe.</Text>
          </View>
          <Pressable onPress={() => setBookingVisible(true)} style={styles.addButton}>
            <Text style={styles.addButtonIcon}>+</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setBookingVisible(true)} style={styles.bookingBanner}>
          <View style={styles.bannerIcon}>
            <Text style={styles.bannerIconText}>SC</Text>
          </View>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>Đặt lịch chăm sóc xe</Text>
            <Text style={styles.bannerText}>Chọn dịch vụ và khung giờ phù hợp trong vài bước.</Text>
          </View>
          <Text style={styles.bannerArrow}>›</Text>
        </Pressable>

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

        {filteredAppointments.length ? (
          filteredAppointments.map((appointment) => (
            <AppointmentCard key={appointment._id} appointment={appointment} />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có lịch hẹn</Text>
            <Text style={styles.emptyText}>Các lịch hẹn {filter === 'history' ? 'đã hoàn tất' : 'sắp tới'} sẽ xuất hiện tại đây.</Text>
          </View>
        )}
      </Screen>

      <BookingModal
        visible={bookingVisible}
        onClose={() => setBookingVisible(false)}
        onComplete={addAppointment}
      />
    </>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const vehicle = bookingVehicles.find((item) => item._id === appointment.vehicleId);
  const services = bookingServices.filter((item) => appointment.serviceIds.includes(item._id));
  const status = statusConfig[appointment.status];
  const date = new Date(`${appointment.appointmentDate}T00:00:00`);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{appointment.code}</Text>
        <View style={[styles.badge, { backgroundColor: status.background }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.serviceName}>{services.map((item) => item.name).join(', ')}</Text>
      <Text style={styles.vehicleText}>
        {vehicle?.name} · {vehicle?.licensePlate}
      </Text>
      <View style={styles.scheduleRow}>
        <View>
          <Text style={styles.metaLabel}>THỜI GIAN</Text>
          <Text style={styles.metaValue}>
            {date.toLocaleDateString('vi-VN')} · {appointment.timeSlot}
          </Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.metaLabel}>TẠM TÍNH</Text>
          <Text style={styles.price}>{formatCurrency(appointment.totalEstimatedPrice)}</Text>
        </View>
      </View>
    </View>
  );
}

function BookingModal({
  visible,
  onClose,
  onComplete,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: (appointment: Appointment) => void;
}) {
  const dates = useMemo(() => createBookingDates(), []);
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState(serviceCategories[0]._id);
  const [serviceId, setServiceId] = useState('');
  const [vehicleId, setVehicleId] = useState(bookingVehicles[0]._id);
  const [appointmentDate, setAppointmentDate] = useState(dates[0].value);
  const [timeSlot, setTimeSlot] = useState('');
  const [note, setNote] = useState('');

  const service = bookingServices.find((item) => item._id === serviceId);
  const vehicle = bookingVehicles.find((item) => item._id === vehicleId);
  const servicesByCategory = bookingServices.filter(
    (item) => item.categoryId === categoryId && item.isActive,
  );

  const resetAndClose = () => {
    setStep(1);
    setServiceId('');
    setTimeSlot('');
    setNote('');
    onClose();
  };

  const next = () => {
    if (step === 1 && !serviceId) {
      Alert.alert('Chọn dịch vụ', 'Bạn cần chọn một dịch vụ để tiếp tục.');
      return;
    }
    if (step === 3 && !timeSlot) {
      Alert.alert('Chọn khung giờ', 'Bạn cần chọn một khung giờ còn trống.');
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };

  const complete = () => {
    if (!service) return;
    const bookingKey = `${appointmentDate.replaceAll('-', '')}-${timeSlot.replace(':', '')}-${vehicleId}`;
    onComplete({
      _id: `appointment-${bookingKey}`,
      code: `SC-${appointmentDate.slice(2).replaceAll('-', '')}-${timeSlot.replace(':', '')}`,
      customerId: 'customer-demo',
      vehicleId,
      serviceIds: [service._id],
      appointmentDate,
      timeSlot,
      scheduledAt: `${appointmentDate}T${timeSlot}:00+07:00`,
      status: 'pending',
      note: note.trim() || undefined,
      totalEstimatedPrice: service.price,
      totalDurationMinutes: service.durationMinutes,
    });
    setStep(1);
    setServiceId('');
    setTimeSlot('');
    setNote('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <Pressable onPress={step === 1 ? resetAndClose : () => setStep((value) => value - 1)}>
            <Text style={styles.backText}>{step === 1 ? 'Đóng' : '‹ Quay lại'}</Text>
          </Pressable>
          <Text style={styles.modalHeaderTitle}>Đặt lịch dịch vụ</Text>
          <Text style={styles.stepCount}>{step}/4</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${step * 25}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          {step === 1 ? (
            <>
              <StepTitle title="Chọn dịch vụ" caption="Bạn muốn chăm sóc xe theo cách nào?" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {serviceCategories.map((category) => (
                  <Pressable
                    key={category._id}
                    onPress={() => {
                      setCategoryId(category._id);
                      setServiceId('');
                    }}
                    style={[styles.categoryChip, categoryId === category._id && styles.categoryChipActive]}>
                    <Text style={[styles.categoryText, categoryId === category._id && styles.categoryTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {servicesByCategory.map((item) => (
                <Pressable
                  key={item._id}
                  onPress={() => setServiceId(item._id)}
                  style={[styles.selectCard, serviceId === item._id && styles.selectCardActive]}>
                  <View style={styles.selectCopy}>
                    <Text style={styles.selectTitle}>{item.name}</Text>
                    <Text style={styles.selectDescription}>{item.description}</Text>
                    <Text style={styles.duration}>{formatDuration(item.durationMinutes)}</Text>
                  </View>
                  <View style={styles.selectRight}>
                    <Text style={styles.selectPrice}>{formatCurrency(item.price)}</Text>
                    <View style={[styles.radio, serviceId === item._id && styles.radioActive]}>
                      {serviceId === item._id ? <View style={styles.radioDot} /> : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepTitle title="Chọn xe" caption="Dịch vụ này sẽ được thực hiện cho xe nào?" />
              {bookingVehicles.map((item) => (
                <Pressable
                  key={item._id}
                  onPress={() => setVehicleId(item._id)}
                  style={[styles.vehicleCard, vehicleId === item._id && styles.selectCardActive]}>
                  <View style={styles.vehicleMark}>
                    <Text style={styles.vehicleMarkText}>{item.type === 'car' ? 'CAR' : 'BIKE'}</Text>
                  </View>
                  <View style={styles.selectCopy}>
                    <Text style={styles.selectTitle}>{item.name}</Text>
                    <Text style={styles.selectDescription}>{item.licensePlate}</Text>
                  </View>
                  <View style={[styles.radio, vehicleId === item._id && styles.radioActive]}>
                    {vehicleId === item._id ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepTitle title="Chọn thời gian" caption="Các khung giờ hiển thị đang còn chỗ." />
              <Text style={styles.fieldTitle}>Ngày hẹn</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {dates.map((date) => (
                  <Pressable
                    key={date.value}
                    onPress={() => setAppointmentDate(date.value)}
                    style={[styles.dateCard, appointmentDate === date.value && styles.dateCardActive]}>
                    <Text style={[styles.dateWeekday, appointmentDate === date.value && styles.dateTextActive]}>
                      {date.weekday}
                    </Text>
                    <Text style={[styles.dateDay, appointmentDate === date.value && styles.dateTextActive]}>
                      {date.day}
                    </Text>
                    <Text style={[styles.dateMonth, appointmentDate === date.value && styles.dateTextActive]}>
                      {date.month}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.fieldTitle}>Khung giờ</Text>
              <View style={styles.slotGrid}>
                {timeSlots.map((slot, index) => {
                  const unavailable = index === 2 || (appointmentDate === dates[0].value && index === 4);
                  return (
                    <Pressable
                      key={slot}
                      disabled={unavailable}
                      onPress={() => setTimeSlot(slot)}
                      style={[
                        styles.slot,
                        timeSlot === slot && styles.slotActive,
                        unavailable && styles.slotDisabled,
                      ]}>
                      <Text
                        style={[
                          styles.slotText,
                          timeSlot === slot && styles.slotTextActive,
                          unavailable && styles.slotTextDisabled,
                        ]}>
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 4 && service ? (
            <>
              <StepTitle title="Xác nhận lịch hẹn" caption="Kiểm tra thông tin trước khi gửi yêu cầu." />
              <View style={styles.summaryCard}>
                <SummaryRow label="Dịch vụ" value={service.name} />
                <SummaryRow label="Xe" value={`${vehicle?.name} · ${vehicle?.licensePlate}`} />
                <SummaryRow
                  label="Thời gian"
                  value={`${new Date(`${appointmentDate}T00:00:00`).toLocaleDateString('vi-VN')} · ${timeSlot}`}
                />
                <SummaryRow label="Thời lượng" value={formatDuration(service.durationMinutes)} />
                <View style={styles.summaryDivider} />
                <SummaryRow label="Tạm tính" value={formatCurrency(service.price)} strong />
              </View>
              <View>
                <Text style={styles.fieldTitle}>Ghi chú cho gara</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ví dụ: kiểm tra thêm vết xước cửa bên phải..."
                  placeholderTextColor="#98a2b3"
                  multiline
                  style={styles.noteInput}
                />
              </View>
              <View style={styles.policy}>
                <Text style={styles.policyText}>
                  Gara sẽ liên hệ xác nhận. Giá cuối cùng có thể thay đổi sau khi kiểm tra xe.
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={step === 4 ? complete : next} style={styles.continueButton}>
            <Text style={styles.continueText}>{step === 4 ? 'Xác nhận đặt lịch' : 'Tiếp tục'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function StepTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepCaption}>{caption}</Text>
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
  card: { padding: 18, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  serviceName: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '900', marginTop: 3 },
  vehicleText: { color: colors.muted, lineHeight: 20 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 13, marginTop: 7, borderTopWidth: 1, borderTopColor: colors.border },
  metaLabel: { color: '#98a2b3', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  metaValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 4 },
  priceWrap: { alignItems: 'flex-end' },
  price: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  empty: { alignItems: 'center', padding: 30, borderRadius: 18, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: colors.surface },
  backText: { width: 74, color: colors.primary, fontWeight: '800' },
  modalHeaderTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  stepCount: { width: 74, textAlign: 'right', color: colors.muted, fontWeight: '800' },
  progressTrack: { height: 4, backgroundColor: '#e9edf3' },
  progressFill: { height: 4, backgroundColor: colors.primary },
  modalContent: { padding: 20, paddingBottom: 32, gap: 16 },
  stepTitle: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  stepCaption: { color: colors.muted, marginTop: 5, lineHeight: 20 },
  categoryRow: { gap: 9, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  categoryTextActive: { color: '#fff' },
  selectCard: { flexDirection: 'row', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  selectCardActive: { borderColor: colors.primary, backgroundColor: '#f5f9ff' },
  selectCopy: { flex: 1 },
  selectTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  selectDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  duration: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 8 },
  selectRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  selectPrice: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#cbd1da' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 17, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 13 },
  vehicleMark: { width: 52, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  vehicleMarkText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  fieldTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  dateRow: { gap: 9, paddingBottom: 4 },
  dateCard: { width: 64, alignItems: 'center', paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dateCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateWeekday: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  dateDay: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 3 },
  dateMonth: { color: colors.muted, fontSize: 10, marginTop: 2 },
  dateTextActive: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '30.5%', alignItems: 'center', paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  slotDisabled: { backgroundColor: '#eef1f5' },
  slotText: { color: colors.ink, fontWeight: '800' },
  slotTextActive: { color: '#fff' },
  slotTextDisabled: { color: '#b3bac5', textDecorationLine: 'line-through' },
  summaryCard: { padding: 18, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  summaryValue: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  summaryStrong: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  noteInput: { minHeight: 105, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, textAlignVertical: 'top' },
  policy: { padding: 14, borderRadius: 14, backgroundColor: colors.tint },
  policyText: { color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  continueButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.primary },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
