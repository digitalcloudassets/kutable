import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  setupGlobalErrorHandling,
  initializeAnalytics,
  trackPageView
} from './utils';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import {
  HomePage,
  BarberListPage,
  BarberProfilePage,
  DashboardPage,
  ProfileSetupPage,
  OnboardingPage,
  AdminPage,
  AdminLoginPage,
  HowItWorksPage,
  PricingPage,
  SupportPage,
  PrivacyPolicyPage,
  TermsOfServicePage
} from './pages';
import {
  BookingFlow,
  LoginForm,
  SignUpForm,
  ForgotPassword,
  ResetPassword
} from './components/Auth';
import AIChatWidget from './components/Chat/AIChatWidget';

// Error handler
setupGlobalErrorHandling();

// Hide AI widget on certain routes
const ChatWidgetGate: React.FC = () => {
  const location = useLocation();
  const hideOnRoutes = [/^\/admin-login$/, /^\/admin($|\/)/];
  return hideOnRoutes.some((r) => r.test(location.pathname)) ? null : <AIChatWidget />;
};

// Analytics tracker
const AnalyticsRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  return <>{children}</>;
};

// Admin route guard
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('admin_authenticated') === 'true';
      const session = localStorage.getItem('admin_session');
      if (!auth || !session) return setIsAuthenticated(false);

      try {
        const decoded = JSON.parse(atob(session));
        const valid = decoded?.expires && new Date() <= new Date(decoded.expires);
        const complete = decoded?.username && decoded?.role && decoded?.loginTime;
        if (valid && complete) return setIsAuthenticated(true);
      } catch {}

      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_session');
      setIsAuthenticated(false);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 300000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 rounded-full animate-spin border-b-2 border-orange-500" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <AdminLoginPage />;
};

function App() {
  useEffect(() => {
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
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="/admin-login" element={<AdminLoginPage />} />
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

          <ChatWidgetGate />
        </div>
      </AnalyticsRouter>
    </Router>
  );
}

export default App;
