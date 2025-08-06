import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  Calendar, 
  BarChart3, 
  Settings, 
  User, 
  Scissors 
} from 'lucide-react';

interface DashboardNavigationProps {
  userType: 'client' | 'barber';
  activeTab: string;
  onTabChange: (tab: string) => void;
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
  onTabChange 
}) => {
  const navigate = useNavigate();

  const handleTabClick = useCallback((buttonId: string, action?: string, to?: string) => {
    if (action === 'navigate' && to) {
      navigate(to);
    } else {
      onTabChange(buttonId);
    }
  }, [onTabChange, navigate]);

  const clientNavButtons: NavButton[] = [
    { id: 'bookings', label: 'My Bookings', icon: Calendar },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'barbers', label: 'Find Barbers', icon: Scissors, action: 'navigate', to: '/barbers' }
  ];

  const barberNavButtons: NavButton[] = [
    { id: 'profile', label: 'Profile', icon: Building },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'privacy', label: 'Privacy', icon: Settings }
  ];

  const navButtons = userType === 'client' ? clientNavButtons : barberNavButtons;

  return (
    <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 mb-8">
      <div className={`grid gap-2 ${
        userType === 'client' 
          ? 'grid-cols-3' 
          : 'grid-cols-2 lg:grid-cols-4'
      }`}>
        {navButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleTabClick(button.id, button.action, button.to)}
            className={`flex-1 py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === button.id
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <button.icon className="h-5 w-5" />
            <span>{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

DashboardNavigation.displayName = 'DashboardNavigation';

export default DashboardNavigation;