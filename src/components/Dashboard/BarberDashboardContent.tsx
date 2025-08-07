import React, { useCallback } from 'react';
import BarberProfile from './BarberProfile';
import BookingsManagement from './BookingsManagement';
import Analytics from './Analytics';
import ConsentManagement from '../Client/ConsentManagement';
import { Settings, Scissors, Camera, ImageIcon, Clock, Save } from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { Database } from '../../lib/supabase';
import ServicesManagement from './ServicesManagement';
import MediaUpload from '../Gallery/MediaUpload';
import MediaGallery from '../Gallery/MediaGallery';
import MessagingDashboard from '../Messaging/MessagingDashboard';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

interface BarberDashboardContentProps {
  activeTab: string;
  barber: Barber;
  user: any;
  onBarberUpdate: () => void;
  triggerEdit: boolean;
  onTriggerEditChange: (trigger: boolean) => void;
}

const BarberDashboardContent = React.memo<BarberDashboardContentProps>(({ 
  activeTab,
  barber,
  user,
  onBarberUpdate,
  triggerEdit,
  onTriggerEditChange
}) => {
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = React.useState(0);
  const [availability, setAvailability] = React.useState<{
    [key: number]: {
      isOpen: boolean;
      startTime: string;
      endTime: string;
    };
  }>({
    0: { isOpen: false, startTime: '09:00', endTime: '17:00' },
    1: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    2: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    3: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    4: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    5: { isOpen: true, startTime: '09:00', endTime: '18:00' },
    6: { isOpen: true, startTime: '08:00', endTime: '17:00' }
  });

  const handleConsentUpdate = useCallback(() => {
    onBarberUpdate();
  }, [onBarberUpdate]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const saveAvailability = async () => {
    try {
      // Delete existing availability
      await supabase
        .from('availability')
        .delete()
        .eq('barber_id', barber.id);

      // Insert new availability
      const availabilityInserts = Object.entries(availability)
        .filter(([_, dayData]) => dayData.isOpen)
        .map(([day, dayData]) => ({
          barber_id: barber.id,
          day_of_week: parseInt(day),
          start_time: dayData.startTime,
          end_time: dayData.endTime,
          is_available: true
        }));

      if (availabilityInserts.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(availabilityInserts);

        if (error) throw error;
      }

      NotificationManager.success('Business hours updated successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      NotificationManager.error('Failed to save business hours. Please try again.');
    }
  };

  const updateAvailability = (day: number, field: string, value: any) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };
  return (
    <div className="animate-fade-in-up">
      {activeTab === 'profile' && (
        <BarberProfile 
          barber={barber} 
          onUpdate={onBarberUpdate}
          triggerEdit={triggerEdit}
          setTriggerEdit={onTriggerEditChange}
        />
      )}
      
      {activeTab === 'bookings' && (
        <BookingsManagement barberId={barber.id} />
      )}
      
      {activeTab === 'messages' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <MessageSquare className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Customer Messages</h3>
          </div>
          <MessagingDashboard />
        </div>
      )}
      
      {activeTab === 'analytics' && (
        <Analytics barberId={barber.id} />
      )}
      
      {activeTab === 'services' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <Scissors className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Manage Services</h3>
          </div>
          <ServicesManagement barberId={barber.id} />
        </div>
      )}
      
      {activeTab === 'gallery' && (
        <div className="space-y-8 animate-fade-in-up">
          <div className="card-premium p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-primary-100 p-2 rounded-xl">
                <Camera className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Upload New Media</h3>
            </div>
            <MediaUpload 
              barberId={barber.id} 
              onUploadComplete={() => {
                setGalleryRefreshTrigger(prev => prev + 1);
              }} 
            />
          </div>

          <div className="card-premium p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-accent-100 p-2 rounded-xl">
                <ImageIcon className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Your Gallery</h3>
            </div>
            <MediaGallery 
              barberId={barber.id} 
              isOwner={true}
              refreshTrigger={galleryRefreshTrigger}
              onMediaUpdate={() => {
                setGalleryRefreshTrigger(prev => prev + 1);
              }}
            />
          </div>
        </div>
      )}
      
      {activeTab === 'hours' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-xl">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Business Hours</h3>
            </div>
            <button
              onClick={saveAvailability}
              className="btn-primary"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="space-y-6">
            {dayNames.map((dayName, dayIndex) => (
              <div key={dayIndex} className="flex items-center space-x-6 p-6 border border-gray-100 rounded-2xl bg-gray-50">
                <div className="w-32">
                  <span className="font-semibold text-gray-900 text-lg">{dayName}</span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availability[dayIndex]?.isOpen || false}
                    onChange={(e) => updateAvailability(dayIndex, 'isOpen', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-primary-500"
                  />
                  <span className="ml-3 font-medium text-gray-700">Open</span>
                </label>

                {availability[dayIndex]?.isOpen && (
                  <div className="flex items-center space-x-4">
                    <input
                      type="time"
                      value={availability[dayIndex].startTime}
                      onChange={(e) => updateAvailability(dayIndex, 'startTime', e.target.value)}
                      className="input-premium"
                    />
                    <span className="text-gray-500 font-medium">to</span>
                    <input
                      type="time"
                      value={availability[dayIndex].endTime}
                      onChange={(e) => updateAvailability(dayIndex, 'endTime', e.target.value)}
                      className="input-premium"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'privacy' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <Settings className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Privacy & Communication Preferences</h3>
          </div>
          <ConsentManagement 
            userId={user?.id}
            userType="barber"
            currentConsent={{
              communication: barber.communication_consent ?? false,
              sms: barber.sms_consent ?? false,
              email: barber.email_consent ?? false
            }}
            onConsentUpdate={handleConsentUpdate}
          />
        </div>
      )}
    </div>
  );
});

BarberDashboardContent.displayName = 'BarberDashboardContent';

export default BarberDashboardContent;