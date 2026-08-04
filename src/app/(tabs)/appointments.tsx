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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, appointmentsApi, loyaltyApi, promotionsApi, serviceCategoriesApi, servicesApi, vehiclesApi } from '@/lib/api';
import { formatDuration } from '@/lib/format-duration';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentServiceSnapshot,
  CreateAppointmentInput,
  LoyaltyAccount,
  Promotion,
  Reward,
  RewardRedemption,
  Service,
  ServiceCategory,
  Vehicle,
} from '@/types';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const appointmentFilters: { label: string; value: 'all' | 'upcoming' | AppointmentStatus }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Sắp tới', value: 'upcoming' },
  { label: 'Chờ xác nhận', value: 'pending' },
  { label: 'Đã xác nhận', value: 'confirmed' },
  { label: 'Đang thực hiện', value: 'in_progress' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
];

const statusConfig: Record<AppointmentStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Chờ xác nhận', color: colors.warning, background: '#fffaeb' },
  confirmed: { label: 'Đã xác nhận', color: colors.success, background: '#ecfdf3' },
  in_progress: { label: 'Đang thực hiện', color: '#6938ef', background: '#f4f3ff' },
  completed: { label: 'Hoàn thành', color: colors.primary, background: colors.tint },
  cancelled: { label: 'Đã hủy', color: colors.danger, background: '#fef3f2' },
};

const fallbackStatusConfig = {
  label: 'Không rõ trạng thái',
  color: '#344054',
  background: '#f2f4f7',
};

function getStatusConfig(status?: string | null) {
  if (!status) return fallbackStatusConfig;
  return status in statusConfig ? statusConfig[status as AppointmentStatus] : fallbackStatusConfig;
}

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

function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Chưa có giá';
  return `${value.toLocaleString('vi-VN')} đ`;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getServiceName(service: AppointmentServiceSnapshot) {
  const candidate = service as AppointmentServiceSnapshot & { name?: string; serviceId?: { name?: string } };
  return candidate.nameSnapshot || candidate.name || candidate.serviceId?.name || '';
}

function getServicePrice(service: AppointmentServiceSnapshot) {
  const candidate = service as AppointmentServiceSnapshot & { price?: number; serviceId?: { price?: number } };
  return asNumber(candidate.priceSnapshot ?? candidate.price ?? candidate.serviceId?.price) ?? 0;
}

function getServiceDuration(service: AppointmentServiceSnapshot) {
  const candidate = service as AppointmentServiceSnapshot & { estimatedDuration?: number; serviceId?: { estimatedDuration?: number } };
  return asNumber(candidate.estimatedDurationSnapshot ?? candidate.estimatedDuration ?? candidate.serviceId?.estimatedDuration) ?? 0;
}

function getAppointmentPrice(appointment: Appointment) {
  const candidate = appointment as Appointment & { finalAmount?: number | null; totalAmount?: number | null };
  return (
    asNumber(candidate.finalAmount) ??
    asNumber(candidate.totalPrice) ??
    asNumber(candidate.totalAmount) ??
    asNumber(candidate.subtotalPrice) ??
    (appointment.services ?? []).reduce((total, service) => total + getServicePrice(service), 0)
  );
}

function getAppointmentDuration(appointment: Appointment) {
  return (
    asNumber(appointment.totalEstimatedDuration) ??
    (appointment.services ?? []).reduce((total, service) => total + getServiceDuration(service), 0)
  );
}

function getPromotionReferenceId(reference: Promotion['serviceId']) {
  if (!reference) return '';
  return typeof reference === 'string' ? reference : reference._id;
}

function getPromotionLabel(promotion: Promotion) {
  if (promotion.type === 'percentage') return `${promotion.code} - Giảm ${promotion.discountValue ?? 0}%`;
  if (promotion.type === 'fixed_amount') {
    return `${promotion.code} - Giảm ${formatCurrency(Number(promotion.discountValue ?? 0))}`;
  }
  if (promotion.type === 'bonus_points') return `${promotion.code} - Tặng ${promotion.bonusPoints ?? 0} điểm`;
  return `${promotion.code} - Miễn phí dịch vụ áp dụng`;
}

function calculatePriceAfterPercentageDiscount(price: number, discountPercent: number) {
  const normalizedPrice = Math.max(0, Number(price || 0));
  return Math.max(0, normalizedPrice - Math.round((normalizedPrice * Math.max(0, discountPercent)) / 100));
}

function calculatePromotionDiscount(
  promotion: Promotion,
  invoiceDiscountBase: number,
  selectedServices: Service[],
  membershipDiscountPercent = 0,
) {
  let discountBase = Math.max(0, invoiceDiscountBase);
  if (promotion.targetType === 'service') {
    const targetService = selectedServices.find(
      (service) => service._id === getPromotionReferenceId(promotion.serviceId),
    );
    if (!targetService) return 0;
    discountBase = calculatePriceAfterPercentageDiscount(targetService.price, membershipDiscountPercent);
  }

  let calculatedAmount = 0;
  if (promotion.type === 'percentage') {
    calculatedAmount = Math.round((discountBase * Math.max(0, Number(promotion.discountValue ?? 0))) / 100);
  } else if (promotion.type === 'fixed_amount') {
    calculatedAmount = Math.round(Math.max(0, Number(promotion.discountValue ?? 0)));
  } else if (promotion.type === 'free_service') {
    calculatedAmount = Math.round(discountBase);
  }

  const cappedAmount = promotion.maxDiscountAmount == null
    ? calculatedAmount
    : Math.min(calculatedAmount, Math.max(0, Number(promotion.maxDiscountAmount)));
  return Math.min(discountBase, Math.max(0, cappedAmount));
}

function getRedemptionReward(redemption: RewardRedemption) {
  return typeof redemption.rewardId === 'object' && redemption.rewardId ? redemption.rewardId : null;
}

function calculateRewardDiscount(reward: Reward, discountBase: number) {
  const normalizedBase = Math.max(0, discountBase);
  const normalizedValue = Math.max(0, Number(reward.discountValue ?? 0));
  const rawDiscount = reward.discountType === 'percentage'
    ? Math.round((normalizedBase * normalizedValue) / 100)
    : Math.round(normalizedValue);
  const cappedDiscount = reward.maxDiscountAmount == null
    ? rawDiscount
    : Math.min(rawDiscount, Math.max(0, Number(reward.maxDiscountAmount)));
  return Math.min(normalizedBase, cappedDiscount);
}


