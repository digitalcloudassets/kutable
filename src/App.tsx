import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { setupGlobalErrorHandling } from './utils/errorHandling';
import { initializeAnalytics, trackPageView } from './utils/analytics';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import BarberListPage from './pages/BarberListPage';
import BarberProfilePage from './pages/BarberProfilePage';
import DashboardPage from './pages/DashboardPage';
import BookingFlow from './components/Booking/BookingFlow';
import ClaimFlow from './components/Barber/ClaimFlow';
import LoginForm from './components/Auth/LoginForm';
import SignUpForm from './components/Auth/SignUpForm';
import ProfileSetupPage from './pages/ProfileSetupPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PricingPage from './pages/PricingPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';

// Set up global error handling
setupGlobalErrorHandling();

// Track page views for SPA routing
const AnalyticsRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  React.useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  
  return <>{children}</>;
};

// Protected Admin Route Component
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  
  React.useEffect(() => {
    const checkAuth = () => {
      const adminAuth = localStorage.getItem('admin_authenticated');
      const adminSession = localStorage.getItem('admin_session');
      
      if (adminAuth === 'true' && adminSession) {
        try {
          const session = JSON.parse(atob(adminSession));
          
          // Enhanced session validation
          if (new Date() <= new Date(session.expires)) {
            // Additional security checks
            if (session.username && session.role && session.loginTime) {
            setIsAuthenticated(true);
            } else {
              localStorage.removeItem('admin_authenticated');
              localStorage.removeItem('admin_session');
              setIsAuthenticated(false);
            }
          } else {
            localStorage.removeItem('admin_authenticated');
            localStorage.removeItem('admin_session');
            setIsAuthenticated(false);
          }
        } catch {
          localStorage.removeItem('admin_authenticated');
          localStorage.removeItem('admin_session');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Check session validity every 5 minutes
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }
  
  return <>{children}</>;
};

function App() {
  // Initialize analytics on app mount
  React.useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <Router>
      <AnalyticsRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/barbers" element={<BarberListPage />} />
            <Route path="/barber/:slug" element={<BarberProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/book/:barberSlug/:serviceId?" element={<BookingFlow />} />
            <Route path="/claim/:barberId" element={<ClaimFlow />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/admin" element={
              <ProtectedAdminRoute>
                <AdminPage />
              </ProtectedAdminRoute>
            } />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/booking-success/:bookingId" element={<div className="p-8">Booking success page coming soon...</div>} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
          </Routes>
        </main>

        <Footer />
        
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
          }}
        />
        
      </div>
      </AnalyticsRouter>
    </Router>
  );
}

export default App;