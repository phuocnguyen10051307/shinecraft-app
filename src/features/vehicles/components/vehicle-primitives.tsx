import { Text, View } from 'react-native';

import { colors } from '@/constants/shinecraft-theme';
import type { VehicleAccessRequest } from '@/types';

import { vehicleStyles } from './vehicle-styles';

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={vehicleStyles.summaryCard}>
      <Text style={vehicleStyles.summaryLabel}>{label}</Text>
      <Text style={vehicleStyles.summaryValue}>{value}</Text>
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={vehicleStyles.detailRow}>
      <Text style={vehicleStyles.detailLabel}>{label}</Text>
      <Text style={vehicleStyles.detailValue}>{value}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: VehicleAccessRequest['status'] }) {
  const config =
    status === 'approved'
      ? { label: 'Đã duyệt', background: '#ecfdf3', color: colors.success }
      : status === 'rejected'
        ? { label: 'Từ chối', background: '#fef3f2', color: colors.danger }
        : { label: 'Chờ duyệt', background: '#fffaeb', color: colors.warning };

  return (
    <View style={[vehicleStyles.statusBadge, { backgroundColor: config.background }]}>
      <Text style={[vehicleStyles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}