export default function AppointmentsScreen() {
  const { user, validateSession } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | AppointmentStatus>('all');
  const [keyword, setKeyword] = useState('');
  const [currentTime, setCurrentTime] = useState(0);

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
        setCurrentTime(new Date().getTime());
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
      const [nextVehicles, nextServices, nextCategories, nextPromotions, nextAccount, nextRedemptions] = await Promise.all([
        vehiclesApi.list(user.role),
        servicesApi.listActive(),
        serviceCategoriesApi.listActive(),
        promotionsApi.listActive(),
        loyaltyApi.getMyAccount(),
        loyaltyApi.getMyRedemptions(),
      ]);
      setVehicles(nextVehicles);
      setServices(nextServices);
      setCategories(nextCategories);
      setPromotions(nextPromotions);
      setLoyaltyAccount(nextAccount);
      setRedemptions(nextRedemptions);
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

  const validAppointments = useMemo(
    () => appointments.filter((appointment) => appointment?._id && appointment.vehicleId && appointment.services?.length),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return validAppointments
      .filter((appointment) => {
        const isUpcoming =
          new Date(appointment.scheduledAt).getTime() >= currentTime &&
          !['completed', 'cancelled'].includes(appointment.status);
        const matchesFilter =
          filter === 'all' ? true : filter === 'upcoming' ? isUpcoming : appointment.status === filter;

        if (!matchesFilter) return false;
        if (!normalizedKeyword) return true;

        const searchContent = [
          appointment.vehicleId.brand,
          appointment.vehicleId.model,
          appointment.vehicleId.licensePlate,
          appointment.note,
          getStatusConfig(appointment.status).label,
          ...(appointment.services ?? []).map(getServiceName),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchContent.includes(normalizedKeyword);
      });
  }, [currentTime, filter, keyword, validAppointments]);

  const openBooking = async () => {
    if (user?.role !== 'customer') return;
    await loadBookingOptions();
    setBookingVisible(true);
  };

  const createAppointment = async (input: CreateAppointmentInput) => {
    setSaving(true);
    try {
      await appointmentsApi.create(input);
      setBookingVisible(false);
      await loadAppointments(true);
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
            <Text style={styles.eyebrow}>ĐẶT LỊCH CÙNG SHINECRAFT</Text>
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
          <View style={styles.customerActions}>
            <Pressable onPress={() => void openBooking()} style={styles.bookingBanner}>
              <View style={styles.bannerIcon}><Text style={styles.bannerIconText}>SC</Text></View>
              <View style={styles.bannerCopy}><Text style={styles.bannerTitle}>Đặt lịch chăm sóc xe</Text><Text style={styles.bannerText}>Chọn xe, dịch vụ và thời gian phù hợp.</Text></View>
              <Text style={styles.bannerArrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/service-histories')} style={styles.historyButton}>
              <Text style={styles.historyButtonText}>Xem lịch sử dịch vụ</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.stats}>
          <Stat value={String(validAppointments.length)} label="Tổng lịch hẹn" />
          <Stat
            value={String(validAppointments.filter((item) => item.status === 'pending').length)}
            label="Chờ xác nhận"
            accent={colors.warning}
          />
          <Stat
            value={String(validAppointments.filter((item) => item.status === 'confirmed').length)}
            label="Đã xác nhận"
            accent={colors.success}
          />
        </View>

        <View style={styles.filterPanel}>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm theo dịch vụ, biển số hoặc ghi chú..."
            placeholderTextColor="#98a2b3"
            style={styles.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {appointmentFilters.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setFilter(item.value)}
                style={[styles.filterChip, filter === item.value && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filter === item.value && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
        ) : filteredAppointments.length ? (
          filteredAppointments.map((appointment, index) => (
            <AppointmentCard
              key={appointment._id ?? appointment.scheduledAt ?? String(index)}
              appointment={appointment}
              allowCancel={user?.role === 'customer'}
              onCancel={setCancelAppointment}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có lịch hẹn</Text>
            <Text style={styles.emptyText}>
              Không tìm thấy lịch hẹn phù hợp với bộ lọc hiện tại.
            </Text>
          </View>
        )}
      </Screen>

      {bookingVisible ? (
        <BookingModal
          vehicles={vehicles}
          services={services}
          categories={categories}
          promotions={promotions}
          loyaltyAccount={loyaltyAccount}
          redemptions={redemptions}
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
  const status = getStatusConfig(appointment.status);
  const appointmentCode = appointment._id ? appointment._id.slice(-8).toUpperCase() : 'CHƯA CÓ MÃ';
  const services = appointment.services ?? [];
  const serviceTitle = services.map(getServiceName).filter(Boolean).join(', ') || 'Chưa có dịch vụ';
  const vehicle = appointment.vehicleId;
  const vehicleLine = vehicle
    ? `${vehicle.brand ?? 'Xe'} ${vehicle.model ?? ''} - ${vehicle.licensePlate ?? 'Chưa có biển số'}`
    : 'Xe - Chưa có biển số';
  const appointmentPrice = getAppointmentPrice(appointment);
  const subtotalPrice = asNumber(appointment.subtotalPrice) ?? services.reduce((total, service) => total + getServicePrice(service), 0);
  const membershipDiscount = asNumber(appointment.membershipTierDiscountSnapshot?.discountAmount) ?? 0;
  const promotionDiscount = asNumber(appointment.promotionDiscountSnapshot?.discountAmount) ?? 0;
  const rewardDiscount = asNumber(appointment.rewardDiscountSnapshot?.discountAmount) ?? 0;
  const totalDiscount = asNumber(appointment.discountAmount) ?? membershipDiscount + promotionDiscount + rewardDiscount;
  const appointmentDuration = getAppointmentDuration(appointment);
  const canCancel =
    Boolean(appointment._id) && allowCancel && appointment.status === 'pending';
  const scheduledAt = appointment.scheduledAt ? new Date(appointment.scheduledAt) : null;
  const scheduleText =
    scheduledAt && !Number.isNaN(scheduledAt.getTime())
      ? `${scheduledAt.toLocaleDateString('vi-VN')} ${scheduledAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      : 'Chưa có thời gian';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>#{appointmentCode}</Text>
        <View style={[styles.badge, { backgroundColor: status.background }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.serviceName}>{serviceTitle}</Text>
      <Text style={styles.vehicleText}>{vehicleLine}</Text>
      <View style={styles.scheduleRow}>
        <View style={styles.scheduleCopy}>
          <Text style={styles.metaLabel}>THỜI GIAN</Text>
          <Text style={styles.metaValue}>{scheduleText}</Text>
          <Text style={styles.durationText}>Dự kiến {formatDuration(appointmentDuration)}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.metaLabel}>THÀNH TIỀN</Text>
          <Text style={styles.price}>{formatCurrency(appointmentPrice)}</Text>
        </View>
      </View>
      {totalDiscount > 0 ? (
        <View style={styles.appliedBenefits}>
          <View style={styles.appliedBenefitHeader}>
            <Text style={styles.appliedBenefitTitle}>Ưu đãi đã áp dụng</Text>
            <Text style={styles.originalPrice}>{formatCurrency(subtotalPrice)}</Text>
          </View>
          {membershipDiscount > 0 ? <BenefitLine label={`Hạng ${appointment.membershipTierDiscountSnapshot?.name ?? 'thành viên'}`} amount={membershipDiscount} /> : null}
          {promotionDiscount > 0 ? <BenefitLine label={`Khuyến mãi ${appointment.promotionDiscountSnapshot?.code ?? ''}`.trim()} amount={promotionDiscount} /> : null}
          {rewardDiscount > 0 ? <BenefitLine label={appointment.rewardDiscountSnapshot?.name ?? 'Ưu đãi đã đổi'} amount={rewardDiscount} /> : null}
        </View>
      ) : null}
      {appointment.note ? <Text style={styles.appointmentNote}>{appointment.note}</Text> : null}
      {canCancel ? (
        <Pressable onPress={() => onCancel(appointment)} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Hủy lịch</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BenefitLine({ label, amount }: { label: string; amount: number }) {
  return <View style={styles.benefitLine}><Text style={styles.benefitLabel}>{label}</Text><Text style={styles.benefitAmount}>-{formatCurrency(amount)}</Text></View>;
}

function BookingModal({
  vehicles,
  services,
  categories,
  promotions,
  loyaltyAccount,
  redemptions,
  loading,
  saving,
  onClose,
  onSubmit,
  onRetry,
}: {
  vehicles: Vehicle[];
  services: Service[];
  categories: ServiceCategory[];
  promotions: Promotion[];
  loyaltyAccount: LoyaltyAccount | null;
  redemptions: RewardRedemption[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const dates = useMemo(() => createBookingDates(), []);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [vehicleId, setVehicleId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [promotionId, setPromotionId] = useState('');
  const [rewardRedemptionId, setRewardRedemptionId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(dates[0].value);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [note, setNote] = useState('');

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === vehicleId);
  const availableCategories = useMemo(() => {
    const nextCategories = new Map<string, ServiceCategory>();
    let hasUncategorized = false;

    services.forEach((service) => {
      if (selectedVehicle?.type && service.vehicleType && service.vehicleType !== selectedVehicle.type) {
        return;
      }

      if (service.categoryId?._id) {
        nextCategories.set(service.categoryId._id, service.categoryId);
      } else {
        hasUncategorized = true;
      }
    });

    categories.forEach((category) => {
      if (nextCategories.has(category._id)) {
        nextCategories.set(category._id, category);
      }
    });

    if (hasUncategorized) {
      nextCategories.set('uncategorized', {
        _id: 'uncategorized',
        name: 'Chưa phân loại',
        description: 'Dịch vụ chưa gắn danh mục.',
        isActive: true,
      });
    }

    return Array.from(nextCategories.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [categories, selectedVehicle, services]);

  const selectedCategory = availableCategories.find((category) => category._id === categoryId) ?? null;
  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        if (selectedVehicle?.type && service.vehicleType && service.vehicleType !== selectedVehicle.type) {
          return false;
        }

        if (!categoryId) return true;
        return (service.categoryId?._id ?? 'uncategorized') === categoryId;
      }),
    [categoryId, selectedVehicle, services],
  );

  const selectedServices = services.filter((service) => serviceIds.includes(service._id));
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);
  const totalDuration = selectedServices.reduce((total, service) => total + service.estimatedDuration, 0);
  const membershipTier =
    typeof loyaltyAccount?.membershipTierId === 'object' ? loyaltyAccount.membershipTierId : null;
  const membershipDiscountPercent = Math.max(0, Number(membershipTier?.discountPercent ?? 0));
  const membershipDiscount = Math.min(
    totalPrice,
    Math.round((totalPrice * membershipDiscountPercent) / 100),
  );
  const priceAfterMembership = Math.max(0, totalPrice - membershipDiscount);
  const eligiblePromotions = promotions.filter((promotion) => {
    if (totalPrice < Number(promotion.minOrderAmount ?? 0)) return false;
    if (promotion.type === 'free_service' && !getPromotionReferenceId(promotion.serviceId)) return false;
    if (promotion.targetType !== 'service') return true;
    return selectedServices.some((service) => service._id === getPromotionReferenceId(promotion.serviceId));
  });
  const availableRedemptions = redemptions.filter((redemption) => {
    if (redemption.status !== 'available') return false;
    const reward = getRedemptionReward(redemption);
    if (!reward || reward.isActive === false) return false;
    if (reward.expiredAt && new Date(reward.expiredAt) <= new Date()) return false;
    return totalPrice >= Number(reward.minOrderAmount ?? 0);
  });
  const selectedPromotion = eligiblePromotions.find((promotion) => promotion._id === promotionId) ?? null;
  const selectedRedemption = availableRedemptions.find((item) => item._id === rewardRedemptionId) ?? null;
  const selectedReward = selectedRedemption ? getRedemptionReward(selectedRedemption) : null;
  const promotionDiscount = selectedPromotion
    ? calculatePromotionDiscount(
        selectedPromotion,
        priceAfterMembership,
        selectedServices,
        membershipDiscountPercent,
      )
    : 0;
  const priceAfterPromotion = Math.max(0, priceAfterMembership - promotionDiscount);
  const rewardDiscount = selectedReward ? calculateRewardDiscount(selectedReward, priceAfterPromotion) : 0;
  const estimatedDiscount = membershipDiscount + promotionDiscount + rewardDiscount;
  const estimatedTotal = Math.max(0, totalPrice - estimatedDiscount);

  const selectVehicle = (nextVehicleId: string) => {
    setVehicleId(nextVehicleId);
    setCategoryId('');
    setCategoryMenuOpen(false);
    setServiceIds([]);
    setPromotionId('');
    setRewardRedemptionId('');
  };

  const selectCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setCategoryMenuOpen(false);
    setServiceIds([]);
    setPromotionId('');
    setRewardRedemptionId('');
  };

  const toggleService = (serviceId: string) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
    setPromotionId('');
    setRewardRedemptionId('');
  };

  const goNext = () => {
    if (step === 0) {
      if (!selectedVehicle) {
        Alert.alert('Chọn xe', 'Vui lòng chọn xe của bạn.');
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!serviceIds.length) {
        Alert.alert('Chọn dịch vụ', 'Vui lòng chọn ít nhất một dịch vụ.');
        return;
      }
      setStep(2);
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
      promotionId: promotionId || undefined,
      rewardRedemptionId: rewardRedemptionId || undefined,
    });
  };

  const goBack = () => {
    if (step === 0) {
      onClose();
      return;
    }
    setStep((current) => (current - 1) as 0 | 1 | 2);
  };

  const footerLabel = step === 0 ? 'Xác nhận xe' : step === 1 ? 'Tiếp tục chọn thời gian' : 'Xác nhận đặt lịch';
  const footerDisabled =
    saving ||
    loading ||
    !selectedVehicle ||
    (step === 1 && !serviceIds.length) ||
    (step === 2 && !selectedServices.length);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={goBack}>
      <View
        style={[
          styles.modalSafe,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderCopy}>
            <Text style={styles.modalTitle}>Đặt lịch mới</Text>
            <Text style={styles.modalSubtitle}>
              {step === 0
                ? 'Chọn xe của bạn rồi xác nhận để tiếp tục.'
                : step === 1
                  ? 'Chọn danh mục dịch vụ, rồi chọn các dịch vụ bên dưới.'
                  : 'Chọn thời gian hẹn và kiểm tra lại tổng tiền.'}
            </Text>
          </View>
          <Pressable disabled={saving} hitSlop={10} onPress={goBack} style={styles.modalCloseButton}>
            <Text style={styles.closeText}>{step === 0 ? 'Đóng' : 'Quay lại'}</Text>
          </Pressable>
        </View>

        <View style={styles.stepper}>
          {[
            { label: 'Xe', active: step === 0 },
            { label: 'Dịch vụ', active: step === 1 },
            { label: 'Thời gian', active: step === 2 },
          ].map((item, index) => (
            <View key={item.label} style={styles.stepItem}>
              <View style={[styles.stepDot, item.active && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, item.active && styles.stepDotTextActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, item.active && styles.stepLabelActive]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
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
              {step === 0 ? (
                <FormSection title="1. Chọn xe" caption="Chọn xe rồi xác nhận để sang bước tiếp theo.">
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
              ) : null}

              {step === 1 ? (
                <FormSection title="2. Chọn danh mục dịch vụ" caption="Chọn danh mục để lọc danh sách dịch vụ bên dưới.">
                  {!selectedVehicle ? (
                    <Text style={styles.helperBox}>Hãy chọn xe ở bước trước để xem danh mục phù hợp.</Text>
                  ) : !availableCategories.length ? (
                    <Text style={styles.helperBox}>Chưa có danh mục nào phù hợp với xe đã chọn.</Text>
                  ) : (
                    <>
                      <View style={styles.dropdownBlock}>
                        <Text style={styles.fieldTitle}>Danh mục dịch vụ</Text>
                        <Pressable
                          onPress={() => setCategoryMenuOpen((current) => !current)}
                          style={[styles.dropdownButton, categoryMenuOpen && styles.dropdownButtonActive]}>
                          <Text style={categoryId ? styles.dropdownValue : styles.dropdownPlaceholder}>
                            {selectedCategory?.name || 'Tất cả danh mục'}
                          </Text>
                          <Text style={styles.dropdownChevron}>{categoryMenuOpen ? '⌃' : '⌄'}</Text>
                        </Pressable>

                        {categoryMenuOpen ? (
                          <View style={styles.dropdownMenu}>
                            <Pressable
                              onPress={() => selectCategory('')}
                              style={[styles.dropdownItem, !categoryId && styles.dropdownItemActive]}>
                              <Text style={[styles.dropdownItemText, !categoryId && styles.dropdownItemTextActive]}>
                                Tất cả danh mục
                              </Text>
                            </Pressable>
                            {availableCategories.map((category) => {
                              const selected = categoryId === category._id;
                              return (
                                <Pressable
                                  key={category._id}
                                  onPress={() => selectCategory(category._id)}
                                  style={[styles.dropdownItem, selected && styles.dropdownItemActive]}>
                                  <View style={styles.dropdownItemCopy}>
                                    <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextActive]}>
                                      {category.name}
                                    </Text>
                                    {category.description?.trim() ? (
                                      <Text
                                        style={[
                                          styles.dropdownItemSubtext,
                                          selected && styles.dropdownItemSubtextActive,
                                        ]}>
                                        {category.description}
                                      </Text>
                                    ) : null}
                                  </View>
                                  {selected ? <Text style={styles.dropdownCheck}>✓</Text> : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.serviceList}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.fieldTitle}>Dịch vụ</Text>
                          <Text style={styles.sectionHint}>{visibleServices.length} dịch vụ</Text>
                        </View>

                        {visibleServices.length ? (
                          visibleServices.map((service) => {
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
                                    {formatDuration(service.estimatedDuration)} · {formatCurrency(service.price)}
                                  </Text>
                                </View>
                                <SelectionMark selected={selected} multiple />
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={styles.helperBox}>Chưa có dịch vụ phù hợp với danh mục đã chọn.</Text>
                        )}
                      </View>
                    </>
                  )}
                </FormSection>
              ) : null}

              {step === 2 ? (
                <>
                  <FormSection title="3. Chọn thời gian" caption="Thời gian hẹn phải ở trong tương lai.">
                    <Text style={styles.fieldTitle}>Ngày hẹn</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                      {dates.map((date) => {
                        const selected = scheduledDate === date.value;
                        return (
                          <Pressable
                            key={date.value}
                            onPress={() => setScheduledDate(date.value)}
                            style={[styles.dateCard, selected && styles.dateCardActive]}>
                            <Text style={[styles.dateWeekday, selected && styles.dateTextActive]}>{date.weekday}</Text>
                            <Text style={[styles.dateDay, selected && styles.dateTextActive]}>{date.day}</Text>
                            <Text style={[styles.dateMonth, selected && styles.dateTextActive]}>{date.month}</Text>
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
                            <Text style={[styles.slotText, selected && styles.slotTextActive]}>{slot}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </FormSection>

                  <FormSection title="Ghi chú" caption="Thông tin này không bắt buộc.">
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

                  <FormSection
                    title="Ưu đãi"
                    caption={membershipDiscountPercent > 0
                      ? `Hạng ${membershipTier?.name} được tự động giảm ${membershipDiscountPercent}%. Bạn có thể chọn thêm một khuyến mãi hoặc một ưu đãi đã đổi.`
                      : 'Bạn có thể chọn một khuyến mãi hoặc một ưu đãi đã đổi phù hợp.'}>
                    <Pressable
                      onPress={() => { setPromotionId(''); setRewardRedemptionId(''); }}
                      style={[styles.serviceCard, !promotionId && !rewardRedemptionId && styles.selectCardActive]}>
                      <View style={styles.selectCopy}>
                        <Text style={styles.selectTitle}>Không dùng thêm ưu đãi</Text>
                        <Text style={styles.selectDescription}>{membershipDiscountPercent > 0 ? 'Vẫn áp dụng giảm giá theo hạng thành viên.' : 'Không áp dụng thêm khuyến mãi hoặc ưu đãi đã đổi.'}</Text>
                      </View>
                      <SelectionMark selected={!promotionId && !rewardRedemptionId} />
                    </Pressable>

                    {eligiblePromotions.map((promotion) => {
                      const selected = promotionId === promotion._id;
                      return (
                        <Pressable
                          key={promotion._id}
                          onPress={() => { setPromotionId(promotion._id); setRewardRedemptionId(''); }}
                          style={[styles.serviceCard, selected && styles.selectCardActive]}>
                          <View style={styles.selectCopy}>
                            <Text style={styles.benefitType}>KHUYẾN MÃI</Text>
                            <Text style={styles.selectTitle}>{promotion.title}</Text>
                            <Text style={styles.selectDescription}>{getPromotionLabel(promotion)}</Text>
                            {promotion.description?.trim() ? <Text style={styles.serviceMeta}>{promotion.description}</Text> : null}
                          </View>
                          <SelectionMark selected={selected} />
                        </Pressable>
                      );
                    })}

                    {availableRedemptions.map((redemption) => {
                      const reward = getRedemptionReward(redemption);
                      const selected = rewardRedemptionId === redemption._id;
                      return reward ? (
                        <Pressable
                          key={redemption._id}
                          onPress={() => { setRewardRedemptionId(redemption._id); setPromotionId(''); }}
                          style={[styles.serviceCard, selected && styles.selectCardActive]}>
                          <View style={styles.selectCopy}>
                            <Text style={styles.benefitType}>ƯU ĐÃI ĐÃ ĐỔI</Text>
                            <Text style={styles.selectTitle}>{reward.name}</Text>
                            <Text style={styles.selectDescription}>Giảm {formatCurrency(reward.discountValue)}</Text>
                            <Text style={styles.serviceMeta}>Đã dùng {redemption.pointsUsed.toLocaleString('vi-VN')} điểm để đổi</Text>
                          </View>
                          <SelectionMark selected={selected} />
                        </Pressable>
                      ) : null;
                    })}

                    {!eligiblePromotions.length && !availableRedemptions.length ? (
                      <Text style={styles.helperBox}>Chưa có ưu đãi bổ sung phù hợp với các dịch vụ đã chọn.</Text>
                    ) : null}
                  </FormSection>

                  <View style={styles.summaryCard}>
                    <SummaryRow label="Xe" value={`${selectedVehicle?.brand} ${selectedVehicle?.model}`} />
                    <SummaryRow label="Danh mục" value={selectedCategory?.name || 'Tất cả danh mục'} />
                    <SummaryRow label="Dịch vụ" value={String(selectedServices.length)} />
                    <SummaryRow label="Thời lượng" value={formatDuration(totalDuration)} />
                    <View style={styles.summaryDivider} />
                    <SummaryRow label="Tạm tính" value={formatCurrency(totalPrice)} strong />
                    {membershipDiscount > 0 ? (
                      <SummaryRow label={`Hạng thành viên (${membershipTier?.name})`} value={`-${formatCurrency(membershipDiscount)}`} accent />
                    ) : null}
                    {promotionDiscount > 0 ? (
                      <SummaryRow label={`Khuyến mãi (${selectedPromotion?.code})`} value={`-${formatCurrency(promotionDiscount)}`} accent />
                    ) : null}
                    {rewardDiscount > 0 ? (
                      <SummaryRow label={`Ưu đãi (${selectedReward?.name})`} value={`-${formatCurrency(rewardDiscount)}`} accent />
                    ) : null}
                    <SummaryRow label="Tổng dự kiến" value={formatCurrency(estimatedTotal)} strong />
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={footerDisabled} onPress={goNext} style={[styles.continueButton, footerDisabled && styles.buttonDisabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueText}>{footerLabel}</Text>}
          </Pressable>
        </View>
      </View>
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
            {(appointment.services ?? []).map((service) => service.nameSnapshot).join(', ') || 'lịch này'}?
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
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, accent && styles.summaryAccent]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong, accent && styles.summaryAccent]}>{value}</Text>
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
  customerActions: { gap: 10 },
  bookingBanner: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 21, backgroundColor: colors.ink, gap: 13 },
  historyButton: { minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  historyButtonText: { color: colors.primary, fontWeight: '800' },
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
  filterPanel: { padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  searchInput: { minHeight: 46, borderRadius: 12, backgroundColor: colors.background, paddingHorizontal: 14, color: colors.ink, fontSize: 15 },
  chipRow: { gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterChipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: '#fff' },
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
  appliedBenefits: { padding: 12, borderRadius: 13, backgroundColor: '#ecfdf3', gap: 7 },
  appliedBenefitHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  appliedBenefitTitle: { color: colors.success, fontSize: 12, fontWeight: '900' },
  originalPrice: { color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },
  benefitLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  benefitLabel: { color: colors.muted, flex: 1, fontSize: 12 },
  benefitAmount: { color: colors.success, fontSize: 12, fontWeight: '800' },
  cancelButton: { alignSelf: 'flex-end', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 11, backgroundColor: '#fef3f2' },
  cancelButtonText: { color: colors.danger, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 30, borderRadius: 18, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderCopy: { flex: 1 },
  modalCloseButton: { minWidth: 68, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  stepLabelActive: { color: colors.ink },
  modalTitle: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  modalSubtitle: { color: colors.muted, marginTop: 4 },
  closeText: { color: colors.primary, fontWeight: '800' },
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
  dropdownBlock: { gap: 10 },
  dropdownButton: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dropdownButtonActive: { borderColor: colors.primary, backgroundColor: '#f5f9ff' },
  dropdownValue: { color: colors.ink, fontSize: 15, fontWeight: '800', flex: 1 },
  dropdownPlaceholder: { color: colors.muted, fontSize: 15, fontWeight: '700', flex: 1 },
  dropdownChevron: { color: colors.muted, fontSize: 16, fontWeight: '900' },
  dropdownMenu: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dropdownItemActive: { backgroundColor: '#f5f9ff' },
  dropdownItemCopy: { flex: 1, gap: 3 },
  dropdownItemText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  dropdownItemTextActive: { color: colors.primary },
  dropdownItemSubtext: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  dropdownItemSubtextActive: { color: '#2959c6' },
  dropdownCheck: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  serviceList: { gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionHint: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  vehicleMark: { width: 52, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  vehicleMarkText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  selectCopy: { flex: 1 },
  selectTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  selectDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  serviceMeta: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 8 },
  benefitType: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
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
  summaryAccent: { color: colors.success, fontWeight: '800' },
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
