import React from 'react';
import Hero from '../components/Home/Hero';
import { 
  Zap, 
  Shield, 
  Clock, 
  Star, 
  ArrowRight,
  Smartphone,
  CreditCard,
  Users,
  CheckCircle,
  Target,
  Scissors,
  Calendar,
  Search,
  Play,
  DollarSign,
  User,
  TrendingUp,
  Sparkles,
  Quote,
  Eye,
  X
} from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      
      {/* Why Barbers Love Kutable */}
      <section className="py-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Why Barbers Love Kutable
          </h2>
          <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
            No monthly fees. No contracts. Just more bookings and instant payouts.
          </p>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            Barbers earn 25% more per client, spend less time texting, and get paid automatically with every booking.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center items-center max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl px-8 py-4">
              <p className="text-emerald-800 font-semibold text-lg">Verified professional network</p>
            </div>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-2xl px-8 py-4">
              <p className="text-primary-800 font-semibold text-lg">Secure payment processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-accent-50 text-accent-700 rounded-full px-6 py-3 mb-6">
              <Star className="h-5 w-5" />
              <span className="font-medium">Barber Success Stories</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Real Results from Real Barbers
            </h2>
          </div>

          {/* Featured Testimonial */}
          <div className="bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200 rounded-3xl p-8 md:p-12 mb-16 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
              <img
                src="https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=200"
                alt="Marcus Thompson"
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-premium"
              />
              <div className="text-center md:text-left">
                <Quote className="h-8 w-8 text-primary-500 mb-4 mx-auto md:mx-0" />
                <blockquote className="text-xl md:text-2xl font-medium text-gray-900 mb-4 leading-relaxed">
                  "Kutable doubled my bookings in the first month. I went from chasing payments to having customers pay upfront. Game changer."
                </blockquote>
                <div>
                  <p className="font-bold text-gray-900">Marcus Thompson</p>
                  <p className="text-gray-600">Elite Cuts Barbershop, Chicago</p>
                  <div className="flex items-center justify-center md:justify-start space-x-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rolling Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center space-x-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">"My customers love the convenience. I love getting paid instantly."</p>
              <p className="font-semibold text-gray-900">David Rodriguez</p>
              <p className="text-gray-500 text-sm">Fresh Fades, Miami</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center space-x-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">"Setup took 2 minutes. First booking came in the same day."</p>
              <p className="font-semibold text-gray-900">James Wilson</p>
              <p className="text-gray-500 text-sm">Classic Cuts, Austin</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center space-x-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">"No more phone tag with customers. Everything's automated."</p>
              <p className="font-semibold text-gray-900">Mike Chen</p>
              <p className="text-gray-500 text-sm">Style Masters, Seattle</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals & Security */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Your Success & Security
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Bank-Level Security</h3>
              <p className="text-gray-600 leading-relaxed">Your money and customer data are protected with enterprise-grade encryption and security.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Stripe-Powered Payouts</h3>
              <p className="text-gray-600 leading-relaxed">Money goes directly to your bank account within 2-3 business days, powered by Stripe.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3">Instant Cash Flow</h3>
              <p className="text-gray-600 leading-relaxed">Get paid when customers book. No waiting, no invoicing, no chasing payments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Sparkles className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">Join the Revolution</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Modernize Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Join thousands of barbers who've transformed their booking process and increased their earnings.
          </p>
          
          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-12">
            <a
              href="/signup?type=barber"
              className="group bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center space-x-3"
            >
              <Scissors className="h-6 w-6 text-primary-600 group-hover:rotate-12 transition-transform" />
              <span>Start Free Profile</span>
              <ArrowRight className="h-5 w-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
            </a>
            
            <a
              href="/how-it-works"
              className="group bg-gradient-to-r from-accent-500 to-accent-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-accent-600 hover:to-accent-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center space-x-3"
            >
              <Play className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>See How It Works</span>
            </a>
          </div>
          
          {/* Microcopy */}
          <p className="text-gray-400 text-lg">
            <strong className="text-white">Free to start.</strong> Takes less than 60 seconds to get started.
          </p>
        </div>
      </section>

      {/* Original How It Works Content - Condensed */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Grow</h2>
            <p className="text-xl text-gray-600">Professional tools included with your free profile</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center group">
              <div className="bg-primary-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Professional Profiles</h3>
              <p className="text-gray-600">Showcase your work with photos, services, and customer reviews.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-accent-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-8 w-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Online Booking</h3>
              <p className="text-gray-600">Customers book and pay instantly, even when you're sleeping.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-yellow-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automatic Payments</h3>
              <p className="text-gray-600">Money hits your bank account automatically. No invoicing required.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile-First Design</h3>
              <p className="text-gray-600">Works perfectly on any device. Share your profile anywhere.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Customer Analytics</h3>
              <p className="text-gray-600">Track earnings, popular services, and customer satisfaction.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Save Hours Weekly</h3>
              <p className="text-gray-600">No more phone tag. Automated confirmations and reminders.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;


// Desktop Mockup Component
const DesktopMockup: React.FC<{
  src: string;
  title: string;
}> = ({ src, title }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <>
      <div 
        className="group cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        {/* Laptop Frame */}
        <div className="relative bg-gray-800 rounded-t-2xl p-3 shadow-premium-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105">
          {/* Screen */}
          <div className="bg-black rounded-t-xl p-1">
            <div className="bg-white rounded-xl overflow-hidden relative aspect-[16/10]">
              <img
                src={src}
                alt={title}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
              />
              
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500"></div>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-xl p-4">
                  <Eye className="h-8 w-8 text-primary-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Laptop Base */}
          <div className="h-6 bg-gray-700 rounded-b-2xl relative">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-2 bg-gray-600 rounded-b-lg"></div>
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-5xl max-h-full">
            <img
              src={src}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl">
                <h4 className="font-bold text-lg">{title}</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};