const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export function formatDuration(totalMinutes?: number | null) {
  if (
    typeof totalMinutes !== 'number' ||
    !Number.isFinite(totalMinutes) ||
    totalMinutes < 0
  ) {
    return 'Chưa rõ thời lượng';
  }

  const normalizedMinutes = Math.floor(totalMinutes);
  const days = Math.floor(normalizedMinutes / MINUTES_PER_DAY);
  const remainingAfterDays = normalizedMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(remainingAfterDays / MINUTES_PER_HOUR);
  const minutes = remainingAfterDays % MINUTES_PER_HOUR;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`);

  return parts.join(' ');
}
