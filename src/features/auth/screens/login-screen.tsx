import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      await signIn(phone, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>SC</Text>
          </View>
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để quản lý xe và lịch chăm sóc của bạn.</Text>
        </View>

        <View style={styles.card}>
          <FormField
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="0901234567"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <FormField
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry
            autoComplete="password"
          />
          <Pressable
            disabled={loading}
            onPress={submit}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.register}>
              Chưa có tài khoản? <Text style={styles.registerStrong}>Đăng ký ngay</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: 22, gap: 28 },
  hero: { alignItems: 'center', gap: 10 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 27 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900' },
  subtitle: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 330 },
  card: {
    gap: 17,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  register: { textAlign: 'center', color: colors.muted, paddingTop: 4 },
  registerStrong: { color: colors.primary, fontWeight: '800' },
});
