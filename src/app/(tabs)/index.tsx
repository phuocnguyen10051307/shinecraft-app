import { router, type Href } from 'expo-router';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

import {

  ApiError,

  appointmentsApi,

  dashboardApi,

  loyaltyApi,

  notificationsApi,

  promotionsApi,

} from '@/lib/api';

import type { Appointment, DashboardOverview, LoyaltyAccount, Promotion } from '@/types';



function formatCurrency(value: number) {

  return `${value.toLocaleString('vi-VN')} d`;

}



function formatSchedule(value?: string) {

  if (!value) return '';

  return new Date(value).toLocaleString('vi-VN', {

    day: '2-digit',

    month: '2-digit',

    hour: '2-digit',

    minute: '2-digit',

  });

}



const appointmentsPath = '/appointments' as Href;


const profilePath = '/profile' as Href;

const notificationsPath = '/notifications' as Href;

const promotionsPath = '/promotions' as Href;



export default function HomeScreen() {

  const { user, validateSession } = useAuth();

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);



  const load = useCallback(async () => {

    if (!user) return;



    try {



      if (user.role === 'customer') {

        const [nextAppointments, nextAccount, nextPromotions, nextUnreadNotifications] = await Promise.all([

          appointmentsApi.list(user.role),

          loyaltyApi.getMyAccount(),

          promotionsApi.listActive(),

          notificationsApi.getUnreadCount(),

        ]);



        setAppointments(nextAppointments);

        setLoyaltyAccount(nextAccount);

        setPromotions(nextPromotions);

        setUnreadNotifications(nextUnreadNotifications);

        setDashboardOverview(null);

      } else if (user.role === 'admin') {

        const [nextAppointments, nextOverview] = await Promise.all([

          appointmentsApi.list(user.role),

          dashboardApi.getOverview(),

        ]);



        setAppointments(nextAppointments);

        setDashboardOverview(nextOverview);

        setLoyaltyAccount(null);

        setPromotions([]);

        setUnreadNotifications(0);

      } else {

        const nextAppointments = await appointmentsApi.list(user.role);

        setAppointments(nextAppointments);

        setDashboardOverview(null);

        setLoyaltyAccount(null);

        setPromotions([]);

        setUnreadNotifications(0);

      }
    } catch (error) {

      if (error instanceof ApiError && error.status === 401) {
        await validateSession();
        return;
      }

      Alert.alert('Không thể tải dữ liệu', getApiErrorMessage(error));

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, [user, validateSession]);



  useEffect(() => {

    const task = Promise.resolve().then(load);

    return () => {

      void task;

    };

  }, [load]);



  const upcomingAppointments = useMemo(

    () =>

      appointments

        .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')

        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

        .slice(0, 2),

    [appointments],

  );

  const heroTitle =

    user?.role === 'admin'

      ? 'Bảng điều hành mobile cho admin'

      : user?.role === 'staff'

        ? 'Tap trung vao lich hen ban dang phu trach.'

        : 'Xe sạch hơn, lịch hẹn rõ hơn';



  const heroText =

    user?.role === 'admin'

      ? 'Xem nhanh chỉ số vận hành chính và điều phối công việc ngay trên điện thoại.'

      : user?.role === 'staff'

        ? 'Tập trung vào lịch hẹn và lịch sử dịch vụ bạn đang phụ trách.'

        : 'Quản lý xe, lịch hẹn, thông báo và ưu đãi trong một nơi.';



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

      }

    >

      <View style={styles.header}>

        <View>

          <Text style={styles.eyebrow}>SHINECRAFT MOBILE</Text>

          <Text style={styles.title}>Xin chào, {user?.displayName}</Text>

          <Text style={styles.subtitle}>{heroText}</Text>

        </View>

        <Pressable onPress={() => router.push(profilePath)} style={styles.avatar}>

          <Text style={styles.avatarText}>{user?.displayName?.slice(0, 1).toUpperCase()}</Text>

        </Pressable>

      </View>



      <View style={styles.hero}>

        <Text style={styles.heroKicker}>{user?.role?.toUpperCase()}</Text>

        <Text style={styles.heroTitle}>{heroTitle}</Text>

        <Text style={styles.heroText}>{heroText}</Text>

        <View style={styles.heroActions}>

          <Pressable onPress={() => router.push(appointmentsPath)} style={styles.heroButtonPrimary}>

            <Text style={styles.heroButtonPrimaryText}>Xem lịch hẹn</Text>

          </Pressable>

          {user?.role === 'customer' ? (

            <Pressable onPress={() => router.push(notificationsPath)} style={styles.heroButtonSecondary}>

              <Text style={styles.heroButtonSecondaryText}>Thông báo</Text>

            </Pressable>

          ) : null}

        </View>

      </View>



      <View style={styles.statRow}>

        <Stat

          value={String(dashboardOverview?.totalAppointments ?? appointments.length)}

          label={user?.role === 'admin' ? 'Tổng lịch' : 'Lịch hẹn'}

        />

        <Stat

          value={String(

            user?.role === 'customer'

              ? loyaltyAccount?.currentPoints ?? 0

              : dashboardOverview?.totalServicesCompleted ?? appointments.filter((appointment) => appointment.status === 'completed').length,

          )}

          label={user?.role === 'customer' ? 'Điểm khả dụng' : 'Dịch vụ xong'}

        />

        <Stat

          value={

            user?.role === 'customer'

              ? String(unreadNotifications)

              : user?.role === 'admin'

                ? String(dashboardOverview?.totalActivePromotions ?? 0)

                : String(upcomingAppointments.length)

          }

          label={user?.role === 'customer' ? 'Thông báo mới' : user?.role === 'admin' ? 'KM đang chạy' : 'Sắp tới'}

        />

      </View>



      <View style={styles.quickGrid}>

        <QuickAction

          title="Lịch hẹn"

          description="Theo dõi và cập nhật trạng thái công việc."

          onPress={() => router.push(appointmentsPath)}

        />


        {user?.role === 'customer' ? (

          <>

            <QuickAction

              title="Thông báo"

              description={unreadNotifications ? `${unreadNotifications} thông báo chưa đọc.` : 'Không có thông báo mới.'}

              onPress={() => router.push(notificationsPath)}

            />

            <QuickAction

              title="Khuyến mãi"

              description={promotions.length ? `${promotions.length} ưu đãi đang hiệu lực.` : 'Chưa có ưu đãi mới.'}

              onPress={() => router.push(promotionsPath)}

            />

          </>

        ) : null}

      </View>



      <SectionHeader title="Việc cần chú ý" caption="Các mục quan trọng nhất lúc này." />



      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}



      {!loading && upcomingAppointments.length === 0 ? (

        <EmptyCard

          title="Không có lịch hẹn cần xử lý ngay"

          description="Khi có lịch hẹn mới hoặc sắp tới, bạn sẽ thấy ở đây."

        />

      ) : null}



      {upcomingAppointments.map((appointment) => (

        <View key={appointment._id} style={styles.itemCard}>

          <View style={styles.itemTop}>

            <Text style={styles.itemCode}>#{appointment._id.slice(-8).toUpperCase()}</Text>

            <Text style={styles.itemBadge}>{appointment.status}</Text>

          </View>

          <Text style={styles.itemTitle}>

            {appointment.services.map((service) => service.nameSnapshot).join(', ')}

          </Text>

          <Text style={styles.itemMeta}>

            {appointment.vehicleId.brand} {appointment.vehicleId.model}  {appointment.vehicleId.licensePlate}

          </Text>

          <Text style={styles.itemMeta}>Thời gian: {formatSchedule(appointment.scheduledAt)}</Text>

          <Text style={styles.itemPrice}>{formatCurrency(appointment.totalPrice)}</Text>

        </View>

      ))}



      <SectionHeader

        title={user?.role === 'customer' ? 'Tổng quan tài khoản' : 'Cập nhật gần nhất'}

        caption={user?.role === 'customer' ? 'Thong tin loyalty va uu dai gan day.' : 'Mot so chi so de ban nam tinh hinh nhanh.'}

      />



      {user?.role === 'customer' ? (

        <View style={styles.infoPanel}>

          <InfoRow

            label="Hạng thành viên"

            value={

              typeof loyaltyAccount?.membershipTierId === 'object'

                ? loyaltyAccount.membershipTierId?.name ?? '-'

                : '-'

            }

          />

          <InfoRow label="Ưu đãi đang có" value={String(promotions.length)} />


        </View>

      ) : user?.role === 'admin' && dashboardOverview ? (

        <View style={styles.infoPanel}>

          <InfoRow label="Khách hàng" value={String(dashboardOverview.totalCustomers)} />

          <InfoRow label="Xe đang quản lý" value={String(dashboardOverview.totalVehicles)} />

          <InfoRow label="Doanh thu" value={formatCurrency(dashboardOverview.revenue.total)} />

        </View>

      ) : (

        <View style={styles.infoPanel}>

          <InfoRow label="Lịch đang mở" value={String(upcomingAppointments.length)} />

          <InfoRow label="Lich da hoan thanh" value={String(appointments.filter((appointment) => appointment.status === 'completed').length)} />


        </View>

      )}

    </Screen>

  );

}



