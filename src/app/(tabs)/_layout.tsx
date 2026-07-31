import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, type ColorValue } from 'react-native';

import { colors } from '@/constants/shinecraft-theme';
import { useAuth } from '@/contexts/auth-context';

const TabIcon = ({ name, color }: { name: SymbolViewProps['name']; color: ColorValue }) => (
  <SymbolView name={name} size={23} tintColor={color} />
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
            <TabIcon color={color} name={{ ios: 'house.fill', android: 'home', web: 'home' }} />
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
              name={{ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }}
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
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
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
            <TabIcon color={color} name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }} />
          ),
        }}
      />
      <Tabs.Screen
        name={'loyalty'}
        options={{
          href: user?.role === 'customer' ? undefined : null,
          title: 'Thành viên',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: 'gift.fill', android: 'redeem', web: 'redeem' }} />
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
              name={{ ios: 'person.crop.circle.fill', android: 'person', web: 'person' }}
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
});
