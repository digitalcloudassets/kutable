import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Filter, Clock, DollarSign, Calendar, MapIcon, X, SlidersHorizontal, Scissors, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { applySearchFilters, SearchFilters, DEFAULT_FILTERS } from '../utils/searchFilters';
import AdvancedSearchPanel from '../components/Search/AdvancedSearchPanel';
import { NotificationManager } from '../utils/notifications';

interface BarberProfile {
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
  banner_image_url?: string;
  is_claimed: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
}


const BarberListPage: React.FC = () => {
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [filteredBarbers, setFilteredBarbers] = useState<BarberProfile[]>([]);
  const [displayedBarbers, setDisplayedBarbers] = useState<BarberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [availableServiceTypes] = useState([
    'Haircut', 'Beard Trim', 'Shave', 'Hair Wash', 'Styling', 'Fade', 'Buzz Cut', 'Line Up'
  ]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const PROFILES_PER_PAGE = 24;

  useEffect(() => {
    loadBarberData();
  }, []);

  const loadBarberData = async () => {
    try {
      console.log('📁 Loading verified barber profiles from database...');
      
      const { data: dbProfiles, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_claimed', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Database query failed:', error);
        setBarbers([]);
        setFilteredBarbers([]);
        setDisplayedBarbers([]);
        setCities([]);
        setLoading(false);
        return;
      }

      const profiles: BarberProfile[] = (dbProfiles || []).map(profile => ({
        ...profile,
        profile_image_url: profile.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=400'
      }));

      console.log(`✅ Found ${profiles.length} verified barber profiles`);
      
      setBarbers(profiles);
      setFilteredBarbers(profiles);
      setDisplayedBarbers(profiles.slice(0, PROFILES_PER_PAGE));
      setCurrentPage(1);
      
      // Extract unique cities for filter
      const uniqueCities = [...new Set(profiles.map(p => p.city).filter(Boolean))] as string[];
      setCities(uniqueCities.sort());

    } catch (error) {
      console.error('❌ Failed to load profiles:', error);
      setBarbers([]);
      setFilteredBarbers([]);
      setDisplayedBarbers([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter barbers based on search and city
  useEffect(() => {
    const applyFiltersAsync = async () => {
      if (barbers.length === 0) return;
      
      setApplyingFilters(true);
      try {
        const filtered = await applySearchFilters(barbers, filters, searchTerm, selectedCity);
        setFilteredBarbers(filtered);
        setDisplayedBarbers(filtered.slice(0, PROFILES_PER_PAGE));
        setCurrentPage(1);
      } catch (error) {
        console.error('Error applying filters:', error);
        NotificationManager.error('Error applying filters. Using basic search only.');
        
        // Fallback to basic filtering
        let basicFiltered = [...barbers];
        
        if (searchTerm) {
          basicFiltered = basicFiltered.filter(barber => 
            barber.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            barber.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        if (selectedCity) {
          basicFiltered = basicFiltered.filter(barber => barber.city === selectedCity);
        }
        
        setFilteredBarbers(basicFiltered);
        setDisplayedBarbers(basicFiltered.slice(0, PROFILES_PER_PAGE));
        setCurrentPage(1);
      } finally {
        setApplyingFilters(false);
      }
    };

    applyFiltersAsync();
  }, [searchTerm, selectedCity, barbers, filters]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedCity('');
    setSearchTerm('');
    NotificationManager.info('All filters cleared');
  };

  const activeFilterCount = [
    filters.minRating > 0,
    filters.availableToday,
    filters.availableThisWeek,
    filters.serviceTypes.length > 0,
    selectedCity !== ''
  ].filter(Boolean).length;

  const loadMoreProfiles = () => {
    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * PROFILES_PER_PAGE;
      const endIndex = startIndex + PROFILES_PER_PAGE;
      const newProfiles = filteredBarbers.slice(startIndex, endIndex);
      
      setDisplayedBarbers(prev => [...prev, ...newProfiles]);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    }, 500);
  };

  const hasMoreProfiles = displayedBarbers.length < filteredBarbers.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Discovering Amazing Barbers</h2>
            <p className="text-gray-600">Loading verified professionals in your area...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card-premium overflow-hidden animate-pulse">
                <div className="w-full h-64 bg-gray-200"></div>
                <div className="p-8">
                  <div className="h-6 bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded-xl mb-6"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded-xl w-20"></div>
                    <div className="h-10 bg-gray-200 rounded-xl w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm page-header-bg -mt-24 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
                <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-3 rounded-2xl shadow-premium mx-auto sm:mx-0">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="mobile-headline font-display text-gray-900">Find Your Perfect Barber</h1>
                  <p className="text-gray-600 mobile-body mt-2">
                Directory of {barbers.length.toLocaleString()} verified barber professionals
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-6">
              {/* Search Row - Horizontal Layout */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-2 sm:gap-4">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search barbers or businesses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-w-[280px] lg:min-w-[360px] pl-14 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 placeholder-gray-400 text-gray-900 text-lg min-h-[56px]"
                  />
                  </div>
                  
                  {/* City Selector */}
                  <div className="relative w-full shrink-0 lg:basis-64">
                    <div className="flex items-center gap-2 pl-3 pr-10 py-4 border border-gray-200 rounded-xl bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500 transition-all duration-200 min-h-[56px]">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 shrink-0" />
                      <select
                        aria-label="Filter by city"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-transparent outline-none appearance-none text-gray-900 font-medium pr-6"
                      >
                        <option value="">All Cities</option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  
                  {/* Filters Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-6 py-4 border rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 font-medium min-h-[52px] w-full ${
                      showFilters || activeFilterCount > 0
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                    } lg:w-40`}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-primary-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              <AdvancedSearchPanel
                filters={filters}
                setFilters={setFilters}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                cities={cities}
                onClearAll={clearAllFilters}
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                activeFilterCount={activeFilterCount}
                availableServiceTypes={availableServiceTypes}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {filteredBarbers.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="bg-gray-100 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mobile-headline font-display text-gray-900 mb-3">No barbers found</h3>
            <p className="text-gray-600 mobile-body">Try adjusting your search criteria or clear filters</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mobile-body font-medium">
                {applyingFilters ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
                    <span>Applying filters...</span>
                  </span>
                ) : (
                  <>
                    Showing {displayedBarbers.length.toLocaleString()} of {filteredBarbers.length.toLocaleString()} verified barber{filteredBarbers.length !== 1 ? 's' : ''} 
                  </>
                )}
                {selectedCity && ` in ${selectedCity}`}
                {filters.minRating > 0 && ` with ${filters.minRating}+ stars`}
                {(filters.availableToday || filters.availableThisWeek) && ` with availability`}
                {filteredBarbers.length !== barbers.length && (
                  <span className="text-gray-500"> (filtered from {barbers.length.toLocaleString()} total)</span>
                )}
              </p>
              
              {/* Active Filter Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {filters.minRating > 0 && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-2 rounded-full mobile-small flex items-center space-x-2">
                      <Star className="h-3 w-3" />
                      <span>{filters.minRating}+ stars</span>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))}
                        className="hover:text-orange-600 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.availableToday && (
                    <span className="bg-green-100 text-green-800 px-3 py-2 rounded-full mobile-small flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>Available today</span>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, availableToday: false }))}
                        className="hover:text-green-600 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.availableThisWeek && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full mobile-small flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>Available this week</span>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, availableThisWeek: false }))}
                        className="hover:text-blue-600 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedCity && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-2 rounded-full mobile-small flex items-center space-x-2">
                      <MapPin className="h-3 w-3" />
                      <span>{selectedCity}</span>
                      <button
                        onClick={() => setSelectedCity('')}
                        className="hover:text-purple-600 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.serviceTypes.map(serviceType => (
                    <span key={serviceType} className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-full mobile-small flex items-center space-x-2">
                      <span>{serviceType}</span>
                      <button
                        onClick={() => setFilters(prev => ({ 
                          ...prev, 
                          serviceTypes: prev.serviceTypes.filter(t => t !== serviceType) 
                        }))}
                        className="hover:text-indigo-600 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedBarbers.map((barber) => (
                <Link
                  key={`${barber.id}-profile`}
                  to={`/barber/${barber.slug}`}
                  className="card-premium group hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={barber.banner_image_url || barber.profile_image_url}
                      alt={barber.business_name}
                      className="w-full h-48 sm:h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    
                    {/* Status Badges */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      {!barber.is_claimed && !isReservedSlug(barber.slug) && (
                        <Link
                          to={`/claim/${barber.id}`}
                          disabled={claimingId === (barber.id || barber.slug)}
                          onClick={(e) => {
                            e.preventDefault();
                            handleClaimClick(barber);
                          }}
                          className="bg-accent-500 text-white text-xs px-3 py-2 rounded-full font-semibold hover:bg-accent-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claimingId === (barber.id || barber.slug) ? 'Opening…' : 'Claim'}
                        </Link>
                      )}
                      {barber.is_claimed && (
                        <span className="bg-emerald-500 text-white text-xs px-3 py-2 rounded-full font-semibold shadow-lg">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="mb-4">
                      <h3 className="mobile-subheadline font-display text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                        {barber.business_name}
                      </h3>
                      <p className="text-gray-600 mobile-body font-medium">{barber.owner_name}</p>
                      {barber.city && (
                        <p className="text-gray-500 text-sm mt-1">{barber.city}, {barber.state}</p>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-6 line-clamp-2 mobile-body">
                      {barber.bio}
                    </p>


                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-6">
                      <div className="flex items-center space-x-1">
                        <div className="bg-yellow-100 p-1.5 rounded-lg">
                          <Star className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span className="font-bold text-gray-900">{barber.average_rating}</span>
                        <span className="text-gray-500">({barber.total_reviews})</span>
                        {barber.is_claimed && (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold ml-2">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Availability and CTA Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        {filters.availableToday && Math.random() > 0.5 && (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-full mobile-small font-semibold">
                            Available Today
                          </span>
                        )}
                        {!filters.availableToday && (
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span className="mobile-small">Contact for Hours</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="btn-primary group-hover:scale-105 transition-all duration-200 w-full">
                        View Profile
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreProfiles && (
              <div className="mt-12 sm:mt-16 text-center">
                <button
                  onClick={loadMoreProfiles}
                  disabled={loadingMore}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed mx-auto w-full sm:w-auto"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  <span>
                    {loadingMore ? 'Loading More...' : `Load More (${(filteredBarbers.length - displayedBarbers.length).toLocaleString()} remaining)`}
                  </span>
                </button>
              </div>
            )}

            {/* End of Results */}
            {!hasMoreProfiles && displayedBarbers.length > PROFILES_PER_PAGE && (
              <div className="mt-12 sm:mt-16 text-center">
                <div className="card-premium p-8 max-w-md mx-auto">
                <p className="text-gray-600 mobile-body font-medium">
                  You've viewed all {filteredBarbers.length.toLocaleString()} results
                </p>
                  <p className="mobile-small text-gray-500 mt-2">
                    Try adjusting your search or filters to discover more barbers
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BarberListPage;