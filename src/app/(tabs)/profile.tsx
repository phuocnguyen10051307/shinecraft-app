import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { usersApi } from '@/lib/api';

export default function ProfileScreen() {
  const { user, updateUser, signOut, validateSession } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);

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
        <Text style={styles.subtitle}>Quản lý hồ sơ và phiên đăng nhập của bạn.</Text>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
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
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Điểm thành viên</Text>
          <Text style={styles.infoValue}>{user?.loyaltyPoints ?? 0} điểm</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái</Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>Đang hoạt động</Text>
        </View>
      </View>
      <Pressable
        onPress={() =>
          Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn kết thúc phiên?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
          ])
        }
        style={styles.logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5 },
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
  card: { padding: 19, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 16 },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primary },
  saveText: { color: '#fff', fontWeight: '800' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: colors.muted },
  infoValue: { color: colors.ink, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border },
  logout: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3f2', borderWidth: 1, borderColor: '#fecdca' },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '800' },
});
