import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Scissors, 
  MoreHorizontal, 
  LogOut, 
  Settings,
  BarChart3,
  Camera,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Shield,
  Crown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';

interface MobileTabBarProps {
  userType: 'client' | 'barber';
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

type Item = { 
  id: string;
  label: string; 
  icon: React.ComponentType<any>;
  onClick?: () => void;
};

const MobileTabBar: React.FC<MobileTabBarProps> = ({ 
  userType, 
  activeTab, 
  onTabChange,
  unreadCount = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const getTabItems = () => {
    const isAdmin = !!profile?.is_admin;
    
    if (userType === 'client') {
      // Client: clean 3-tab layout (no scrolling needed)
      return [
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: User },
        ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Crown, onClick: () => navigate('/admin') }] : [])
      ];
    } else {
      // Barber: all tabs in scrollable bar (no More menu)
      return [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'services', label: 'Services', icon: Scissors },
        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
        { id: 'hours', label: 'Hours', icon: Clock },
        { id: 'privacy', label: 'Privacy', icon: Shield },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Crown, onClick: () => navigate('/admin') }] : [])
      ];
    }
  };

  const tabItems = getTabItems();
  const needsScrolling = userType === 'barber'; // Only barbers have enough tabs to need scrolling

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el || !needsScrolling) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    if (!needsScrolling) return;
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateEdges);
    };
  }, [needsScrolling]);

  const nudge = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -140 : 140;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };
  
  const handleTabClick = (item: any) => {
    if (userType === 'barber') {
      // Use URL routing for barber tabs
      navigate(`/dashboard/barber/${item.id}`);
    } else {
      // Use state-based routing for client tabs
      if (item.onClick) {
        item.onClick();
      } else {
        onTabChange(item.id);
      }
    }
  };

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 h-20 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {needsScrolling ? (
        /* Scrollable tab bar for barbers */
        <div className="relative h-full">
          {/* Left fade */}
          {!atStart && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/90 to-transparent z-10" />
              <button
                aria-label="Scroll tabs left"
                onClick={() => nudge('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gray-100/90 shadow-md flex items-center justify-center z-20 border"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
            </>
          )}
          {/* Right fade */}
          {!atEnd && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 to-transparent z-10" />
              <button
                aria-label="Scroll tabs right"
                onClick={() => nudge('right')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gray-100/90 shadow-md flex items-center justify-center z-20 border"
              >
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </>
          )}

          <div
            ref={scrollerRef}
            className="h-full flex items-stretch gap-1 overflow-x-auto no-scrollbar px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item)}
                className={`flex-shrink-0 min-w-[80px] max-w-[80px] flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 relative rounded-xl ${
                  activeTab === item.id
                    ? 'text-primary-600 font-semibold bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <item.icon 
                    className={`h-6 w-6 transition-all duration-200 ${
                      activeTab === item.id ? 'scale-110' : ''
                    }`}
                    strokeWidth={activeTab === item.id ? 2.5 : 2}
                  />
                  {item.id === 'messages' && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="leading-none">{item.label}</span>
                {activeTab === item.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Simple grid for clients (no scrolling needed) */
        <div className="h-full grid grid-cols-3">
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className={`flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 relative ${
                activeTab === item.id
                  ? 'text-primary-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <item.icon 
                  className={`h-6 w-6 transition-all duration-200 ${
                    activeTab === item.id ? 'scale-110' : ''
                  }`}
                  strokeWidth={activeTab === item.id ? 2.5 : 2}
                />
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="leading-none">{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default MobileTabBar;