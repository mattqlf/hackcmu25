# Timezone Configuration Guide

## 🌍 **Current Setup**

### **Database Timezone (Supabase)**
- **Setting**: UTC (default and recommended)
- **Why**: Supabase hosted databases default to UTC, which is the best practice
- **No changes needed**: Keep database in UTC for consistency

### **Frontend Display**
- **Target**: New York Time (America/New_York)
- **Library**: `date-fns-tz` for accurate timezone conversion
- **Handles**: EST/EDT transitions automatically

## 🔧 **How It Works**

### **Data Flow**
1. **Database**: Stores all timestamps in UTC
2. **API**: Returns UTC timestamps (e.g., `2024-01-15T18:30:00+00:00`)
3. **Frontend**: Converts UTC → New York time for display
4. **User Sees**: Local New York time with proper DST handling

### **Conversion Process**
```typescript
// Input from Supabase (UTC)
const utcDate = new Date('2024-01-15T18:30:00Z');

// Convert to NY time for display
const nyTime = formatInTimeZone(utcDate, 'America/New_York', 'MMM d, h:mm a');
// Result: "Jan 15, 1:30 PM" (EST) or "Jan 15, 2:30 PM" (EDT)
```

## 🛠️ **Implementation Details**

### **Shared Date Formatter**
- **File**: `/lib/utils/dateFormatter.ts`
- **Used by**: Both sidenote cards and reply cards
- **Handles**: Relative time ("5m ago") and absolute time ("Mon 3:45 PM")

### **Smart Formatting**
- **< 1 hour**: "just now", "5m ago", "45m ago"
- **< 24 hours**: "2h ago", "8h ago", "23h ago"
- **< 1 week**: "Mon 3:45 PM", "Tue 9:15 AM" (NY time)
- **> 1 week**: "Jan 15, 3:45 PM", "Dec 3, 9:15 AM" (NY time)

## 🧪 **Testing Timezone**

### **Browser Console Test**
```javascript
// Run this in browser console to test timezone conversion
testTimezone();
```

### **Manual Verification**
1. Create a new note/reply
2. Check browser console for debug logs
3. Verify timestamp shows correct NY time
4. Compare with your local NY time

## ❌ **What NOT to Do**

### **Don't Change Database Timezone**
```sql
-- DON'T DO THIS!
alter database postgres set timezone to 'America/New_York';
```
**Why**: Breaks best practices and makes calculations complex

### **Don't Use Local Browser Timezone**
```javascript
// DON'T DO THIS!
date.toLocaleString(); // Uses browser's local timezone
```
**Why**: Users could be anywhere in the world

## ✅ **Troubleshooting**

### **If Timestamps Look Wrong**
1. **Check browser console** for debug logs from `formatDate`
2. **Verify date format** from Supabase (should be UTC)
3. **Test timezone function** using `testTimezone()` in console
4. **Check current date** - is it DST or EST period?

### **Common Issues**
- **Wrong timezone**: Verify `America/New_York` in formatter
- **DST confusion**: Library handles EST ↔ EDT automatically
- **Browser timezone**: Don't use `toLocaleString()` without timezone
- **Relative time wrong**: Check calculation logic in formatter

### **Debug Commands**
```javascript
// In browser console:
testTimezone();                    // Test timezone conversion
console.log(new Date().getTimezoneOffset()); // Your browser's offset
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone); // Your timezone
```

## 📋 **Verification Checklist**

✅ **Database stores UTC timestamps**
✅ **Frontend converts UTC → NY time**
✅ **Handles EST/EDT transitions**
✅ **Shows relative time correctly**
✅ **Debug logs work in development**
✅ **All components use shared formatter**

Your timezone setup is now properly configured for New York time display! 🗽