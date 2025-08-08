// Google Analytics 4 integration for Kutable
// Simple, privacy-focused analytics tracking

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Check if GA is properly configured
const isGAEnabled = GA_MEASUREMENT_ID && 
  GA_MEASUREMENT_ID !== 'GA_MEASUREMENT_ID' && 
  GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' &&
  GA_MEASUREMENT_ID.startsWith('G-');

export const initializeAnalytics = () => {
  if (!isGAEnabled) {
    console.info('Google Analytics not configured - tracking disabled');
    return;
  }

  // Initialize GA4 if not already done
  if (typeof window.gtag === 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
      // Privacy-focused settings
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }
};

// Track page views (for SPA routing)
export const trackPageView = (path: string, title?: string) => {
  if (!isGAEnabled || typeof window.gtag === 'undefined') return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.origin + path
  });
};

// Track booking events
export const trackBookingEvent = (eventName: string, barberName: string, serviceName: string, amount: number) => {
  if (!isGAEnabled || typeof window.gtag === 'undefined') return;

  window.gtag('event', eventName, {
    event_category: 'booking',
    event_label: `${barberName} - ${serviceName}`,
    value: Math.round(amount),
    currency: 'USD'
  });
};

// Track barber profile views
export const trackBarberProfileView = (barberName: string, city: string) => {
  if (!isGAEnabled || typeof window.gtag === 'undefined') return;

  window.gtag('event', 'profile_view', {
    event_category: 'engagement',
    event_label: barberName,
    custom_parameters: {
      barber_city: city
    }
  });
};

// Track user signups
export const trackUserSignup = (userType: 'client' | 'barber') => {
  if (!isGAEnabled || typeof window.gtag === 'undefined') return;

  window.gtag('event', 'sign_up', {
    event_category: 'engagement',
    event_label: userType,
    custom_parameters: {
      user_type: userType
    }
  });
};

// Track search usage
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  if (!isGAEnabled || typeof window.gtag === 'undefined') return;

  window.gtag('event', 'search', {
    event_category: 'engagement',
    search_term: searchTerm,
    custom_parameters: {
      results_count: resultsCount
    }
  });
};

export { isGAEnabled };