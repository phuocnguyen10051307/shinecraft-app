import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage } from '@/contexts/auth-context';
import { loyaltyApi } from '@/lib/api';
import type { LoyaltyAccount, LoyaltyTransaction, Reward, RewardRedemption } from '@/types';

function formatPoints(value: number) {
  return `${value.toLocaleString('vi-VN')} điểm`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function rewardName(redemption: RewardRedemption) {
  return typeof redemption.rewardId === 'object' ? redemption.rewardId?.name ?? 'Phần thưởng' : 'Phần thưởng';
}

export default function LoyaltyScreen() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await Promise.all([
        loyaltyApi.getMyAccount(),
        loyaltyApi.getMyTransactions(),
        loyaltyApi.getRewards(),
        loyaltyApi.getMyRedemptions(),
      ]);
      setAccount(data[0]);
      setTransactions(data[1]);
      setRewards(data[2]);
      setRedemptions(data[3]);
    } catch (error) {
      Alert.alert('Loyalty', getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const task = Promise.resolve().then(load);
    return () => {
      void task;
    };
  }, [load]);

  const redeem = async (id: string) => {
    setRedeemingId(id);
    try {
      await loyaltyApi.redeem(id);
      await load();
      Alert.alert('Đổi thưởng thành công', 'Phần thưởng đã được lưu vào lịch sử đổi thưởng của bạn.');
    } catch (error) {
      Alert.alert('Loyalty', getApiErrorMessage(error));
    } finally {
      setRedeemingId(null);
    }
  };

  const tier = typeof account?.membershipTierId === 'object' ? account.membershipTierId : null;
  const availableRedemptions = useMemo(
    () => redemptions.filter((item) => item.status === 'available'),
    [redemptions],
  );

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
      <Text style={styles.title}>Loyalty</Text>
      <Text style={styles.subtitle}>Theo dõi điểm thưởng, ưu đãi và lịch sử đổi quà của bạn.</Text>

      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}

      {account ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>ĐIỂM KHẢ DỤNG</Text>
            <Text style={styles.heroPoints}>{account.currentPoints.toLocaleString('vi-VN')}</Text>
            <Text style={styles.heroMeta}>Hạng {tier?.name ?? '-'} • Ưu đãi {tier?.discountPercent ?? 0}%</Text>
            <View style={styles.heroStats}>
              <MiniStat label="Đã tích" value={formatPoints(account.totalEarnedPoints)} />
              <MiniStat label="Đã đổi" value={formatPoints(account.totalRedeemedPoints)} />
            </View>
          </View>

          <SectionHeader
            title="Phần thưởng có thể đổi"
            caption="Chọn ưu đãi phù hợp với số điểm hiện có của bạn."
          />

          {rewards.length === 0 ? (
            <EmptyCard
              title="Chưa có phần thưởng"
              description="Hệ thống chưa có phần thưởng mới ở thời điểm này."
            />
          ) : null}

          {rewards.map((item) => {
            const canRedeem = account.currentPoints >= item.requiredPoints;
            const isRedeeming = redeemingId === item._id;
            return (
              <View key={item._id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardText}>{item.description || 'Ưu đãi dành cho thành viên ShineCraft.'}</Text>
                <View style={styles.rewardMetaRow}>
                  <Text style={styles.cost}>{formatPoints(item.requiredPoints)}</Text>
                  <Text style={styles.rewardMeta}>
                    {item.discountType === 'percentage'
                      ? `${item.discountValue}%`
                      : `${item.discountValue.toLocaleString('vi-VN')} ₫`}
                  </Text>
                </View>
                <Pressable
                  disabled={!canRedeem || isRedeeming}
                  onPress={() => void redeem(item._id)}
                  style={[styles.button, (!canRedeem || isRedeeming) && styles.buttonDisabled]}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{canRedeem ? 'Đổi thưởng' : 'Chưa đủ điểm'}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}

          <SectionHeader
            title="Phần thưởng đã đổi"
            caption="Những voucher hoặc quà đang chờ bạn sử dụng."
          />

          {availableRedemptions.length === 0 ? (
            <EmptyCard
              title="Chưa có phần thưởng khả dụng"
              description="Sau khi đổi thưởng thành công, bạn sẽ thấy chúng ở đây."
            />
          ) : null}

          {availableRedemptions.map((item) => (
            <View key={item._id} style={styles.card}>
              <Text style={styles.cardTitle}>{rewardName(item)}</Text>
              <Text style={styles.cardText}>Đổi lúc {formatDate(item.redeemedAt)}</Text>
              <View style={styles.badgeAvailable}>
                <Text style={styles.badgeAvailableText}>Sẵn sàng sử dụng</Text>
              </View>
            </View>
          ))}

          <SectionHeader
            title="Lịch sử điểm"
            caption="Bao gồm tích điểm, đổi thưởng và điều chỉnh điểm."
          />

          {transactions.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.transactionTop}>
                <Text style={styles.cardTitle}>{item.type.toUpperCase()}</Text>
                <Text style={[styles.pointsDelta, item.points >= 0 ? styles.pointsPositive : styles.pointsNegative]}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </Text>
              </View>
              <Text style={styles.cardText}>{item.description || 'Giao dịch loyalty.'}</Text>
              <Text style={styles.rewardMeta}>{formatDate(item.createdAt)}</Text>
            </View>
          ))}
        </>
      ) : null}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 },
  loader: { paddingVertical: 40 },
  hero: { padding: 22, borderRadius: 22, backgroundColor: colors.ink, gap: 8 },
  heroLabel: { color: '#d0d5dd', fontSize: 12 },
  heroPoints: { color: '#fff', fontSize: 40, fontWeight: '900' },
  heroMeta: { color: '#d0d5dd', lineHeight: 20 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  miniStat: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: '#1d2939' },
  miniStatLabel: { color: '#98a2b3', fontSize: 11 },
  miniStatValue: { color: '#fff', fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  sectionCaption: { color: colors.muted, marginTop: 4 },
  empty: { padding: 22, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.ink, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card: { padding: 17, gap: 8, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  cardText: { color: colors.muted, lineHeight: 20 },
  rewardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cost: { color: colors.primary, fontWeight: '800' },
  rewardMeta: { color: colors.muted, fontSize: 12 },
  button: { marginTop: 6, padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '800' },
  badgeAvailable: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
  },
  badgeAvailableText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  transactionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  pointsDelta: { fontWeight: '900' },
  pointsPositive: { color: colors.success },
  pointsNegative: { color: colors.danger },
});
