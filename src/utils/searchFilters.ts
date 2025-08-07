import { Database } from '../lib/supabase';
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
  // This is a placeholder - in production, you'd query services table
  if (filters.priceMin > 0 || filters.priceMax < 200) {
    // Mock implementation - in production, join with services table
    filtered = filtered.filter(() => Math.random() > 0.1);
  }
  
  // Apply service type filter 
  if (filters.serviceTypes.length > 0) {
    // In production, this would query the services table
    // For now, using a more intelligent mock based on business names
    filtered = filtered.filter(barber => {
      const businessName = barber.business_name.toLowerCase();
      return filters.serviceTypes.some(serviceType => {
        const type = serviceType.toLowerCase();
        if (type === 'haircut') return true; // Most barbers do haircuts
        if (type === 'beard trim' && businessName.includes('beard')) return true;
        if (type === 'fade' && businessName.includes('fade')) return true;
        return Math.random() > 0.6; // Some chance for other services
      });
    });
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
        // Mock price sorting (would need actual service prices in production)
        return Math.random() - 0.5;
      case 'distance':
        // Mock distance sorting (would need geolocation in production)
        return Math.random() - 0.5;
      default:
        return b.average_rating - a.average_rating;
    }
  });
  
  return filtered;
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
    const availabilityManager = createAvailabilityManager(barber.id);
    return await availabilityManager.isBarberAvailableOn(new Date());
  } catch (error) {
    console.error('Error checking today availability:', error);
    return false;
  }
};

export const isBarberAvailableThisWeek = async (barber: BarberProfile): Promise<boolean> => {
  try {
    const availabilityManager = createAvailabilityManager(barber.id);
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      if (await availabilityManager.isBarberAvailableOn(checkDate)) {
        return true;
      }
    }
    
    return false;
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