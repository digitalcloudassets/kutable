import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './shared/components/layout/Header';
import Footer from './shared/components/layout/Footer';
import HomePage from './features/static-pages/pages/HomePage';
import BarberListPage from './features/barber-profiles/pages/BarberListPage';
import BarberProfilePage from './features/barber-profiles/pages/BarberProfilePage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import BookingFlow from './features/bookings/components/BookingFlow';
import ClaimFlow from './features/barber-profiles/components/ClaimFlow';
import LoginForm from './features/auth/components/LoginForm';
import SignUpForm from './features/auth/components/SignUpForm';
import ProfileSetupPage from './features/onboarding/pages/ProfileSetupPage';
import OnboardingPage from './features/onboarding/pages/OnboardingPage';
import AdminPage from './features/admin/pages/AdminPage';
import AdminLoginPage from './features/admin/pages/AdminLoginPage';
import HowItWorksPage from './features/static-pages/pages/HowItWorksPage';
import PricingPage from './features/static-pages/pages/PricingPage';
import SupportPage from './features/static-pages/pages/SupportPage';
import PrivacyPolicyPage from './features/static-pages/pages/PrivacyPolicyPage';
import TermsOfServicePage from './features/static-pages/pages/TermsOfServicePage';
import ForgotPassword from './features/auth/components/ForgotPassword';
import ResetPassword from './features/auth/components/ResetPassword';

// Protected Admin Route Component
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  
  React.useEffect(() => {
    const checkAuth = () => {
      const adminAuth = localStorage.getItem('admin_authenticated');
      const adminUser = localStorage.getItem('admin_user');
      
      if (adminAuth === 'true' && adminUser) {
        try {
          JSON.parse(adminUser); // Validate JSON
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem('admin_authenticated');
          localStorage.removeItem('admin_user');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
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
  return (
    <Router>
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
      </div>
    </Router>
  );
}

export default App;