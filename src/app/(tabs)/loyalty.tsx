import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage } from '@/contexts/auth-context';
import { loyaltyApi } from '@/lib/api';
import type { LoyaltyAccount, LoyaltyTransaction, MembershipTier, Reward, RewardRedemption } from '@/types';

const transactionLabels: Record<LoyaltyTransaction['type'], string> = {
  earn: 'Nhận điểm', redeem: 'Đổi ưu đãi', adjust: 'Điều chỉnh', expire: 'Hết hạn',
};

const formatPoints = (value = 0) => `${value.toLocaleString('vi-VN')} điểm`;
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '-';

function rewardName(item: RewardRedemption) {
  return typeof item.rewardId === 'object' ? item.rewardId?.name ?? 'Ưu đãi thành viên' : 'Ưu đãi thành viên';
}

function rewardValue(item: Reward) {
  return item.discountType === 'percentage'
    ? `Giảm ${item.discountValue}%`
    : `Giảm ${item.discountValue.toLocaleString('vi-VN')} đ`;
}

export default function LoyaltyScreen() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextAccount, nextTransactions, nextTiers, nextRewards, nextRedemptions] = await Promise.all([
        loyaltyApi.getMyAccount(), loyaltyApi.getMyTransactions(), loyaltyApi.getTiers(),
        loyaltyApi.getRewards(), loyaltyApi.getMyRedemptions(),
      ]);
      setAccount(nextAccount);
      setTransactions(nextTransactions);
      setTiers([...nextTiers].sort((a, b) => a.minTotalEarnedPoints - b.minTotalEarnedPoints));
      setRewards(nextRewards);
      setRedemptions(nextRedemptions);
    } catch (error) {
      Alert.alert('Không thể tải thông tin thành viên', getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const redeem = async (id: string) => {
    setRedeemingId(id);
    try {
      await loyaltyApi.redeem(id);
      await load();
      Alert.alert('Đổi ưu đãi thành công', 'Ưu đãi đã được lưu để bạn sử dụng khi đặt lịch.');
    } catch (error) {
      Alert.alert('Không thể đổi ưu đãi', getApiErrorMessage(error));
    } finally {
      setRedeemingId(null);
    }
  };

  const currentTier = typeof account?.membershipTierId === 'object' ? account.membershipTierId : null;
  const quarterPoints = account?.currentQuarterEarnedPoints ?? 0;
  const nextTier = tiers.find((item) => item.minTotalEarnedPoints > quarterPoints);
  const currentThreshold = currentTier?.minTotalEarnedPoints ?? 0;
  const progress = nextTier
    ? Math.min(100, Math.max(0, ((quarterPoints - currentThreshold) / Math.max(1, nextTier.minTotalEarnedPoints - currentThreshold)) * 100))
    : 100;
  const availableRedemptions = useMemo(
    () => redemptions.filter((item) => item.status === 'available'), [redemptions],
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <View>
        <Text style={styles.eyebrow}>KHÁCH HÀNG THÂN THIẾT</Text>
        <Text style={styles.title}>Thành viên</Text>
        <Text style={styles.subtitle}>Theo dõi điểm, hạng và các ưu đãi dành riêng cho bạn.</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
      {!loading && account ? (
        <>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>ĐIỂM KHẢ DỤNG</Text>
                <Text style={styles.heroPoints}>{account.currentPoints.toLocaleString('vi-VN')}</Text>
                <Text style={styles.heroHint}>Dùng để đổi ưu đãi</Text>
              </View>
              <View style={styles.tierBadge}><Text style={styles.tierBadgeText}>{currentTier?.name ?? 'Chưa có hạng'}</Text></View>
            </View>
            <View style={styles.heroStats}>
              <MiniStat label="Điểm xét hạng quý này" value={formatPoints(quarterPoints)} />
              <MiniStat label="Quyền lợi hiện tại" value={`Giảm ${currentTier?.discountPercent ?? 0}%`} />
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.progressHeader}>
              <View style={styles.flex}><Text style={styles.cardTitle}>Hành trình lên hạng</Text>
                <Text style={styles.cardText}>{nextTier ? `Cần thêm ${formatPoints(nextTier.minTotalEarnedPoints - quarterPoints)} để lên hạng ${nextTier.name}.` : 'Chúc mừng! Bạn đã đạt hạng cao nhất.'}</Text>
              </View>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <View style={styles.progressLegend}><Text style={styles.meta}>{formatPoints(quarterPoints)}</Text><Text style={styles.meta}>{nextTier ? formatPoints(nextTier.minTotalEarnedPoints) : 'Hạng cao nhất'}</Text></View>
            <View style={styles.tierList}>
              {tiers.map((item) => {
                const reached = quarterPoints >= item.minTotalEarnedPoints;
                return <View key={item._id} style={[styles.tierPill, reached && styles.tierPillReached]}><Text style={[styles.tierPillText, reached && styles.tierPillTextReached]}>{item.name} · {formatPoints(item.minTotalEarnedPoints)}</Text></View>;
              })}
            </View>
            <Text style={styles.resetText}>Điểm xét hạng được tính lại vào {formatDate(account.nextQuarterResetAt)}. Đổi ưu đãi không làm giảm tiến độ hạng.</Text>
          </View>

          <View style={styles.policyCard}>
            <Text style={styles.cardTitle}>Cách tích điểm</Text>
            <PolicyRow number="1" text="Mỗi 10.000đ thanh toán được quy đổi thành 1 điểm." />
            <PolicyRow number="2" text="Điểm chỉ được cộng khi dịch vụ đã hoàn tất và thanh toán thành công." />
            <PolicyRow number="3" text="Điểm chưa dùng hết hạn vào đầu quý tiếp theo; hệ thống ưu tiên dùng điểm gần hết hạn trước." />
          </View>

          <SectionHeader title="Ưu đãi có thể đổi" caption="Chọn quyền lợi phù hợp với số điểm khả dụng." />
          {rewards.length === 0 ? <EmptyCard title="Chưa có ưu đãi mới" description="Các ưu đãi thành viên mới sẽ xuất hiện tại đây." /> : null}
          {rewards.map((item) => {
            const inactive = item.isActive === false;
            const expired = Boolean(item.expiredAt && new Date(item.expiredAt) <= new Date());
            const outOfStock = typeof item.quantity === 'number' && (item.redeemedCount ?? 0) >= item.quantity;
            const canRedeem = account.currentPoints >= item.requiredPoints && !inactive && !expired && !outOfStock;
            const label = inactive ? 'Tạm ngưng' : expired ? 'Đã hết hạn' : outOfStock ? 'Tạm hết' : canRedeem ? 'Đổi ưu đãi' : `Thiếu ${formatPoints(item.requiredPoints - account.currentPoints)}`;
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.rowBetween}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.rewardValue}>{rewardValue(item)}</Text></View>
                <Text style={styles.cardText}>{item.description || 'Ưu đãi dành riêng cho khách hàng thân thiết.'}</Text>
                <Text style={styles.cost}>Cần {formatPoints(item.requiredPoints)}</Text>
                <Pressable disabled={!canRedeem || redeemingId === item._id} onPress={() => void redeem(item._id)} style={[styles.button, (!canRedeem || redeemingId === item._id) && styles.buttonDisabled]}>
                  {redeemingId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
                </Pressable>
              </View>
            );
          })}

          <SectionHeader title="Ưu đãi của bạn" caption="Những ưu đãi đã đổi và đang chờ sử dụng." />
          {availableRedemptions.length === 0 ? <EmptyCard title="Chưa có ưu đãi đã đổi" description="Ưu đãi đổi thành công sẽ được lưu tại đây." /> : null}
          {availableRedemptions.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.rowBetween}><Text style={styles.cardTitle}>{rewardName(item)}</Text><Badge label="Sẵn sàng dùng" /></View>
              <Text style={styles.cardText}>Đã đổi lúc {formatDateTime(item.redeemedAt)}</Text>
              <Text style={styles.cost}>Đã dùng {formatPoints(item.pointsUsed)}</Text>
            </View>
          ))}

          <SectionHeader title="Lịch sử điểm" caption="Các lần nhận, sử dụng và hết hạn điểm." />
          {transactions.length === 0 ? <EmptyCard title="Chưa có hoạt động điểm" description="Điểm sẽ được ghi nhận sau lần hoàn tất dịch vụ và thanh toán đầu tiên." /> : null}
          {transactions.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.rowBetween}><Badge label={transactionLabels[item.type]} neutral /><Text style={[styles.pointsDelta, item.points >= 0 ? styles.positive : styles.negative]}>{item.points > 0 ? '+' : ''}{formatPoints(item.points)}</Text></View>
              <Text style={styles.cardText}>{item.description || 'Giao dịch điểm thành viên.'}</Text>
              <Text style={styles.meta}>{formatDateTime(item.createdAt)}{item.expiresAt ? ` · Hết hạn ${formatDate(item.expiresAt)}` : ''}</Text>
            </View>
          ))}

          <View style={styles.panel}>
            <InfoRow label="Tổng điểm đã nhận" value={formatPoints(account.totalEarnedPoints)} />
            <InfoRow label="Điểm đã dùng" value={formatPoints(account.totalRedeemedPoints)} />
            <InfoRow label="Điểm đã hết hạn" value={formatPoints(account.totalExpiredPoints)} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function SectionHeader({ title, caption }: { title: string; caption: string }) { return <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionCaption}>{caption}</Text></View>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <View style={styles.miniStat}><Text style={styles.miniStatLabel}>{label}</Text><Text style={styles.miniStatValue}>{value}</Text></View>; }
