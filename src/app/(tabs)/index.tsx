import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { useAuth } from '@/contexts/auth-context';

const services = [
  { title: 'Rửa xe detailing', description: 'Làm sạch chuyên sâu, bảo vệ bề mặt sơn.' },
  { title: 'Chăm sóc nội thất', description: 'Vệ sinh, khử mùi và dưỡng bề mặt nội thất.' },
  { title: 'Đánh bóng và ceramic', description: 'Khôi phục độ bóng và tạo lớp bảo vệ lâu dài.' },
  { title: 'Bảo dưỡng định kỳ', description: 'Kiểm tra tổng quát để xe luôn vận hành ổn định.' },
];

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SHINECRAFT MOBILE</Text>
          <Text style={styles.title}>Xin chào, {user?.displayName}</Text>
          <Text style={styles.subtitle}>Hôm nay xe của bạn cần được chăm sóc thế nào?</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.displayName?.slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroKicker}>CHĂM SÓC XE TOÀN DIỆN</Text>
        <Text style={styles.heroTitle}>Sạch hơn. Bóng hơn. An tâm hơn.</Text>
        <Text style={styles.heroText}>
          Theo dõi xe, lịch dịch vụ và quyền lợi thành viên ngay trên điện thoại.
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/appointments')} style={styles.heroButton}>
          <Text style={styles.heroButtonText}>Xem lịch hẹn</Text>
        </Pressable>
      </View>

      <View style={styles.statRow}>
        <Stat value={String(user?.loyaltyPoints ?? 0)} label="Điểm thưởng" />
        <Stat value="24" label="Dịch vụ" />
        <Stat value="15%" label="Ưu đãi" />
      </View>

      <View>
        <Text style={styles.sectionTitle}>Dịch vụ nổi bật</Text>
        <Text style={styles.sectionCaption}>Giải pháp chăm sóc phù hợp cho từng nhu cầu.</Text>
      </View>
      <View style={styles.grid}>
        {services.map((service, index) => (
          <View key={service.title} style={styles.service}>
            <View style={styles.serviceNumber}>
              <Text style={styles.serviceNumberText}>0{index + 1}</Text>
            </View>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceText}>{service.description}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, marginTop: 5, maxWidth: 280, lineHeight: 20 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.ink,
    gap: 10,
  },
  heroKicker: { color: '#84adff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 34, fontWeight: '900', maxWidth: 300 },
  heroText: { color: '#d0d5dd', lineHeight: 21 },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 5,
  },
  heroButtonText: { color: '#fff', fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    padding: 14,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  sectionCaption: { color: colors.muted, marginTop: 4 },
  grid: { gap: 12 },
  service: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceNumber: {
    width: 36,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceNumberText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  serviceTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 12 },
  serviceText: { color: colors.muted, lineHeight: 20, marginTop: 5 },
});
