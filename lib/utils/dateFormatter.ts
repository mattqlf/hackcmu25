import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Formats a date string to New York timezone with smart relative formatting
 * Assumes input dates are in UTC (as stored by Supabase)
 */
export function formatDate(dateString: string): string {
  // Supabase returns timestamps without timezone indicators, but they are stored in UTC
  // We need to explicitly append 'Z' to tell JavaScript this is UTC
  const utcDateString = dateString.includes('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  const utcDate = new Date(utcDateString);

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('formatDate debug:', {
      input: dateString,
      utcDateString: utcDateString,
      utcDate: utcDate.toISOString(),
      nyFormatted: formatInTimeZone(utcDate, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz')
    });
  }

  // Convert to New York time for display
  const nyDate = toZonedTime(utcDate, 'America/New_York');
  const now = new Date();
  const nowNY = toZonedTime(now, 'America/New_York');

  // Calculate difference in NY timezone
  const diffInHours = Math.abs(nowNY.getTime() - nyDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.abs(nowNY.getTime() - nyDate.getTime()) / (1000 * 60);
    return diffInMinutes < 1 ? 'just now' : `${Math.floor(diffInMinutes)}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 24 * 7) {
    // Format in NY timezone
    return formatInTimeZone(utcDate, 'America/New_York', 'EEE h:mm a');
  } else {
    // Format in NY timezone
    return formatInTimeZone(utcDate, 'America/New_York', 'MMM d, h:mm a');
  }
}