function PolicyRow({ number, text }: { number: string; text: string }) { return <View style={styles.policyRow}><View style={styles.policyNumber}><Text style={styles.policyNumberText}>{number}</Text></View><Text style={styles.policyText}>{text}</Text></View>; }
function EmptyCard({ title, description }: { title: string; description: string }) { return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{description}</Text></View>; }
function Badge({ label, neutral }: { label: string; neutral?: boolean }) { return <View style={[styles.badge, neutral && styles.badgeNeutral]}><Text style={[styles.badgeText, neutral && styles.badgeTextNeutral]}>{label}</Text></View>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 5 }, subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 }, loader: { paddingVertical: 40 },
  hero: { padding: 22, borderRadius: 24, backgroundColor: colors.ink, gap: 16 }, heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: '#d0d5dd', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, heroPoints: { color: '#fff', fontSize: 42, fontWeight: '900', marginTop: 3 }, heroHint: { color: '#98a2b3', marginTop: 2 },
  tierBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.primary }, tierBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' }, heroStats: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: '#1d2939' }, miniStatLabel: { color: '#98a2b3', fontSize: 11, lineHeight: 15 }, miniStatValue: { color: '#fff', fontWeight: '800', marginTop: 5 },
  panel: { padding: 19, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 13 }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, progressPercent: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: '#e4e7ec', overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary }, progressLegend: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  tierList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tierPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.background }, tierPillReached: { backgroundColor: '#ecfdf3' }, tierPillText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, tierPillTextReached: { color: colors.success }, resetText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  policyCard: { padding: 19, borderRadius: 19, backgroundColor: colors.tint, gap: 13 }, policyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, policyNumber: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, policyNumberText: { color: '#fff', fontSize: 12, fontWeight: '900' }, policyText: { flex: 1, color: colors.ink, lineHeight: 19 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' }, sectionCaption: { color: colors.muted, marginTop: 4 },
  card: { padding: 17, gap: 9, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 17 }, cardText: { color: colors.muted, lineHeight: 20, marginTop: 4 }, rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, rewardValue: { color: colors.primary, fontSize: 12, fontWeight: '900', textAlign: 'right' }, cost: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  button: { minHeight: 48, marginTop: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primary }, buttonDisabled: { opacity: 0.45 }, buttonText: { color: '#fff', fontWeight: '800' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#ecfdf3' }, badgeNeutral: { backgroundColor: colors.background }, badgeText: { color: colors.success, fontSize: 10, fontWeight: '900' }, badgeTextNeutral: { color: colors.muted }, pointsDelta: { fontWeight: '900' }, positive: { color: colors.success }, negative: { color: colors.warning }, meta: { color: colors.muted, fontSize: 11 },
  empty: { padding: 24, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }, emptyTitle: { color: colors.ink, fontWeight: '900', fontSize: 17, textAlign: 'center' }, emptyText: { color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, infoLabel: { color: colors.muted, flex: 1 }, infoValue: { color: colors.ink, fontWeight: '800', textAlign: 'right' },
});
