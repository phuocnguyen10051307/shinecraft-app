import { useCallback, useEffect, useMemo, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  Pressable,

  RefreshControl,

  StyleSheet,

  Text,

  View,

} from 'react-native';

import { router } from 'expo-router';



import { Screen } from '@/components/screen';

import { colors } from '@/constants/shinecraft-theme';

import { getApiErrorMessage, useAuth } from '@/contexts/auth-context';

import { notificationsApi } from '@/lib/api';

import type { NotificationItem } from '@/types';



const notificationTypeLabel: Record<NotificationItem['type'], string> = {

  appointment: 'Lịch hẹn',

  booking: 'Đặt lịch',

  promotion: 'Khuyến mãi',

  maintenance: 'Bảo dưỡng',

  loyalty: 'Loyalty',

  system: 'Hệ thống',

};



export default function NotificationsScreen() {

  const { user, validateSession } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);



  const load = useCallback(async () => {

    try {

      setItems(await notificationsApi.listMy());

    } catch (error) {

      await validateSession();

      Alert.alert('Không thể tải thông báo', getApiErrorMessage(error));

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



  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);



  const markOneRead = async (notificationId: string) => {

    try {

      const updated = await notificationsApi.markRead(notificationId);

      setItems((current) =>

        current.map((item) => (item._id === updated._id ? updated : item)),

      );

    } catch (error) {

      Alert.alert('Không thể cập nhật', getApiErrorMessage(error));

    }

  };



  const markAllRead = async () => {

    setSaving(true);

    try {

      await notificationsApi.markAllRead();

      setItems((current) =>

        current.map((item) => ({

          ...item,

          isRead: true,

          readAt: item.readAt ?? new Date().toISOString(),

        })),

      );

    } catch (error) {

      Alert.alert('Không thể đánh dấu đã đọc', getApiErrorMessage(error));

    } finally {

      setSaving(false);

    }

  };



  if (user?.role !== 'customer') {

    return (

      <Screen>

        <Pressable onPress={() => router.back()}>

          <Text style={styles.back}>Quay lại</Text>

        </Pressable>

        <View style={styles.empty}>

          <Text style={styles.emptyTitle}>Mn ny dnh cho khch hng</Text>

          <Text style={styles.emptyText}>

            Hi?n t?i thng bo c nhn trn app mobile ch? m? cho ti kho?n customer.

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

      }

    >

      <Pressable onPress={() => router.back()}>

        <Text style={styles.back}>Quay lại</Text>

      </Pressable>



      <View style={styles.header}>

        <Text style={styles.title}>Thng bo</Text>

        <Text style={styles.subtitle}>Cập nhật mới từ lịch hẹn, loyalty và khuyến mãi.</Text>

      </View>



      <View style={styles.hero}>

        <View>

          <Text style={styles.heroLabel}>Chưa đọc</Text>

          <Text style={styles.heroValue}>{unreadCount}</Text>

        </View>

        <Pressable

          disabled={saving || unreadCount === 0}

          onPress={() => void markAllRead()}

          style={[styles.heroButton, (saving || unreadCount === 0) && styles.buttonDisabled]}

        >

          {saving ? (

            <ActivityIndicator color="#fff" />

          ) : (

            <Text style={styles.heroButtonText}>Đọc tất cả</Text>

          )}

        </Pressable>

      </View>



      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}



      {!loading && items.length === 0 ? (

        <View style={styles.empty}>

          <Text style={styles.emptyTitle}>Chua c thng bo</Text>

          <Text style={styles.emptyText}>Khi có cập nhật mới từ hệ thống, bạn sẽ thấy ở đây.</Text>

        </View>

      ) : null}



      {items.map((item) => (

        <Pressable

          key={item._id}

          onPress={() => {

            if (!item.isRead) {

              void markOneRead(item._id);

            }

          }}

          style={[styles.card, !item.isRead && styles.cardUnread]}

        >

          <View style={styles.cardTop}>

            <Text style={styles.typeBadge}>{notificationTypeLabel[item.type]}</Text>

            <Text style={styles.dateText}>

              {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}

            </Text>

          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>

          <Text style={styles.cardMessage}>{item.message}</Text>

          {!item.isRead ? (

            <View style={styles.unreadPill}>

              <Text style={styles.unreadPillText}>Mới</Text>

            </View>

          ) : null}

        </Pressable>

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

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 16,

  },

  heroLabel: { color: '#d0d5dd', fontSize: 12 },

  heroValue: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 4 },

  heroButton: {

    minHeight: 44,

    paddingHorizontal: 16,

    borderRadius: 12,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: colors.primary,

  },

  heroButtonText: { color: '#fff', fontWeight: '800' },

  buttonDisabled: { opacity: 0.55 },

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

    gap: 9,

  },

  cardUnread: {

    borderColor: '#b2ddff',

    backgroundColor: '#f5faff',

  },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },

  typeBadge: {

    color: colors.primary,

    fontSize: 11,

    fontWeight: '800',

    backgroundColor: colors.tint,

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 999,

  },

  dateText: { color: colors.muted, fontSize: 12, textAlign: 'right', flex: 1 },

  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },

  cardMessage: { color: colors.muted, lineHeight: 20 },

  unreadPill: {

    alignSelf: 'flex-start',

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: '#ecfdf3',

  },

  unreadPillText: { color: colors.success, fontSize: 11, fontWeight: '800' },

});


