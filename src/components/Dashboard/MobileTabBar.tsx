import React from 'react';
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Scissors, 
  BarChart3,
  Camera,
  Clock,
  Settings
} from 'lucide-react';

interface MobileTabBarProps {
  userType: 'client' | 'barber';
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ 
  userType, 
  activeTab, 
  onTabChange,
  unreadCount = 0
}) => {
  const getTabItems = () => {
    if (userType === 'client') {
      return [
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    } else {
      return [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'services', label: 'Services', icon: Scissors },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
      ];
    }
  };

  const tabItems = getTabItems();

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 h-20 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-2 pb-safe">
      <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${tabItems.length}, 1fr)` }}>
        {tabItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 relative ${
              activeTab === id
                ? 'text-primary-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative">
              <Icon 
                className={`h-6 w-6 transition-all duration-200 ${
                  activeTab === id ? 'scale-110' : ''
                }`}
                strokeWidth={activeTab === id ? 2.5 : 2}
              />
              {id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="leading-none">{label}</span>
            {activeTab === id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;