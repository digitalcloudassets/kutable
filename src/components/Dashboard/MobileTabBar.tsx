import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const barRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () =>
      document.body.classList.contains('app-shell') &&
      document.body.style.setProperty('--tabbar-h', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(update);
    update();
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // More menu items for barbers only
  const moreItems: Item[] = useMemo(() => {
    if (userType !== 'barber') return [];
    return [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'gallery', label: 'Gallery', icon: Camera },
      { id: 'hours', label: 'Business Hours', icon: Clock },
      { id: 'privacy', label: 'Privacy Settings', icon: Settings },
      { 
        id: 'signout', 
        label: 'Sign Out', 
        icon: LogOut,
        onClick: async () => {
          await supabase.auth.signOut();
          navigate('/');
        }
      },
    ];
  }, [userType, navigate]);

  const getTabItems = () => {
    if (userType === 'client') {
      // Client: clean 3-tab layout (no More)
      return [
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    } else {
      // Barber: core tabs + More if we have extra items
      const baseItems = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'services', label: 'Services', icon: Scissors }
      ];

      // Add More if we have extra actions
      if (moreItems.length > 0) {
        baseItems.push({ 
          id: 'more', 
          label: 'More', 
          icon: MoreHorizontal,
          onClick: () => setShowMoreSheet(true)
        });
      }

      return baseItems;
    }
  };

  const tabItems = getTabItems();
  
  const handleTabClick = (item: any) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.id === 'more') {
      setShowMoreSheet(true);
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <>
      <nav
        ref={barRef}
        className="md:hidden fixed inset-x-0 bottom-0 z-40 h-20 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="navigation"
      >
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${tabItems.length}, 1fr)` }}>
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
      </nav>

      {/* More Sheet for Barbers */}
      {userType === 'barber' && showMoreSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button 
            className="absolute inset-0 bg-black/30" 
            onClick={() => setShowMoreSheet(false)} 
            aria-label="Close more menu" 
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">More Options</h3>
            <ul className="space-y-2">
              {moreItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        onTabChange(item.id);
                      }
                      setShowMoreSheet(false);
                    }}
                    className="flex w-full items-center gap-3 p-4 text-left rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <item.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="text-base font-medium text-gray-900">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileTabBar;