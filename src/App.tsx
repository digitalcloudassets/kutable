import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { setupGlobalErrorHandling } from './utils/errorHandling';
import { initializeAnalytics, trackPageView } from './utils/analytics';
import ProtectedAdminRoute from './routes/ProtectedAdminRoute';
import HomeGate from './routes/HomeGate';
import AppShellToggle from './components/Layout/AppShellToggle';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

import HomePage from './pages/HomePage';
import BarberListPage from './pages/BarberListPage';
import BarberProfilePage from './pages/BarberProfilePage';
import DashboardPage from './pages/DashboardPage';
import BarberDashboard from './pages/BarberDashboard';
import ProfileSetupPage from './pages/ProfileSetupPage';
import OnboardingPage from './pages/OnboardingPage';
import BarberOnboarding from './pages/BarberOnboarding';
import AdminPage from './pages/AdminPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PricingPage from './pages/PricingPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

import BookingFlow from './components/Booking/BookingFlow';
import LoginForm from './components/Auth/LoginForm';
import SignUpForm from './components/Auth/SignUpForm';
import SignUpSuccessPage from './pages/SignUpSuccessPage';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import BarberOnboardingEngine from './pages/Onboarding/BarberOnboardingEngine';
import { OnboardingGate } from './components/Guards/OnboardingGate';

// Error handler
setupGlobalErrorHandling();

// Analytics tracker
const AnalyticsRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  return <>{children}</>;
};

function App() {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <Router>
      <AnalyticsRouter>
        <AppShellToggle />
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />

          <main className="flex-1">
            <OnboardingGate>
            <Routes>
              <Route path="/" element={<HomeGate />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignUpForm />} />
              <Route path="/signup-success" element={<SignUpSuccessPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/barbers" element={<BarberListPage />} />
              <Route path="/barber/:slug" element={<BarberProfilePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/barber/*" element={<BarberDashboard />} />
              <Route path="/book/:barberSlug/:serviceId?" element={<BookingFlow />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/onboarding/barber" element={<BarberOnboarding />} />
              <Route path="/onboarding/barber" element={<BarberOnboardingEngine />} />
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/booking-success/:bookingId"
                element={<div className="p-8">Booking success page coming soon...</div>}
              />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
            </Routes>
            </OnboardingGate>
          </main>

          <Footer />

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
                fontWeight: 500,
                boxShadow:
                  '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }
            }}
          />
        </div>
      </AnalyticsRouter>
    </Router>
  );
}

export default App;
