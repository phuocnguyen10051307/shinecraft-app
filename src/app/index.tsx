import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { colors } from '@/constants/shinecraft-theme';

export default function IndexScreen() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>SC</Text>
        </View>
        <Text style={styles.brand}>SHINECRAFT</Text>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.caption}>Đang kiểm tra phiên đăng nhập...</Text>
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.background,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  brand: { color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  caption: { color: colors.muted, fontSize: 14 },
});
