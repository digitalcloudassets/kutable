import { supabase } from '../lib/supabase';
import { format, addMinutes, startOfDay, endOfDay, parseISO, isAfter, isBefore } from 'date-fns';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface BarberAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface ExistingBooking {
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
}

export class AvailabilityManager {
  private barberId: string;
  private availability: BarberAvailability[] = [];
  private existingBookings: ExistingBooking[] = [];

  constructor(barberId: string) {
    this.barberId = barberId;
  }

  async loadBarberAvailability(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('barber_id', this.barberId)
        .eq('is_available', true);

      if (error) throw error;
      this.availability = data || [];
    } catch (error) {
      console.error('Error loading barber availability:', error);
      this.availability = [];
    }
  }

  async loadExistingBookings(startDate: string, endDate: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          appointment_date,
          appointment_time,
          services!inner(duration_minutes),
          status
        `)
        .eq('barber_id', this.barberId)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (error) throw error;
      
      this.existingBookings = (data || []).map(booking => ({
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
        duration_minutes: booking.services?.duration_minutes || 30,
        status: booking.status
      }));
    } catch (error) {
      console.error('Error loading existing bookings:', error);
      this.existingBookings = [];
    }
  }

  generateTimeSlots(date: Date, serviceDuration: number = 30): TimeSlot[] {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Find availability for this day of week
    const dayAvailability = this.availability.find(a => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) {
      return []; // No availability set for this day
    }

    const slots: TimeSlot[] = [];
    const startTime = dayAvailability.start_time;
    const endTime = dayAvailability.end_time;
    
    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Generate 30-minute slots
    const slotInterval = 30; // minutes
    let currentTime = new Date(startDateTime);
    
    while (currentTime < endDateTime) {
      const timeString = format(currentTime, 'HH:mm');
      const endOfSlot = addMinutes(currentTime, serviceDuration);
      
      // Check if this slot conflicts with existing bookings
      const isConflicted = this.existingBookings.some(booking => {
        if (booking.appointment_date !== dateStr) return false;
        
        const bookingStart = parseISO(`${booking.appointment_date}T${booking.appointment_time}`);
        const bookingEnd = addMinutes(bookingStart, booking.duration_minutes);
        
        // Check for overlap
        return (
          (isAfter(currentTime, bookingStart) && isBefore(currentTime, bookingEnd)) ||
          (isAfter(endOfSlot, bookingStart) && isBefore(endOfSlot, bookingEnd)) ||
          (isBefore(currentTime, bookingStart) && isAfter(endOfSlot, bookingEnd))
        );
      });
      
      // Check if slot would extend past closing time
      const wouldExtendPastClose = isAfter(endOfSlot, endDateTime);
      
      // Check if slot is in the past
      const now = new Date();
      const isPastSlot = isBefore(currentTime, now);
      
      let available = true;
      let reason = '';
      
      if (isPastSlot) {
        available = false;
        reason = 'Past time';
      } else if (isConflicted) {
        available = false;
        reason = 'Already booked';
      } else if (wouldExtendPastClose) {
        available = false;
        reason = 'Would extend past closing';
      }
      
      slots.push({
        time: timeString,
        available,
        reason
      });
      
      currentTime = addMinutes(currentTime, slotInterval);
    }
    
    return slots;
  }

  async getAvailableSlots(date: Date, serviceDuration: number = 30): Promise<TimeSlot[]> {
    const startDate = format(date, 'yyyy-MM-dd');
    const endDate = startDate; // Same day
    
    await Promise.all([
      this.loadBarberAvailability(),
      this.loadExistingBookings(startDate, endDate)
    ]);
    
    return this.generateTimeSlots(date, serviceDuration);
  }

  async isBarberAvailableOn(date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay();
    await this.loadBarberAvailability();
    
    return this.availability.some(a => a.day_of_week === dayOfWeek && a.is_available);
  }

  async getNextAvailableDate(startDate: Date = new Date(), maxDaysToCheck: number = 30): Promise<Date | null> {
    await this.loadBarberAvailability();
    
    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = addMinutes(startDate, i * 24 * 60); // Add i days
      const dayOfWeek = checkDate.getDay();
      
      const hasAvailability = this.availability.some(a => 
        a.day_of_week === dayOfWeek && a.is_available
      );
      
      if (hasAvailability) {
        const slots = await this.getAvailableSlots(checkDate);
        if (slots.some(slot => slot.available)) {
          return checkDate;
        }
      }
    }
    
    return null; // No availability found in the next maxDaysToCheck days
  }
}

export const createAvailabilityManager = (barberId: string) => {
  return new AvailabilityManager(barberId);
};

// Utility functions for availability checking
export const isBarberAvailableToday = async (barberId: string): Promise<boolean> => {
  const manager = createAvailabilityManager(barberId);
  return await manager.isBarberAvailableOn(new Date());
};

export const isBarberAvailableThisWeek = async (barberId: string): Promise<boolean> => {
  const manager = createAvailabilityManager(barberId);
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const checkDate = addMinutes(today, i * 24 * 60);
    if (await manager.isBarberAvailableOn(checkDate)) {
      return true;
    }
  }
  
  return false;
};