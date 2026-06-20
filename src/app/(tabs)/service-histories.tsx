import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { serviceHistoriesApi } from '@/lib/api';
import type { ServiceHistory } from '@/types';

const money = (value: number) => `${value.toLocaleString('vi-VN')} \u0111`;

export default function ServiceHistoriesScreen() {
  const { user, validateSession } = useAuth();
  const [items, setItems] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await serviceHistoriesApi.list(user.role));
    } catch (error) {
      await validateSession();
      Alert.alert('Kh\u00f4ng th\u1ec3 t\u1ea3i l\u1ecbch s\u1eed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, validateSession]);

  useEffect(() => {
    const task = Promise.resolve().then(load);
    return () => { void task; };
  }, [load]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
      }>
      <View>
        <Text style={styles.title}>L\u1ecbch s\u1eed d\u1ecbch v\u1ee5</Text>
        <Text style={styles.subtitle}>D\u1eef li\u1ec7u \u0111\u01b0\u1ee3c \u0111\u1ed3ng b\u1ed9 tr\u1ef1c ti\u1ebfp v\u1edbi web v\u00e0 backend.</Text>
      </View>
      <View style={styles.summary}>
        <View><Text style={styles.summaryLabel}>T\u1ed5ng l\u1ecbch s\u1eed</Text><Text style={styles.summaryValue}>{items.length}</Text></View>
        <View><Text style={styles.summaryLabel}>T\u1ed5ng gi\u00e1 tr\u1ecb</Text><Text style={styles.summaryValue}>{money(total)}</Text></View>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} size={'large'} /> : null}
      {!loading && !items.length ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Ch\u01b0a c\u00f3 l\u1ecbch s\u1eed d\u1ecbch v\u1ee5</Text></View>
      ) : null}
      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.code}>#{item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.price}>{money(item.totalPrice)}</Text>
          </View>
          <Text style={styles.services}>{item.services.map((service) => service.nameSnapshot).join(', ')}</Text>
          <Text style={styles.meta}>{item.vehicleId.brand} {item.vehicleId.model} \u00b7 {item.vehicleId.licensePlate}</Text>
          {user?.role !== 'customer' ? <Text style={styles.meta}>Kh\u00e1ch h\u00e0ng: {item.customerId.displayName} \u00b7 {item.customerId.phone}</Text> : null}
          <Text style={styles.date}>{new Date(item.servicedAt).toLocaleString('vi-VN')}</Text>
          {item.handledBy ? <Text style={styles.meta}>Ph\u1ee5 tr\u00e1ch: {item.handledBy.displayName}</Text> : null}
          {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          {item.nextMaintenanceDate ? <Text style={styles.maintenance}>B\u1ea3o d\u01b0\u1ee1ng ti\u1ebfp theo: {new Date(item.nextMaintenanceDate).toLocaleDateString('vi-VN')}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderRadius: 20, backgroundColor: colors.ink },
  summaryLabel: { color: '#d0d5dd', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 5 },
  empty: { padding: 30, alignItems: 'center', borderRadius: 18, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontWeight: '800' },
  card: { padding: 18, gap: 8, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  code: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  price: { color: colors.ink, fontWeight: '900' },
  services: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '900' },
  meta: { color: colors.muted, lineHeight: 19 },
  date: { color: colors.primary, fontWeight: '700' },
  note: { color: colors.muted, padding: 11, borderRadius: 12, backgroundColor: colors.background },
  maintenance: { color: colors.warning, fontWeight: '700' },
});
