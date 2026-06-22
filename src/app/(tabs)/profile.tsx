import { router, type Href } from 'expo-router';

import { useMemo, useState } from 'react';

import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';



import { FormField } from '@/components/form-field';

import { Screen } from '@/components/screen';

import { colors } from '@/constants/shinecraft-theme';

import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';

import { usersApi } from '@/lib/api';



const appointmentsPath = '/appointments' as Href;

const serviceHistoriesPath = '/service-histories' as Href;

const notificationsPath = '/notifications' as Href;

const promotionsPath = '/promotions' as Href;



export default function ProfileScreen() {

  const { user, updateUser, signOut, validateSession } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');

  const [saving, setSaving] = useState(false);



  const subtitle = useMemo(() => {

    if (user?.role === 'admin') return 'Quản lý tài khoản và truy cập nhanh tới khu vực điều hành.';

    if (user?.role === 'staff') return 'Theo dõi hồ sơ và quay lại các công việc đang được giao.';

    return 'Quản lý hồ sơ, thông báo và quyền lợi thành viên của bạn.';

  }, [user?.role]);



  const save = async () => {

    if (!displayName.trim()) {

      Alert.alert('Tên hiển thị không được để trống');

      return;

    }

    setSaving(true);

    try {

      updateUser(await usersApi.updateMe(displayName));

      Alert.alert('Thành công', 'Thông tin tài khoản đã được cập nhật.');

    } catch (error) {

      await validateSession();

      Alert.alert('Không thể cập nhật', getApiErrorMessage(error));

    } finally {

      setSaving(false);

    }

  };



  return (

    <Screen>

      <View>

        <Text style={styles.title}>Tài khoản</Text>

        <Text style={styles.subtitle}>{subtitle}</Text>

      </View>



      <View style={styles.identity}>

        <View style={styles.avatar}>

          <Text style={styles.avatarText}>{user?.displayName?.slice(0, 1).toUpperCase()}</Text>

        </View>

        <Text style={styles.name}>{user?.displayName}</Text>

        <Text style={styles.phone}>{user?.phone}</Text>

        <View style={styles.roleBadge}>

          <Text style={styles.roleText}>{user?.role ?? 'customer'}</Text>

        </View>

      </View>



      <View style={styles.quickGrid}>

        <QuickAction title="Lịch hẹn" onPress={() => router.push(appointmentsPath)} />

        <QuickAction title="Lịch sử" onPress={() => router.push(serviceHistoriesPath)} />

        {user?.role === 'customer' ? (

          <>

            <QuickAction title="Thng bo" onPress={() => router.push(notificationsPath)} />

            <QuickAction title="Khuyến mãi" onPress={() => router.push(promotionsPath)} />

          </>

        ) : null}

      </View>



      <View style={styles.card}>

        <Text style={styles.cardTitle}>Thng tin c nhn</Text>

        <FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} />

        <FormField label="Số điện thoại" value={user?.phone ?? ''} editable={false} />

        <Pressable disabled={saving} onPress={save} style={styles.saveButton}>

          {saving ? (

            <ActivityIndicator color="#fff" />

          ) : (

            <Text style={styles.saveText}>Lưu thay đổi</Text>

          )}

        </Pressable>

      </View>



      <View style={styles.card}>

        {user?.role === 'customer' ? (

          <>

            <InfoRow label="Điểm thành viên" value={`${user?.loyaltyPoints ?? 0} điểm`} />

            <View style={styles.divider} />

          </>

        ) : null}

        <InfoRow label="Trạng thái" value="Đang hoạt động" accent={colors.success} />

      </View>



      <Pressable

        onPress={() =>

          Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn kết thúc phiên?', [

            { text: 'Hủy', style: 'cancel' },

            { text: 'Đăng xuất', style: 'destructive', onPress: signOut },

          ])

        }

        style={styles.logout}

      >

        <Text style={styles.logoutText}>Đăng xuất</Text>

      </Pressable>

    </Screen>

  );

}



function QuickAction({ title, onPress }: { title: string; onPress: () => void }) {

  return (

    <Pressable onPress={onPress} style={styles.quickCard}>

      <Text style={styles.quickTitle}>{title}</Text>

      <Text style={styles.quickText}>Mở nhanh</Text>

    </Pressable>

  );

}



function InfoRow({

  label,

  value,

  accent,

}: {

  label: string;

  value: string;

  accent?: string;

}) {

  return (

    <View style={styles.infoRow}>

      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={[styles.infoValue, accent ? { color: accent } : null]}>{value}</Text>

    </View>

  );

}



const styles = StyleSheet.create({

  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },

  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 },

  identity: {

    alignItems: 'center',

    padding: 23,

    borderRadius: 22,

    backgroundColor: colors.ink,

  },

  avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },

  avatarText: { color: '#fff', fontSize: 27, fontWeight: '900' },

  name: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 13 },

  phone: { color: '#d0d5dd', marginTop: 4 },

  roleBadge: { backgroundColor: '#344054', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, marginTop: 10 },

  roleText: { color: '#d0d5dd', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  quickCard: {

    minWidth: '47%',

    flexGrow: 1,

    padding: 15,

    borderRadius: 16,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

  },

  quickTitle: { color: colors.ink, fontWeight: '800' },

  quickText: { color: colors.muted, marginTop: 5 },

  card: { padding: 19, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 16 },

  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },

  saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primary },

  saveText: { color: '#fff', fontWeight: '800' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },

  infoLabel: { color: colors.muted },

  infoValue: { color: colors.ink, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.border },

  logout: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3f2', borderWidth: 1, borderColor: '#fecdca' },

  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '800' },

});


