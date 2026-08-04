import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { ApiError, appointmentsApi, dashboardApi, loyaltyApi, promotionsApi } from '@/lib/api';
import type { Appointment, DashboardOverview, LoyaltyAccount, Promotion } from '@/types';

const appointmentsPath = '/appointments' as Href;
const historyPath = '/service-histories' as Href;
const loyaltyPath = '/loyalty' as Href;
const profilePath = '/profile' as Href;
const promotionsPath = '/promotions' as Href;
const vehiclesPath = '/vehicles' as Href;

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatSchedule(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const { user, validateSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'customer') {
        const [nextAppointments, nextAccount, nextPromotions] = await Promise.all([
          appointmentsApi.list(user.role),
          loyaltyApi.getMyAccount(),
          promotionsApi.listActive(),
        ]);
        setAppointments(nextAppointments);
        setLoyaltyAccount(nextAccount);
        setPromotions(nextPromotions);
        setDashboardOverview(null);
      } else if (user.role === 'admin') {
        const [nextAppointments, nextOverview] = await Promise.all([
          appointmentsApi.list(user.role),
          dashboardApi.getOverview(),
        ]);
        setAppointments(nextAppointments);
        setDashboardOverview(nextOverview);
      } else {
        setAppointments(await appointmentsApi.list(user.role));
        setDashboardOverview(null);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await validateSession();
      } else {
        Alert.alert('Không thể tải dữ liệu', getApiErrorMessage(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, validateSession]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointments],
  );
  const nextAppointment = upcomingAppointments[0];
  const tier =
    typeof loyaltyAccount?.membershipTierId === 'object' ? loyaltyAccount.membershipTierId : null;

  if (user?.role === 'customer') {
    return (
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SHINECRAFT</Text>
            <Text style={styles.title}>Xin chào, {user.displayName}</Text>
            <Text style={styles.subtitle}>Mọi thông tin chăm sóc xe quan trọng của bạn ở một nơi.</Text>
          </View>
          <Pressable accessibilityLabel="Mở tài khoản" onPress={() => router.push(profilePath)} style={styles.avatar}>
            <Text style={styles.avatarText}>{user.displayName?.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{nextAppointment ? 'LỊCH HẸN TIẾP THEO' : 'CHĂM SÓC XE DỄ DÀNG'}</Text>
          <Text style={styles.heroTitle}>
            {nextAppointment
              ? nextAppointment.services.map((service) => service.nameSnapshot).join(', ')
              : 'Đặt lịch phù hợp với thời gian của bạn'}
          </Text>
          <Text style={styles.heroText}>
            {nextAppointment
              ? `${nextAppointment.vehicleId.brand} ${nextAppointment.vehicleId.model} · ${formatSchedule(nextAppointment.scheduledAt)}`
              : 'Chọn xe, dịch vụ và khung giờ chỉ trong vài bước.'}
          </Text>
          <Pressable onPress={() => router.push(appointmentsPath)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{nextAppointment ? 'Xem lịch hẹn' : 'Đặt lịch ngay'}</Text>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <Stat value={String(upcomingAppointments.length)} label="Lịch sắp tới" />
          <Stat value={String(loyaltyAccount?.currentPoints ?? 0)} label="Điểm khả dụng" />
          <Stat value={String(promotions.length)} label="Ưu đãi hiện có" />
        </View>

        <SectionHeader title="Dành cho bạn" caption="Truy cập nhanh những việc thường dùng." />
        <View style={styles.actionGrid}>
          <ActionCard title="Xe của tôi" description="Quản lý thông tin và hình ảnh xe." action="Quản lý xe" onPress={() => router.push(vehiclesPath)} />
          <ActionCard title="Khuyến mãi" description={`${promotions.length} chương trình phù hợp với tài khoản.`} action="Xem ưu đãi" onPress={() => router.push(promotionsPath)} />
          <ActionCard title="Lịch sử dịch vụ" description="Xem chi phí và mốc bảo dưỡng đã lưu." action="Xem lịch sử" onPress={() => router.push(historyPath)} />
          <ActionCard title="Thành viên" description={`Hạng ${tier?.name ?? 'chưa xác định'} · ${loyaltyAccount?.currentQuarterEarnedPoints ?? 0} điểm xét hạng.`} action="Xem quyền lợi" onPress={() => router.push(loyaltyPath)} />
        </View>

        {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
      </Screen>
    );
  }

  const completedCount = appointments.filter((item) => item.status === 'completed').length;
  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
      }>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>VẬN HÀNH SHINECRAFT</Text>
          <Text style={styles.title}>Xin chào, {user?.displayName}</Text>
          <Text style={styles.subtitle}>Theo dõi công việc và các chỉ số vận hành chính.</Text>
        </View>
        <Pressable onPress={() => router.push(profilePath)} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.displayName?.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>
      <View style={styles.statRow}>
        <Stat value={String(dashboardOverview?.totalAppointments ?? appointments.length)} label="Tổng lịch" />
        <Stat value={String(dashboardOverview?.totalServicesCompleted ?? completedCount)} label="Dịch vụ xong" />
        <Stat value={String(upcomingAppointments.length)} label="Sắp tới" />
      </View>
      <Pressable onPress={() => router.push(appointmentsPath)} style={styles.primaryButtonLight}>
        <Text style={styles.primaryButtonLightText}>Xem lịch hẹn</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
      {user?.role === 'admin' && dashboardOverview ? (
        <View style={styles.infoPanel}>
          <InfoRow label="Khách hàng" value={String(dashboardOverview.totalCustomers)} />
          <InfoRow label="Xe đang quản lý" value={String(dashboardOverview.totalVehicles)} />
          <InfoRow label="Doanh thu" value={formatCurrency(dashboardOverview.revenue.total)} />
        </View>
      ) : null}
    </Screen>
  );
}

function SectionHeader({ title, caption }: { title: string; caption: string }) {
  return <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionCaption}>{caption}</Text></View>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text numberOfLines={1} style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ActionCard({ title, description, action, onPress }: { title: string; description: string; action: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionCard}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
      <Text style={styles.actionLink}>{action} →</Text>
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  hero: { padding: 22, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  heroKicker: { color: '#84adff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 25, lineHeight: 32, fontWeight: '900' },
  heroText: { color: '#d0d5dd', lineHeight: 21 },
  primaryButton: { minHeight: 48, marginTop: 4, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  primaryButtonLight: { minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonLightText: { color: '#fff', fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 9 },
  stat: { flex: 1, minWidth: 0, padding: 13, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  sectionCaption: { color: colors.muted, marginTop: 4 },
  actionGrid: { gap: 11 },
  actionCard: { minHeight: 112, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  actionDescription: { color: colors.muted, lineHeight: 19, marginTop: 5 },
  actionLink: { color: colors.primary, fontWeight: '800', marginTop: 10 },
  loader: { paddingVertical: 30 },
  infoPanel: { padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  infoLabel: { color: colors.muted, flex: 1 },
  infoValue: { color: colors.ink, fontWeight: '800', flex: 1, textAlign: 'right' },
});
