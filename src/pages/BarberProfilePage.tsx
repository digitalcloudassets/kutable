import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  Clock, 
  Calendar, 
  ArrowLeft,
  UserPlus,
  Building,
  CheckCircle,
  Crown,
  Users,
  Scissors
} from 'lucide-react';
import { barberDataService } from '../shared/services/barberDataService';
import { ParsedBarberProfile } from '../shared/utils/csvParser';
import { isReservedSlug } from '../shared/utils/reservedSlugs';
import GoogleMap from '../components/Maps/GoogleMap';

type BarberProfile = ParsedBarberProfile;

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  deposit_required: boolean;
  deposit_amount: number;
  is_active: boolean;
}

const BarberProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchBarberData();
    }
  }, [slug]);

  useEffect(() => {
    if (barber && barber.is_claimed) {
      fetchServices();
    }
  }, [barber]);

  const fetchServices = async () => {
    if (!barber) return;
    
    setLoadingServices(true);
    try {
      const supabase = barberDataService.getSupabaseClient();
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barber.id)
        .eq('is_active', true)
        .order('price');

      if (error && error.message !== 'Connect to Supabase for database tables') {
        throw error;
      }

      setServices(servicesData || []);
    } catch (error) {
      console.warn('Could not fetch services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchBarberData = async () => {
    try {
      console.log('🔍 Loading barber profile for slug:', slug);
      
      const { data: foundBarber, error } = await barberDataService.getBarberProfile(slug);
      
      if (error && error.code === 'RESERVED_SLUG') {
        console.log(`🚫 Reserved slug "${slug}" requested but no database profile found`);
      }
      
      setBarber(foundBarber);
    } catch (error) {
      console.error('Error fetching barber data:', error);
      setBarber(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200"></div>
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Barber not found</h2>
          <p className="text-gray-600 mb-6">The barber profile you're looking for doesn't exist.</p>
          <Link
            to="/barbers"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Browse All Barbers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header with background image */}
      <div className="relative h-96 bg-gray-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        
        <img
          src={barber.banner_image_url || barber.profile_image_url}
          alt={barber.business_name}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Link
            to="/barbers"
            className="glass-effect text-white p-4 rounded-2xl hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Barbers</span>
          </Link>
        </div>

        {/* Barber info overlay */}
        <div className="absolute bottom-8 left-6 right-6 text-white">
          <div className="max-w-4xl">
            <div className="flex items-center space-x-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-display font-bold">{barber.business_name}</h1>
              {!barber.is_claimed && !isReservedSlug(barber.slug) && (
                <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Unclaimed
                </span>
              )}
              {barber.is_claimed && (
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="text-xl text-white/90 mb-4 font-medium">{barber.owner_name}</p>
            <div className="flex items-center space-x-6 text-lg">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <div className="bg-yellow-400 p-1.5 rounded-lg">
                  <Star className="h-4 w-4 text-gray-900" />
                </div>
                <span className="font-bold">{barber.average_rating.toFixed(1)}</span>
                <span className="text-white/70">({barber.total_reviews} reviews)</span>
              </div>
              {barber.city && (
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <MapPin className="h-4 w-4 text-white/80" />
                  <span className="font-medium">{barber.city}, {barber.state}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Claim Button */}
        {!barber.is_claimed && !isReservedSlug(barber.slug) && (
          <div className="absolute top-6 right-6">
            <Link
              to={`/claim/${barber.id}`}
              className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-8 py-4 rounded-2xl hover:from-accent-600 hover:to-accent-700 transition-all duration-200 font-semibold flex items-center space-x-3 shadow-premium-lg hover:scale-105"
            >
              <Crown className="h-5 w-5" />
              <span>Claim This Listing</span>
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* About Section */}
            <div className="card-premium p-8 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-primary-100 p-2 rounded-xl">
                  <Building className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-3xl font-display font-bold text-gray-900">About {barber.business_name}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg mb-8">
                {barber.bio}
              </p>

              {/* Business Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                <div className="text-center group">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{barber.average_rating.toFixed(1)}</p>
                  <p className="text-gray-600 font-medium">Average Rating</p>
                </div>
                <div className="text-center group">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{barber.total_reviews}</p>
                  <p className="text-gray-600 font-medium">Total Reviews</p>
                </div>
                <div className="text-center group">
                  <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">Pro</p>
                  <p className="text-gray-600 font-medium">Verified Barber</p>
                </div>
              </div>
            </div>

            {/* Barber Profile Image Card */}
            <div className="card-premium p-8 mb-8 text-center">
              <div className="relative inline-block">
                <img
                  src={barber.profile_image_url}
                  alt={barber.owner_name}
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-premium-lg"
                />
                <div className="absolute -bottom-2 -right-2 bg-accent-500 text-white p-2 rounded-xl shadow-lg">
                  <Scissors className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mt-6 mb-2">{barber.owner_name}</h3>
              <p className="text-gray-600 font-medium">Master Barber & Stylist</p>
            </div>

            {/* Services Section */}
            <div className="card-premium p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-primary-100 p-2 rounded-xl">
                  <Scissors className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900">Services & Pricing</h3>
              </div>
              {barber.is_claimed ? (
                loadingServices ? (
                  <div className="text-center py-12">
                    <div className="relative mb-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading services...</p>
                  </div>
                ) : services.length > 0 ? (
                  <div className="space-y-6">
                    {services.map((service) => (
                      <div key={service.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-primary-300 hover:shadow-md transition-all duration-200 group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-display font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{service.name}</h4>
                            {service.description && (
                              <p className="text-gray-600 mt-2">{service.description}</p>
                            )}
                          </div>
                          <div className="text-right bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-3xl font-bold text-gray-900">${service.price}</p>
                            {service.deposit_required && (
                              <p className="text-sm text-accent-600 font-medium">${service.deposit_amount} deposit</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <div className="bg-gray-200 p-1.5 rounded-lg">
                                <Clock className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-gray-700">{service.duration_minutes} min</span>
                            </div>
                          </div>
                          <Link
                            to={`/book/${barber.slug}/${service.id}`}
                            className="btn-primary hover:scale-105 transition-all duration-200"
                          >
                            Book Now
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-10 w-10 text-gray-400" />
                    </div>
                    <h4 className="text-xl font-display font-bold text-gray-900 mb-2">No services available</h4>
                    <p className="text-gray-600">Please contact the business directly for service information.</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="bg-yellow-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-yellow-600" />
                  </div>
                  <h4 className="text-xl font-display font-bold text-gray-900 mb-3">Services Coming Soon</h4>
                  <p className="text-gray-600 mb-6">Services and pricing will be available after this profile is claimed.</p>
                  <Link
                    to={`/claim/${barber.id}`}
                    className="btn-secondary group"
                  >
                    <Crown className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    <span>Claim Profile to Add Services</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="card-premium p-6">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Contact</h3>
              <div className="space-y-4">
                {barber.phone && (
                  <a 
                    href={`tel:${barber.phone}`}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl hover:bg-primary-50 hover:border-primary-200 border border-transparent transition-all duration-200 group"
                  >
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Phone className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Call Now</p>
                      <p className="text-gray-600">
                        {formatPhoneNumber(barber.phone)}
                      </p>
                    </div>
                  </a>
                )}
                {barber.address && (
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-transparent">
                    <div className="bg-gray-200 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Location</p>
                      <div className="text-gray-600">
                        <p>{barber.address}</p>
                        {barber.city && barber.state && (
                          <p>{barber.city}, {barber.state} {barber.zip_code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div className="card-premium p-6">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Business Hours</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Monday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Tuesday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Wednesday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Thursday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Friday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Saturday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Sunday</span>
                  <span className="text-gray-500 font-medium">Contact for hours</span>
                </div>
              </div>
            </div>

            {/* Claim Your Business */}
            {!barber.is_claimed && !isReservedSlug(barber.slug) && (
              <div className="card-premium p-8 bg-gradient-to-br from-accent-50 to-primary-50 border border-accent-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-accent-500 p-2 rounded-xl">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">Is This Your Business?</h3>
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Claim this profile to start accepting online bookings, manage your services, and build your reputation on Kutable.
                </p>
                <Link
                  to={`/claim/${barber.id}`}
                  className="btn-accent w-full justify-center mb-4"
                >
                  <Crown className="h-5 w-5" />
                  <span>Claim This Listing</span>
                </Link>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Free to claim</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Start accepting bookings</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Manage services & pricing</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Build customer reviews</span>
                  </div>
                </div>
              </div>
            )}

            {barber.is_claimed && (
              <div className="card-premium p-8 bg-gradient-to-br from-emerald-50 to-primary-50 border border-emerald-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-emerald-500 p-2 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">Verified Business</h3>
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  This is a verified barber profile. Book appointments and contact them directly with confidence.
                </p>
                <Link
                  to={`/book/${barber.slug}`}
                  className="btn-accent w-full justify-center"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Book Appointment</span>
                </Link>
              </div>
            )}

            {/* Location */}
            {barber.address && (
              <div className="card-premium p-6">
                <GoogleMap
                  address={barber.address}
                  businessName={barber.business_name}
                  city={barber.city || undefined}
                  state={barber.state || undefined}
                  zipCode={barber.zip_code || undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberProfilePage;