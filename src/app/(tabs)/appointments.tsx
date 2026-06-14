import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';

type Status = 'Đã xác nhận' | 'Đang thực hiện' | 'Chờ xử lý';

const appointments = [
  {
    code: 'SC-260603-01',
    vehicle: 'Mercedes-Benz C 300',
    plate: '51H-248.19',
    service: 'Rửa xe detailing + phủ ceramic',
    date: '03/06/2026',
    time: '09:30',
    status: 'Đang thực hiện' as Status,
    price: 1850000,
  },
  {
    code: 'SC-260603-02',
    vehicle: 'Tesla Model Y',
    plate: '30K-556.72',
    service: 'Vệ sinh nội thất và khử mùi',
    date: '03/06/2026',
    time: '13:00',
    status: 'Đã xác nhận' as Status,
    price: 950000,
  },
  {
    code: 'SC-260604-01',
    vehicle: 'Porsche Macan',
    plate: '59A-902.11',
    service: 'Đánh bóng sơn một bước',
    date: '04/06/2026',
    time: '08:00',
    status: 'Chờ xử lý' as Status,
    price: 2200000,
  },
];

export default function AppointmentsScreen() {
  const [keyword, setKeyword] = useState('');
  const filtered = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    return appointments.filter((item) =>
      `${item.code} ${item.vehicle} ${item.plate} ${item.service}`.toLowerCase().includes(value),
    );
  }, [keyword]);

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Lịch hẹn</Text>
        <Text style={styles.subtitle}>Theo dõi tiến độ các dịch vụ chăm sóc xe.</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Tổng lịch hẹn</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.success }]}>1</Text>
          <Text style={styles.statLabel}>Đang thực hiện</Text>
        </View>
      </View>
      <TextInput
        style={styles.search}
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Tìm theo mã, xe, biển số..."
        placeholderTextColor="#98a2b3"
      />
      {filtered.map((item) => (
        <Pressable key={item.code} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.code}>{item.code}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.service}>{item.service}</Text>
          <Text style={styles.vehicle}>
            {item.vehicle} · {item.plate}
          </Text>
          <View style={styles.divider} />
          <View style={styles.cardBottom}>
            <Text style={styles.date}>
              {item.date} lúc {item.time}
            </Text>
            <Text style={styles.price}>{item.price.toLocaleString('vi-VN')} đ</Text>
          </View>
        </Pressable>
      ))}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Dữ liệu lịch hẹn đang ở chế độ mẫu</Text>
        <Text style={styles.noticeText}>
          Server hiện chưa có API lịch hẹn. Màn hình sẽ sẵn sàng nối dữ liệu thật khi endpoint được
          bổ sung.
        </Text>
      </View>
    </Screen>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const background =
    status === 'Đã xác nhận' ? '#ecfdf3' : status === 'Đang thực hiện' ? '#f4f3ff' : '#fffaeb';
  const color =
    status === 'Đã xác nhận'
      ? colors.success
      : status === 'Đang thực hiện'
        ? '#6938ef'
        : colors.warning;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    padding: 17,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.primary, fontSize: 25, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  search: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  card: {
    padding: 18,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 7,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  code: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  service: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 5 },
  vehicle: { color: colors.muted, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 7 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  date: { color: colors.muted, fontSize: 12 },
  price: { color: colors.ink, fontWeight: '800' },
  notice: { padding: 16, borderRadius: 16, backgroundColor: colors.tint },
  noticeTitle: { color: colors.primaryDark, fontWeight: '800' },
  noticeText: { color: colors.muted, marginTop: 5, lineHeight: 19, fontSize: 13 },
});
