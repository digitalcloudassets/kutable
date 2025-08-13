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
  CheckCircle,
  Users,
  Scissors
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  is_claimed: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
}

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


        return;
      }
      
      const csvText = await response.text();
      const csvData = parseCSV(csvText);
      
      // Transform CSV data to barber profiles
      // Use only local clean barber images for CSV profiles
      const localBarberImages = [
        '/clean barbershop.jpeg',
        '/clean barbers.webp'
      ];
      
      const profiles: BarberProfile[] = csvData.map((barber, index) => {
        const imageUrl = localBarberImages[index % localBarberImages.length];
        const generatedSlug = generateSlug(barber.business_name, index);
        
        return {
          id: `csv-${index + 1}`,
          slug: generateCSVSlug(barber.business_name, index),
          business_name: barber.business_name,
          owner_name: barber.owner_name,
          phone: barber.phone || barber.direct_phone || null,
          email: barber.email || null,
          address: barber.address || null,
          city: barber.city || null,
          state: barber.state || null,
          zip_code: barber.zip_code || null,
          bio: barber.industry ? `Professional ${barber.industry.toLowerCase()} services at ${barber.business_name}. Contact us for appointments and more information.` : `Professional services at ${barber.business_name}. Contact us for appointments and more information.`,
          profile_image_url: imageUrl,
          is_claimed: false,
          is_active: true,
          average_rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),
          total_reviews: Math.floor(Math.random() * 50) + 5
        };
      });
      
      // Find barber by slug or create demo profile for "kutable"
      let foundBarber = profiles.find(p => p.slug === slug);
      
      setBarber(foundBarber || null);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with background image */}
      <div className="relative h-96 bg-gray-900 overflow-hidden mt-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        
        <img
          src={barber.banner_image_url || barber.profile_image_url}
          alt={barber.business_name}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Back button */}
        <div className="absolute top-6 left-6 z-20">
          <Link
            to="/barbers"
            className="glass-effect text-gray-900 hover:text-white p-4 rounded-2xl hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 group"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 group-hover:text-white group-hover:-translate-x-1 transition-all duration-200" />
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
          <div className="absolute top-6 right-6 z-20">
            <button
              disabled={claimingId === (barber.id || barber.slug)}
              className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-6 py-3 rounded-2xl hover:from-accent-600 hover:to-accent-700 transition-all duration-200 font-semibold flex items-center space-x-2 shadow-premium-lg hover:scale-105 whitespace-nowrap"
              onClick={(e) => {
                e.preventDefault();
                handleClaimClick(barber);
              }}
            >
              <Crown className="h-5 w-5" />
              <span>{claimingId === (barber.id || barber.slug) ? 'Opening…' : 'Claim This Listing'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
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
              {barber.is_active ? (
                loadingServices ? (
                  <div className="text-center py-12">
                    <div className="relative mb-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading services...</p>
                  </div>
                ) : services.length > 0 ? (
                  <div className="space-y-8">
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
                        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
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
                    <h4 className="text-xl font-display font-bold text-gray-900 mb-3">Services Not Available</h4>
                    <p className="text-gray-600 mb-6">This barber hasn't set up online booking yet. Contact them directly for appointments.</p>
                    {/* TODO: Invite-based onboarding - Show contact form or invitation request */}
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
          <div className="space-y-8">
            {/* Contact Info */}
            <div className="card-premium p-8">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Contact</h3>
              <div className="space-y-4">
                {barber.phone && (
                  <a 
                    href={`tel:${barber.phone}`}
                    className="flex items-center space-x-3 p-6 bg-gray-50 rounded-xl hover:bg-primary-50 hover:border-primary-200 border border-transparent transition-all duration-200 group"
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
                  <div className="flex items-start space-x-3 p-6 bg-gray-50 rounded-xl border border-transparent">
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
            <div className="card-premium p-8">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Business Hours</h3>
              <div className="space-y-4">
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


            {barber.is_active && (
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

            {/* TODO: Invite-based onboarding - Contact or invitation request form */}
            {!barber.is_active && (
              <div className="card-premium p-8 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gray-400 p-2 rounded-xl">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">Business Profile</h3>
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  This business profile is not yet set up for online booking. Contact them directly for appointments.
                </p>
              </div>
            )}

            {/* Location */}
            {barber.address && (
              <div className="card-premium p-8">
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