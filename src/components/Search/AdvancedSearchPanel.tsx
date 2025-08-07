import React from 'react';
import { 
  Star, 
  Calendar, 
  DollarSign, 
  Clock, 
  MapPin, 
  Filter,
  X,
  Sliders
} from 'lucide-react';
import { SearchFilters, RATING_OPTIONS, SORT_OPTIONS, SERVICE_TYPES } from '../../utils/searchFilters';

interface AdvancedSearchPanelProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  cities: string[];
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
  activeFilterCount: number;
  availableServiceTypes: string[];
}

const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({
  filters,
  setFilters,
  selectedCity,
  setSelectedCity,
  cities,
  onClearAll,
  isOpen,
  onClose,
  activeFilterCount,
  availableServiceTypes
}) => {
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const toggleServiceType = (serviceType: string) => {
    const currentTypes = filters.serviceTypes;
    if (currentTypes.includes(serviceType)) {
      updateFilter('serviceTypes', currentTypes.filter(t => t !== serviceType));
    } else {
      updateFilter('serviceTypes', [...currentTypes, serviceType]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Sliders className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-red-600 hover:text-red-500 text-sm font-medium flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <DollarSign className="h-4 w-4 inline mr-1" />
            Price Range
          </label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => updateFilter('priceMin', parseInt(e.target.value) || 0)}
                placeholder="Min"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => updateFilter('priceMax', parseInt(e.target.value) || 200)}
                placeholder="Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="text-xs text-gray-500">
              Range: ${filters.priceMin} - ${filters.priceMax}
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Star className="h-4 w-4 inline mr-1" />
            Minimum Rating
          </label>
          <select
            value={filters.minRating}
            onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            {RATING_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4 inline mr-1" />
            Availability
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.availableToday}
                onChange={(e) => updateFilter('availableToday', e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Available Today</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.availableThisWeek}
                onChange={(e) => updateFilter('availableThisWeek', e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Available This Week</span>
            </label>
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Filter className="h-4 w-4 inline mr-1" />
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Service Types (Full Width) */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Service Types
        </label>
        <div className="flex flex-wrap gap-2">
          {availableServiceTypes.map(serviceType => (
            <button
              key={serviceType}
              onClick={() => toggleServiceType(serviceType)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.serviceTypes.includes(serviceType)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {serviceType}
              {filters.serviceTypes.includes(serviceType) && (
                <X className="h-3 w-3 inline ml-1" />
              )}
            </button>
          ))}
        </div>
        {filters.serviceTypes.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {filters.serviceTypes.length} service type{filters.serviceTypes.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Distance Filter */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <MapPin className="h-4 w-4 inline mr-1" />
          Distance Range: {filters.distance >= 50 ? 'Any Distance' : `${filters.distance} miles`}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          value={filters.distance}
          onChange={(e) => updateFilter('distance', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${(filters.distance / 50) * 100}%, #e5e7eb ${(filters.distance / 50) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5 miles</span>
          <span>50+ miles</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPanel;