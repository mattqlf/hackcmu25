import { formatInTimeZone } from 'date-fns-tz';
import { formatDate } from './dateFormatter';

/**
 * Test function to verify timezone formatting
 * Call this in the browser console to test
 */
export function testTimezone() {
  const now = new Date();
  const testDate = new Date('2024-01-15T18:30:00Z'); // UTC timestamp example

  console.log('=== Timezone Test ===');
  console.log('Current time (local):', now.toLocaleString());
  console.log('Current time (UTC):', now.toISOString());
  console.log('Current time (NY):', formatInTimeZone(now, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz'));

  console.log('\n=== Test Date (2024-01-15T18:30:00Z) ===');
  console.log('UTC:', testDate.toISOString());
  console.log('NY:', formatInTimeZone(testDate, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz'));
  console.log('Local:', testDate.toLocaleString());

  // Test what Supabase actually sends (no timezone indicator)
  const supabaseFormat = '2024-01-15T18:30:00.123456';
  console.log('\n=== Supabase Format Test (Raw) ===');
  console.log('Input:', supabaseFormat);
  console.log('Raw parsed (WRONG - treats as local):', new Date(supabaseFormat).toISOString());
  console.log('With Z appended (CORRECT):', new Date(supabaseFormat + 'Z').toISOString());
  console.log('formatDate result:', formatDate(supabaseFormat));

  // Test with timezone indicator
  const supabaseFormatWithTZ = '2024-01-15T18:30:00+00:00';
  const supabaseDate = new Date(supabaseFormatWithTZ);
  console.log('\n=== Supabase Format Test (With TZ) ===');
  console.log('Input:', supabaseFormatWithTZ);
  console.log('Parsed UTC:', supabaseDate.toISOString());
  console.log('NY:', formatInTimeZone(supabaseDate, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz'));
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testTimezone = testTimezone;
}