import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, TrendingUp, Award, Calendar, Crown, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];


const FeaturedBarbers: React.FC = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBarbers = async () => {
      try {
        const { data, error } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('is_active', true)
          .order('average_rating', { ascending: false })
          .limit(6);

        if (error) throw error;
        setBarbers(data || []);
      } catch (error) {
        console.warn('Supabase not configured, will use CSV data:', error);
        // Data will be loaded from CSV via the mock client
        setBarbers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedBarbers();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Barbers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white"></div>
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 rounded-full px-6 py-3 mb-6">
            <Star className="h-5 w-5" />
            <span className="font-medium">Success Stories</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">
            Barbers Growing with Kutable
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how barbers are modernizing their business and increasing earnings
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center group">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Instant Payments</h3>
            <p className="text-gray-600 leading-relaxed">Get paid when customers book. Money goes directly to your bank account automatically.</p>
          </div>
          <div className="text-center group">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Mobile-First Design</h3>
            <p className="text-gray-600 leading-relaxed">Share your profile link anywhere. Works perfectly on all devices for your customers.</p>
          </div>
          <div className="text-center group">
            <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Business Growth</h3>
            <p className="text-gray-600 leading-relaxed">Track earnings, manage bookings, and build customer relationships with analytics.</p>
          </div>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {barbers.map((barber) => (
            <div key={barber.id} className="card-premium group hover:scale-105 transition-all duration-300">
              <div className="relative overflow-hidden">
                <img
                  src={barber.banner_image_url || barber.profile_image_url || `https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=400`}
                  alt={barber.business_name}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                
                {/* Verified Badge */}
                {barber.is_claimed && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Verified</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-8">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {barber.business_name}
                </h3>
                <p className="text-gray-600 mb-4 font-medium">{barber.owner_name}</p>
                <p className="text-gray-600 mb-6 line-clamp-2 leading-relaxed">
                  {barber.bio || 'Professional barber services'}
                </p>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-yellow-100 p-1.5 rounded-lg">
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="font-bold text-gray-900">{barber.average_rating.toFixed(1)}</span>
                    <span className="text-gray-500">({barber.total_reviews})</span>
                  </div>
                  {barber.city && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{barber.city}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="bg-emerald-100 p-1.5 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-emerald-600 font-semibold text-sm">Accepting Bookings</span>
                  </div>
                  <Link
                    to={`/barber/${barber.slug || barber.id}`}
                    className="btn-primary group-hover:scale-110 transition-all duration-200"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center mt-16">
          <Link
            to="/signup?type=barber"
            className="btn-secondary group mx-auto"
          >
            <span>Join These Success Stories</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBarbers;