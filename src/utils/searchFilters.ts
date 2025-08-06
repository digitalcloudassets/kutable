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

export const applySearchFilters = (
  barbers: BarberProfile[], 
  filters: SearchFilters,
  searchTerm: string = '',
  selectedCity: string = ''
): BarberProfile[] => {
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
  
  // Apply service type filter (mock implementation)
  if (filters.serviceTypes.length > 0) {
    // For demo purposes, randomly filter based on service types
    // In production, this would check actual services offered by each barber
    filtered = filtered.filter(() => Math.random() > 0.2);
  }
  
  // Apply availability filters (mock implementation)
  if (filters.availableToday) {
    filtered = filtered.filter(() => Math.random() > 0.4);
  }
  
  if (filters.availableThisWeek) {
    filtered = filtered.filter(() => Math.random() > 0.2);
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

export const generateMockAvailableSlots = (): string[] => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (Math.random() > 0.3) { // 70% chance slot is available
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
  }
  return slots;
};

export const isBarberAvailableToday = (barber: BarberProfile): boolean => {
  // Mock implementation - in production, this would check actual availability
  return Math.random() > 0.4;
};

export const isBarberAvailableThisWeek = (barber: BarberProfile): boolean => {
  // Mock implementation - in production, this would check actual availability
  return Math.random() > 0.2;
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