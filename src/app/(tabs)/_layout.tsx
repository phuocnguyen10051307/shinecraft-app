import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { colors } from '@/constants/shinecraft-theme';
import { useAuth } from '@/contexts/auth-context';

const TabIcon = ({ name, fallback, color }: { name: SymbolViewProps['name']; fallback: string; color: ColorValue }) => (
  <SymbolView
    name={name}
    size={23}
    tintColor={color}
    fallback={<Text style={[styles.fallbackIcon, { color }]}>{fallback}</Text>}
  />
);

export default function ProtectedTabsLayout() {
  const { user, isBootstrapping } = useAuth();

  if (!isBootstrapping && !user) return <Redirect href={'/login'} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}>
      <Tabs.Screen
        name={'index'}
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="house.fill" fallback="⌂" />
          ),
        }}
      />
      <Tabs.Screen
        name={'vehicles'}
        options={{
          href: user?.role === 'customer' ? undefined : null,
          title: 'Xe',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name="car.fill"
              fallback="●"
            />
          ),
        }}
      />
      <Tabs.Screen
        name={'appointments'}
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name="calendar"
              fallback="▦"
            />
          ),
        }}
      />
      <Tabs.Screen name={'services'} options={{ href: null }} />
      <Tabs.Screen
        name={'service-histories'}
        options={{
          href: user?.role === 'customer' ? undefined : null,
          title: 'Lịch sử',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="clock.arrow.circlepath" fallback="↻" />
          ),
        }}
      />
      <Tabs.Screen
        name={'loyalty'}
        options={{
          href: user?.role === 'customer' ? undefined : null,
          title: 'Thành viên',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="gift.fill" fallback="◇" />
          ),
        }}
      />
      <Tabs.Screen
        name={'profile'}
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name="person.crop.circle.fill"
              fallback="●"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 11, fontWeight: '700' },
  fallbackIcon: { fontSize: 23, lineHeight: 25, fontWeight: '700' },
});