function SectionHeader({ title, caption }: { title: string; caption: string }) {

  return (

    <View>

      <Text style={styles.sectionTitle}>{title}</Text>

      <Text style={styles.sectionCaption}>{caption}</Text>

    </View>

  );

}



function Stat({ value, label }: { value: string; label: string }) {

  return (

    <View style={styles.stat}>

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>

    </View>

  );

}



function QuickAction({

  title,

  description,

  onPress,

}: {

  title: string;

  description: string;

  onPress: () => void;

}) {

  return (

    <Pressable onPress={onPress} style={styles.quickCard}>

      <Text style={styles.quickTitle}>{title}</Text>

      <Text style={styles.quickText}>{description}</Text>

      <Text style={styles.quickLink}>Mở ngay</Text>

    </Pressable>

  );

}



function EmptyCard({ title, description }: { title: string; description: string }) {

  return (

    <View style={styles.emptyCard}>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptyText}>{description}</Text>

    </View>

  );

}



function InfoRow({ label, value }: { label: string; value: string }) {

  return (

    <View style={styles.infoRow}>

      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value || '-'}</Text>

    </View>

  );

}



const styles = StyleSheet.create({

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },

  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  title: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 5 },

  subtitle: { color: colors.muted, marginTop: 5, maxWidth: 280, lineHeight: 20 },

  avatar: {

    width: 48,

    height: 48,

    borderRadius: 16,

    backgroundColor: colors.tint,

    alignItems: 'center',

    justifyContent: 'center',

  },

  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '900' },

  hero: {

    padding: 22,

    borderRadius: 24,

    backgroundColor: colors.ink,

    gap: 10,

  },

  heroKicker: { color: '#84adff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },

  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 34, fontWeight: '900', maxWidth: 300 },

  heroText: { color: '#d0d5dd', lineHeight: 21 },

  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },

  heroButtonPrimary: {

    backgroundColor: colors.primary,

    paddingHorizontal: 17,

    paddingVertical: 12,

    borderRadius: 12,

  },

  heroButtonPrimaryText: { color: '#fff', fontWeight: '800' },

  heroButtonSecondary: {

    backgroundColor: '#1d2939',

    paddingHorizontal: 17,

    paddingVertical: 12,

    borderRadius: 12,

    borderWidth: 1,

    borderColor: '#344054',

  },

  heroButtonSecondaryText: { color: '#fff', fontWeight: '800' },

  statRow: { flexDirection: 'row', gap: 10 },

  stat: {

    flex: 1,

    padding: 14,

    borderRadius: 17,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

  },

  statValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },

  statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },

  quickGrid: { gap: 12 },

  quickCard: {

    padding: 18,

    borderRadius: 18,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    gap: 6,

  },

  quickTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },

  quickText: { color: colors.muted, lineHeight: 20 },

  quickLink: { color: colors.primary, fontWeight: '800', marginTop: 2 },

  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },

  sectionCaption: { color: colors.muted, marginTop: 4 },

  loader: { paddingVertical: 36 },

  emptyCard: {

    padding: 24,

    borderRadius: 18,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    alignItems: 'center',

  },

  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },

  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },

  itemCard: {

    padding: 18,

    borderRadius: 18,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    gap: 8,

  },

  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  itemCode: { color: colors.primary, fontSize: 12, fontWeight: '900' },

  itemBadge: {

    color: colors.success,

    backgroundColor: '#ecfdf3',

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 999,

    overflow: 'hidden',

    fontSize: 11,

    fontWeight: '800',

  },

  itemTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },

  itemMeta: { color: colors.muted, lineHeight: 19 },

  itemPrice: { color: colors.ink, fontWeight: '900', marginTop: 4 },

  infoPanel: {

    padding: 18,

    borderRadius: 18,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    gap: 14,

  },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },

  infoLabel: { color: colors.muted, flex: 1 },

  infoValue: { color: colors.ink, fontWeight: '800', flex: 1, textAlign: 'right' },

});


