import React from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';

interface GoogleMapProps {
  address: string;
  businessName: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  address, 
  businessName, 
  city, 
  state, 
  zipCode 
}) => {
  // Construct full address
  const fullAddress = `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zipCode ? ` ${zipCode}` : ''}`;
  
  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const openInGoogleMaps = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const getDirections = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  // Check if API key is properly configured
  const hasApiKey = apiKey && 
    apiKey !== 'your_google_maps_api_key_here' && 
    apiKey !== 'your_actual_api_key_here' &&
    apiKey.startsWith('AIza') &&
    apiKey.length > 30;

  if (!hasApiKey) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Google Maps API Key Required</span>
          </div>
          <p className="text-yellow-700 text-sm mb-3">
            Add your Google Maps API key to environment variables to enable map display.
          </p>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">{businessName}</p>
            <p className="text-gray-600">{fullAddress}</p>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={openInGoogleMaps}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open in Google Maps</span>
              </button>
              <button
                onClick={getDirections}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
              >
                <Navigation className="h-4 w-4" />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create static map URL with proper encoding
  const encodedAddress = encodeURIComponent(fullAddress);
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${encodedAddress}&` +
    `zoom=16&` +
    `size=600x300&` +
    `scale=2&` +
    `maptype=roadmap&` +
    `markers=color:orange%7Csize:mid%7C${encodedAddress}&` +
    `style=feature:poi%7Celement:labels%7Cvisibility:off&` +
    `style=feature:administrative%7Celement:labels%7Cvisibility:on&` +
    `key=${apiKey}`;

  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    console.log('Static map image failed to load. URL:', staticMapUrl);
    console.log('This usually indicates:');
    console.log('1. Static Maps API is not enabled in Google Cloud Console');
    console.log('2. API key has referrer restrictions that block localhost');
    console.log('3. Billing is not enabled for the Google Cloud project');
    console.log('4. Daily quota has been exceeded');
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('Static map loaded successfully for:', businessName);
    setImageError(false);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
      
      <div className="space-y-4">
        <div>
          <p className="font-medium text-gray-900">{businessName}</p>
          <p className="text-gray-600">{fullAddress}</p>
        </div>

        {/* Static Map Image */}
        <div className="relative">
          {!imageError ? (
            <img
              src={staticMapUrl}
              alt={`Map showing location of ${businessName}`}
              className="w-full h-64 rounded-lg border border-gray-200 object-cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : (
            /* Fallback content when image fails */
            <div className="w-full h-64 rounded-lg border border-gray-200 bg-gray-100 flex flex-col items-center justify-center">
              <MapPin className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-600 text-sm mb-2">Map image unavailable</p>
              <p className="text-gray-500 text-xs text-center px-4">
                Check console for detailed error information
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={openInGoogleMaps}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open in Google Maps</span>
          </button>
          <button
            onClick={getDirections}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <Navigation className="h-4 w-4" />
            <span>Get Directions</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;