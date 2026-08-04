import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';
import { promotionsApi } from '@/lib/api';
import type { Promotion } from '@/types';

function formatPromotionValue(item: Promotion) {
  if (item.type === 'bonus_points') return `+${item.bonusPoints ?? 0} điểm`;
  if (item.type === 'percentage') return `Giảm ${item.discountValue ?? 0}%`;
  if (item.type === 'fixed_amount') return `Giảm ${(item.discountValue ?? 0).toLocaleString('vi-VN')} đ`;
  return 'Ưu đãi dịch vụ';
}

export default function PromotionsScreen() {
  const { user, validateSession } = useAuth();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await promotionsApi.listActive());
    } catch (error) {
      await validateSession();
      Alert.alert('Không thể tải khuyến mãi', getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [validateSession]);

  useEffect(() => {
    if (user?.role !== 'customer') return;
    const task = Promise.resolve().then(load);
    return () => {
      void task;
    };
  }, [load, user?.role]);

  const activeCount = useMemo(() => items.filter((item) => item.isActive !== false).length, [items]);

  if (user?.role !== 'customer') {
    return (
      <Screen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Quay lại</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Màn này dành cho khách hàng</Text>
          <Text style={styles.emptyText}>
            Các chương trình ưu đãi tại đây chỉ dành cho tài khoản khách hàng.
          </Text>
        </View>
      </Screen>
    );
  }

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
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Quay lại</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Khuyến mãi</Text>
        <Text style={styles.subtitle}>Các ưu đãi đang còn hiệu lực cho tài khoản của bạn.</Text>
      </View>

      <View style={styles.hero}>
        <View>
          <Text style={styles.heroLabel}>Đang áp dụng</Text>
          <Text style={styles.heroValue}>{activeCount}</Text>
        </View>
        <Text style={styles.heroText}>
          Kiểm tra điều kiện trước khi đặt lịch để tận dụng ưu đãi phù hợp nhất.
        </Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}

      {!loading && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Chưa có khuyến mãi nào</Text>
          <Text style={styles.emptyText}>Khi có chương trình phù hợp, bạn sẽ thấy ở đây.</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.valueWrap}>
              <Text style={styles.valueText}>{formatPromotionValue(item)}</Text>
            </View>
            <Text style={styles.code}>{item.code}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardText}>
            {item.description || 'Ưu đãi dịch vụ dành cho khách hàng phù hợp.'}
          </Text>
          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>
              Hiệu lực: {new Date(item.startDate).toLocaleDateString('vi-VN')} -{' '}
              {new Date(item.endDate).toLocaleDateString('vi-VN')}
            </Text>
            {typeof item.minOrderAmount === 'number' && item.minOrderAmount > 0 ? (
              <Text style={styles.metaText}>
                Đơn tối thiểu: {item.minOrderAmount.toLocaleString('vi-VN')} đ
              </Text>
            ) : null}
            {typeof item.usageLimit === 'number' ? (
              <Text style={styles.metaText}>Đã dùng {item.usedCount ?? 0}/{item.usageLimit}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => router.push('/appointments')} style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Đặt lịch với ưu đãi này</Text>
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '700', paddingVertical: 6 },
  header: { gap: 6 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 21 },
  hero: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.ink,
    gap: 8,
  },
  heroLabel: { color: '#d0d5dd', fontSize: 12 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  heroText: { color: '#d0d5dd', lineHeight: 20, marginTop: 4 },
  loader: { paddingVertical: 36 },
  empty: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  emptyText: { color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  valueWrap: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.tint,
  },
  valueText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  code: { color: colors.ink, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  cardText: { color: colors.muted, lineHeight: 20 },
  metaBlock: { gap: 5, marginTop: 2 },
  metaText: { color: colors.muted, fontSize: 12 },
  bookButton: { minHeight: 46, marginTop: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  bookButtonText: { color: '#fff', fontWeight: '800' },
});
