import React, { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building, 
  Calendar, 
  BarChart3, 
  Settings, 
  User, 
  Scissors,
  Camera,
  Clock,
  MessageSquare,
  Shield
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import MobileTabBar from './MobileTabBar';

interface DashboardNavigationProps {
  userType: 'client' | 'barber';
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

interface NavButton {
  id: string;
  label: string;
  icon: React.ElementType;
  action?: 'navigate';
  to?: string;
}

const DashboardNavigation = React.memo<DashboardNavigationProps>(({ 
  userType, 
  activeTab, 
  onTabChange,
  unreadCount = 0
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [showScrollHint, setShowScrollHint] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Only show payments/Connect features for barbers
  const isBarber = userType === 'barber';
  const isAdmin = !!profile?.is_admin;

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || userType === 'client') return;

    const checkScrollable = () => {
      const isScrollable = container.scrollWidth > container.clientWidth;
      setShowScrollHint(isScrollable);
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [userType]);

  const handleTabClick = useCallback((buttonId: string, action?: string, to?: string) => {
    if (action === 'navigate' && to) {
      navigate(to);
    } else {
      onTabChange(buttonId);
    }
  }, [onTabChange, navigate]);

  const clientNavButtons: NavButton[] = [
    { id: 'bookings', label: 'My Bookings', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const barberNavButtons: NavButton[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'gallery', label: 'Gallery', icon: Camera },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'privacy', label: 'Privacy', icon: Settings },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield, action: 'navigate' as const, to: '/admin' }] : [])
  ];

  const navButtons = userType === 'client' ? clientNavButtons : barberNavButtons;

  return (
    <>
      {/* Desktop Navigation - Horizontal Scrolling Chips */}
      <div className="hidden md:block bg-white rounded-2xl p-2 shadow-sm border border-gray-100 mb-8 relative">
      {/* Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className={`${
          userType === 'client' 
            ? 'grid grid-cols-3 gap-2' 
            : 'flex space-x-2 lg:grid lg:grid-cols-7 lg:gap-2 lg:space-x-0 overflow-x-auto scrollbar-hide snap-x snap-mandatory lg:overflow-visible'
        }`}
        style={userType === 'barber' ? { 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        } : {}}
      >
        {navButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleTabClick(button.id, button.action, button.to)}
            className={`${
              userType === 'barber' ? 'flex-shrink-0 min-w-[120px] lg:flex-1 snap-start' : 'flex-1'
            } py-4 px-3 lg:px-6 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === button.id
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <button.icon className="h-5 w-5" />
            <span>{button.label}</span>
            {button.id === 'messages' && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Scroll Indicators for Barber Tabs */}
      {userType === 'barber' && showScrollHint && (
        <>
          {/* Left fade gradient */}
          <div className="lg:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 rounded-l-2xl"></div>
          
          {/* Right fade gradient with scroll hint */}
          <div className="lg:hidden absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 rounded-r-2xl flex items-center justify-end pr-3">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          
          {/* Subtle scroll instruction */}
          <div className="lg:hidden absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium opacity-75">
              Swipe to see more →
            </div>
          </div>
        </>
      )}
      </div>

      {/* Mobile Navigation - Bottom Tab Bar */}
      <MobileTabBar 
        userType={userType}
        activeTab={activeTab}
        onTabChange={onTabChange}
        unreadCount={unreadCount}
      />
    </>
  );
});

DashboardNavigation.displayName = 'DashboardNavigation';

export default DashboardNavigation;