import { Database } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { createAvailabilityManager } from './availabilityManager';

export interface SearchFilters {
  priceMin: number;
  priceMax: number;
  minRating: number;
  serviceTypes: string[];
  availableToday: boolean;
  availableThisWeek: boolean;
  distance: number;
  sortBy: 'rating' | 'reviews' | 'name' | 'newest' | 'price' | 'distance';
}

export interface BarberProfile {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bio: string;
  profile_image_url: string;
  banner_image_url?: string | null;
  is_claimed: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_FILTERS: SearchFilters = {
  priceMin: 0,
  priceMax: 200,
  minRating: 0,
  serviceTypes: [],
  availableToday: false,
  availableThisWeek: false,
  distance: 50,
  sortBy: 'rating'
};

export const SERVICE_TYPES = [
  'Haircut',
  'Beard Trim', 
  'Hot Towel Shave',
  'Hair Wash',
  'Styling',
  'Fade Cut',
  'Buzz Cut',
  'Line Up',
  'Mustache Trim',
  'Hair Treatment'
];

export const RATING_OPTIONS = [
  { value: 0, label: 'Any Rating' },
  { value: 3, label: '3+ Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 4.5, label: '4.5+ Stars' }
];

export const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'distance', label: 'Distance' }
];

export const applySearchFilters = async (
  barbers: BarberProfile[], 
  filters: SearchFilters,
  searchTerm: string = '',
  selectedCity: string = ''
): Promise<BarberProfile[]> => {
  let filtered = [...barbers];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(barber => 
      barber.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Apply city filter
  if (selectedCity) {
    filtered = filtered.filter(barber => barber.city === selectedCity);
  }
  
  // Apply rating filter
  if (filters.minRating > 0) {
    filtered = filtered.filter(barber => barber.average_rating >= filters.minRating);
  }
  
  // Apply price range filter (would need actual service data)
  if (filters.priceMin > 0 || filters.priceMax < 200) {
    // Filter barbers based on their service price ranges
    const { data: servicesData } = await supabase
      .from('services')
      .select('barber_id, price')
      .eq('is_active', true);
    
    if (servicesData) {
      const barberIdsWithPriceRange = servicesData
        .filter(service => service.price >= filters.priceMin && service.price <= filters.priceMax)
        .map(service => service.barber_id);
      
      filtered = filtered.filter(barber => barberIdsWithPriceRange.includes(barber.id));
    }
  }
  
  // Apply service type filter 
  if (filters.serviceTypes.length > 0) {
    // Filter barbers based on actual services they offer
    const { data: servicesData } = await supabase
      .from('services')
      .select('barber_id, name')
      .eq('is_active', true);
    
    if (servicesData) {
      const barberIdsWithServices = servicesData
        .filter(service => filters.serviceTypes.some(filterType => 
          service.name.toLowerCase().includes(filterType.toLowerCase())
        ))
        .map(service => service.barber_id);
      
      filtered = filtered.filter(barber => barberIdsWithServices.includes(barber.id));
    }
  }
  
  // Apply availability filters
  if (filters.availableToday) {
    const availabilityPromises = filtered.map(async (barber) => {
      const isAvailable = await isBarberAvailableToday(barber);
      return isAvailable ? barber : null;
    });
    
    const availabilityResults = await Promise.all(availabilityPromises);
    filtered = availabilityResults.filter(barber => barber !== null) as BarberProfile[];
  }
  
  if (filters.availableThisWeek) {
    const availabilityPromises = filtered.map(async (barber) => {
      const isAvailable = await isBarberAvailableThisWeek(barber);
      return isAvailable ? barber : null;
    });
    
    const availabilityResults = await Promise.all(availabilityPromises);
    filtered = availabilityResults.filter(barber => barber !== null) as BarberProfile[];
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'rating':
        return b.average_rating - a.average_rating;
      case 'reviews':
        return b.total_reviews - a.total_reviews;
      case 'name':
        return a.business_name.localeCompare(b.business_name);
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'price':
        // Sort by lowest starting price from actual services
        return (a as any).minPrice - (b as any).minPrice;
      case 'distance':
        // Sort by distance if coordinates available, otherwise by city name
        if ((a as any).distance !== undefined && (b as any).distance !== undefined) {
          return (a as any).distance - (b as any).distance;
        }
        return (a.city || '').localeCompare(b.city || '');
      default:
        return b.average_rating - a.average_rating;
    }
  });
  
  return filtered;
};

// Enhanced filtering with real service price data
const addServicePriceData = async (barbers: BarberProfile[]): Promise<BarberProfile[]> => {
  try {
    const { data: servicesData } = await supabase
      .from('services')
      .select('barber_id, price')
      .eq('is_active', true);

    if (!servicesData) return barbers;

    // Add minimum price to each barber for sorting
    return barbers.map(barber => {
      const barberServices = servicesData.filter(s => s.barber_id === barber.id);
      const minPrice = barberServices.length > 0 
        ? Math.min(...barberServices.map(s => s.price))
        : 999; // High value for barbers with no services
      
      return { ...barber, minPrice } as any;
    });
  } catch (error) {
    console.error('Error adding price data:', error);
    return barbers;
  }
};

// Apply enhanced filtering with real data
export const applySearchFiltersEnhanced = async (
  barbers: BarberProfile[], 
  filters: SearchFilters,
  searchTerm: string = '',
  selectedCity: string = ''
): Promise<BarberProfile[]> => {
  // Add service price data for accurate sorting
  let enhanced = await addServicePriceData(barbers);
  
  // Apply all existing filters
  return applySearchFilters(enhanced, filters, searchTerm, selectedCity);
};

export const getActiveFilterCount = (
  filters: SearchFilters, 
  selectedCity: string = ''
): number => {
  return [
    filters.minRating > 0,
    filters.availableToday,
    filters.availableThisWeek,
    filters.serviceTypes.length > 0,
    selectedCity !== '',
    filters.priceMin > 0 || filters.priceMax < 200
  ].filter(Boolean).length;
};

export const formatDistanceFilter = (distance: number): string => {
  if (distance >= 50) return 'Any Distance';
  return `Within ${distance} miles`;
};

export const generateAvailableSlots = async (
  barberId: string, 
  date: Date, 
  serviceDuration: number = 30
): Promise<import('./availabilityManager').TimeSlot[]> => {
  const availabilityManager = createAvailabilityManager(barberId);
  return await availabilityManager.getAvailableSlots(date, serviceDuration);
};

export const isBarberAvailableToday = async (barber: BarberProfile): Promise<boolean> => {
  try {
    const today = new Date().getDay();
    const { data: availability } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barber.id)
      .eq('day_of_week', today)
      .eq('is_available', true)
      .maybeSingle();
    
    return !!availability;
  } catch (error) {
    console.error('Error checking today availability:', error);
    return false;
  }
};

export const isBarberAvailableThisWeek = async (barber: BarberProfile): Promise<boolean> => {
  try {
    // Check if barber has any availability set for any day of the week
    const { data: availability } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barber.id)
      .eq('is_available', true);
    
    // Also check if they have available slots this week (not fully booked)
    if (!availability || availability.length === 0) return false;
    
    // Simple check: if they have availability rules, assume they have some open slots
    // In a more sophisticated system, you'd check against actual bookings
    return true;
  } catch (error) {
    console.error('Error checking week availability:', error);
    return false;
  }
};

export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
};