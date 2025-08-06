import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  startOfYear,
  endOfYear,
  isToday as dateFnsIsToday,
  isTomorrow as dateFnsIsTomorrow,
  isYesterday as dateFnsIsYesterday,
  isThisWeek as dateFnsIsThisWeek,
  isThisMonth as dateFnsIsThisMonth,
  isThisYear as dateFnsIsThisYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
  isValid,
  isBefore,
  isAfter
} from 'date-fns';

/**
 * Get the start of today (00:00:00)
 */
export const getStartOfToday = (): Date => {
  return startOfDay(new Date());
};

/**
 * Get the end of today (23:59:59.999)
 */
export const getEndOfToday = (): Date => {
  return endOfDay(new Date());
};

/**
 * Get the start of this month
 */
export const getStartOfThisMonth = (): Date => {
  return startOfMonth(new Date());
};

/**
 * Get the end of this month
 */
export const getEndOfThisMonth = (): Date => {
  return endOfMonth(new Date());
};

/**
 * Get the start of this week
 */
export const getStartOfThisWeek = (): Date => {
  return startOfWeek(new Date());
};

/**
 * Get the end of this week
 */
export const getEndOfThisWeek = (): Date => {
  return endOfWeek(new Date());
};

/**
 * Get date range for the last N months
 */
export const getLastNMonthsRange = (months: number): { start: Date; end: Date } => {
  const end = new Date();
  const start = subMonths(end, months);
  return { start: startOfMonth(start), end: endOfMonth(end) };
};

/**
 * Get date range for the last N days
 */
export const getLastNDaysRange = (days: number): { start: Date; end: Date } => {
  const end = new Date();
  const start = subDays(end, days);
  return { start: startOfDay(start), end: endOfDay(end) };
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsToday(dateObj);
};

/**
 * Check if a date is tomorrow
 */
export const isTomorrow = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsTomorrow(dateObj);
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsYesterday(dateObj);
};

/**
 * Check if a date is within this week
 */
export const isThisWeek = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsThisWeek(dateObj);
};

/**
 * Check if a date is within this month
 */
export const isThisMonth = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsThisMonth(dateObj);
};

/**
 * Check if a date is within this year
 */
export const isThisYear = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsThisYear(dateObj);
};

/**
 * Format date for display with common patterns
 */
export const formatDateDisplay = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) return 'Today';
  if (isTomorrow(dateObj)) return 'Tomorrow';
  if (isYesterday(dateObj)) return 'Yesterday';
  
  return format(dateObj, 'EEEE, MMM d');
};

/**
 * Format date for business display
 */
export const formatBusinessDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
};

/**
 * Format date for short display
 */
export const formatShortDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d');
};

/**
 * Format date and time for appointments
 */
export const formatAppointmentDateTime = (date: Date | string, time: string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateStr = formatDateDisplay(dateObj);
  return `${dateStr} at ${time}`;
};

/**
 * Check if an appointment is upcoming (today or in the future)
 */
export const isUpcomingAppointment = (appointmentDate: Date | string): boolean => {
  const dateObj = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const today = getStartOfToday();
  return isAfter(dateObj, today) || isToday(dateObj);
};

/**
 * Check if booking can be cancelled (at least 24 hours before)
 */
export const canCancelBooking = (appointmentDate: Date | string, appointmentTime: string): boolean => {
  const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
  const now = new Date();
  const hoursUntilAppointment = differenceInHours(appointmentDateTime, now);
  
  return hoursUntilAppointment >= 24;
};

/**
 * Get time until appointment in hours
 */
export const getHoursUntilAppointment = (appointmentDate: Date | string, appointmentTime: string): number => {
  const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
  const now = new Date();
  return differenceInHours(appointmentDateTime, now);
};

/**
 * Check if a date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  const date = parseISO(dateString);
  return isValid(date);
};

/**
 * Get month name from date
 */
export const getMonthName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM');
};

/**
 * Get year from date
 */
export const getYear = (date: Date | string): number => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.getFullYear();
};

/**
 * Create date from appointment date and time strings
 */
export const createAppointmentDateTime = (appointmentDate: string, appointmentTime: string): Date => {
  return new Date(`${appointmentDate} ${appointmentTime}`);
};

/**
 * Get date range options for analytics
 */
export const getAnalyticsDateRanges = () => {
  const now = new Date();
  
  return {
    today: {
      start: getStartOfToday(),
      end: getEndOfToday(),
      label: 'Today'
    },
    yesterday: {
      start: startOfDay(subDays(now, 1)),
      end: endOfDay(subDays(now, 1)),
      label: 'Yesterday'
    },
    thisWeek: {
      start: getStartOfThisWeek(),
      end: getEndOfThisWeek(),
      label: 'This Week'
    },
    lastWeek: {
      start: startOfWeek(subWeeks(now, 1)),
      end: endOfWeek(subWeeks(now, 1)),
      label: 'Last Week'
    },
    thisMonth: {
      start: getStartOfThisMonth(),
      end: getEndOfThisMonth(),
      label: 'This Month'
    },
    lastMonth: {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
      label: 'Last Month'
    },
    last3Months: getLastNMonthsRange(3),
    last6Months: getLastNMonthsRange(6),
    last12Months: getLastNMonthsRange(12),
    thisYear: {
      start: startOfYear(now),
      end: endOfYear(now),
      label: 'This Year'
    }
  };
};