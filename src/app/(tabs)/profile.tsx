import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { loyaltyApi, usersApi } from '@/lib/api';
import type { LoyaltyAccount } from '@/types';

const historyPath = '/service-histories' as Href;
const promotionsPath = '/promotions' as Href;

export default function ProfileScreen() {
  const { user, updateUser, signOut, validateSession } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingLoyalty, setLoadingLoyalty] = useState(user?.role === 'customer');

  useFocusEffect(useCallback(() => {
    if (user?.role !== 'customer') return;
    let active = true;
    setLoadingLoyalty(true);
    loyaltyApi.getMyAccount()
      .then((data) => { if (active) setAccount(data); })
      .catch(() => { if (active) setAccount(null); })
      .finally(() => { if (active) setLoadingLoyalty(false); });
    return () => { active = false; };
  }, [user?.role]));

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert('Tên hiển thị không được để trống');
      return;
    }
    setSaving(true);
    try {
      updateUser(await usersApi.updateMe(displayName));
      Alert.alert('Đã lưu thay đổi', 'Thông tin tài khoản của bạn đã được cập nhật.');
    } catch (error) {
      await validateSession();
      Alert.alert('Không thể cập nhật', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const tier = typeof account?.membershipTierId === 'object' ? account.membershipTierId : null;
  const roleLabel = user?.role === 'customer' ? 'Khách hàng' : user?.role === 'staff' ? 'Nhân viên' : 'Quản trị viên';

  return (
    <Screen>
      <View><Text style={styles.eyebrow}>HỒ SƠ CỦA BẠN</Text><Text style={styles.title}>Tài khoản</Text><Text style={styles.subtitle}>Cập nhật thông tin cá nhân và quản lý quyền lợi của bạn.</Text></View>

      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.displayName?.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.identityCopy}><Text style={styles.name}>{user?.displayName}</Text><Text style={styles.phone}>{user?.phone}</Text><View style={styles.roleBadge}><Text style={styles.roleText}>{roleLabel}</Text></View></View>
      </View>

      {user?.role === 'customer' ? (
        <View style={styles.membershipCard}>
          <View style={styles.cardHeader}><View><Text style={styles.cardEyebrow}>THÀNH VIÊN</Text><Text style={styles.cardTitle}>{tier?.name ?? 'Chưa có hạng'}</Text></View><Text style={styles.discount}>Ưu đãi {tier?.discountPercent ?? 0}%</Text></View>
          {loadingLoyalty ? <ActivityIndicator color={colors.primary} /> : <View style={styles.memberStats}><MemberStat label="Điểm khả dụng" value={`${account?.currentPoints ?? 0}`} /><View style={styles.verticalDivider} /><MemberStat label="Điểm xét hạng quý" value={`${account?.currentQuarterEarnedPoints ?? 0}`} /></View>}
          <Text style={styles.memberHint}>Điểm khả dụng dùng để đổi ưu đãi; điểm xét hạng không giảm khi bạn đổi ưu đãi.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} />
        <FormField label="Số điện thoại" value={user?.phone ?? ''} editable={false} />
        <Pressable disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu thay đổi</Text>}</Pressable>
      </View>

      {user?.role === 'customer' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tiện ích</Text>
          <UtilityRow title="Khuyến mãi dành cho bạn" description="Xem các chương trình đang áp dụng" onPress={() => router.push(promotionsPath)} />
          <View style={styles.divider} />
          <UtilityRow title="Lịch sử dịch vụ" description="Theo dõi chi phí và lịch bảo dưỡng" onPress={() => router.push(historyPath)} />
        </View>
      ) : null}

      <View style={styles.statusCard}><Text style={styles.statusLabel}>Trạng thái tài khoản</Text><View style={styles.statusBadge}><View style={styles.statusDot} /><Text style={styles.statusText}>Đang hoạt động</Text></View></View>
      <Pressable onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn kết thúc phiên?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => void signOut() }])} style={styles.logout}><Text style={styles.logoutText}>Đăng xuất</Text></Pressable>
    </Screen>
  );
}

function MemberStat({ label, value }: { label: string; value: string }) { return <View style={styles.memberStat}><Text style={styles.memberValue}>{value}</Text><Text style={styles.memberLabel}>{label}</Text></View>; }
function UtilityRow({ title, description, onPress }: { title: string; description: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.utilityRow}><View style={styles.utilityCopy}><Text style={styles.utilityTitle}>{title}</Text><Text style={styles.utilityDescription}>{description}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 5 }, subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, borderRadius: 22, backgroundColor: colors.ink }, avatar: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, avatarText: { color: '#fff', fontSize: 27, fontWeight: '900' }, identityCopy: { flex: 1 }, name: { color: '#fff', fontSize: 21, fontWeight: '900' }, phone: { color: '#d0d5dd', marginTop: 4 }, roleBadge: { alignSelf: 'flex-start', backgroundColor: '#344054', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, marginTop: 9 }, roleText: { color: '#d0d5dd', fontSize: 10, fontWeight: '800' },
  membershipCard: { padding: 19, borderRadius: 19, backgroundColor: colors.tint, gap: 14 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, cardEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 4 }, discount: { color: colors.primary, fontSize: 12, fontWeight: '900' }, memberStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 15, paddingVertical: 13 }, memberStat: { flex: 1, alignItems: 'center', paddingHorizontal: 8 }, memberValue: { color: colors.ink, fontSize: 20, fontWeight: '900' }, memberLabel: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 4 }, verticalDivider: { width: 1, height: 38, backgroundColor: colors.border }, memberHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  card: { padding: 19, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 16 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primary }, saveText: { color: '#fff', fontWeight: '800' }, disabled: { opacity: 0.55 },
  utilityRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 }, utilityCopy: { flex: 1 }, utilityTitle: { color: colors.ink, fontWeight: '800' }, utilityDescription: { color: colors.muted, fontSize: 12, marginTop: 4 }, chevron: { color: colors.primary, fontSize: 27, lineHeight: 28 }, divider: { height: 1, backgroundColor: colors.border },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 17, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, statusLabel: { color: colors.muted }, statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 }, statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }, statusText: { color: colors.success, fontWeight: '800' }, logout: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3f2', borderWidth: 1, borderColor: '#fecdca' }, logoutText: { color: colors.danger, fontSize: 16, fontWeight: '800' },
});
