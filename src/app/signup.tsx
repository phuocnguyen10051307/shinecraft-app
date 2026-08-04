import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (Object.values(form).some((value) => !value.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu xác nhận.');
      return;
    }
    if (form.password.length < 8) {
      Alert.alert('Mật khẩu chưa đủ mạnh', 'Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    try {
      await signUp(form);
      Alert.alert('Đăng ký thành công', 'Bạn có thể đăng nhập ngay.', [
        { text: 'Đăng nhập', onPress: () => router.replace('/login') },
      ]);
    } catch (error) {
      Alert.alert('Đăng ký thất bại', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Quay lại đăng nhập</Text>
      </Pressable>
      <View>
        <Text style={styles.eyebrow}>BẮT ĐẦU CÙNG SHINECRAFT</Text>
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Tạo hồ sơ để đặt lịch, quản lý xe và nhận quyền lợi thành viên.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Họ" value={form.lastName} onChangeText={update('lastName')} />
          </View>
          <View style={styles.half}>
            <FormField label="Tên" value={form.firstName} onChangeText={update('firstName')} />
          </View>
        </View>
        <FormField
          label="Số điện thoại"
          value={form.phone}
          onChangeText={update('phone')}
          keyboardType="phone-pad"
        />
        <FormField
          label="Mật khẩu"
          value={form.password}
          onChangeText={update('password')}
          secureTextEntry
        />
        <FormField
          label="Xác nhận mật khẩu"
          value={form.confirmPassword}
          onChangeText={update('confirmPassword')}
          secureTextEntry
        />
        <Pressable onPress={submit} disabled={loading} style={[styles.button, loading && styles.disabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Tạo tài khoản</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '700', paddingVertical: 6 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 7 },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
