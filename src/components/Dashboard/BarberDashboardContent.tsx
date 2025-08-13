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
import { Crown, Calendar, BarChart3 } from 'lucide-react';

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
       barber ? (
        <BarberProfile 
          barber={barber} 
          onUpdate={onBarberUpdate}
          triggerEdit={triggerEdit}
          setTriggerEdit={onTriggerEditChange}
        />
       ) : (
         <div className="card-premium p-8 text-center">
           <div className="bg-yellow-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <Crown className="h-10 w-10 text-yellow-600" />
           </div>
           <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Complete Your Profile Claim</h3>
           <p className="text-gray-600 mb-8">
             It looks like you're in the middle of claiming a barber profile. Please complete the claim process to access your dashboard.
           </p>
           <div className="space-y-4">
             <a href="/barbers" className="btn-primary">
               Find Profile to Claim
             </a>
             <p className="text-sm text-gray-500">
               Or contact support if you need assistance with your claim.
             </p>
           </div>
         </div>
       )
      )}
      
      {activeTab === 'bookings' && (
        barber ? (
          <BookingsManagement barberId={barber.id} />
        ) : (
          <div className="card-premium p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Profile Setup</h3>
            <p className="text-gray-600">Complete your barber profile to start managing bookings.</p>
          </div>
        )
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
        barber ? (
          <Analytics barberId={barber.id} />
        ) : (
          <div className="card-premium p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Unavailable</h3>
            <p className="text-gray-600">Complete your profile setup to view analytics.</p>
          </div>
        )
      )}
      
      {activeTab === 'services' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <Scissors className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Manage Services</h3>
          </div>
          {barber ? (
            <ServicesManagement barberId={barber.id} />
          ) : (
            <div className="text-center py-12">
              <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Services Management</h3>
              <p className="text-gray-600">Complete your profile setup to add services.</p>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'gallery' && (
        <div className="space-y-8 animate-fade-in-up">
         {barber ? (
           <>
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
           </>
         ) : (
           <div className="card-premium p-8 text-center">
             <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-gray-900 mb-2">Gallery Management</h3>
             <p className="text-gray-600">Complete your profile setup to upload photos and videos.</p>
           </div>
         )}
        </div>
      )}
      
      {activeTab === 'hours' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 p-2 rounded-xl">
                <Clock className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Business Hours</h3>
            </div>
           {barber && (
            <button
              type="button"
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
              onClick={saveAvailability}
            >
              Save Changes
            </button>
           )}
          </div>

         {barber ? (
          <div className="space-y-6">
            {dayNames.map((dayName, dayIndex) => (
              <div key={dayIndex} className="rounded-2xl bg-gray-50 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Left: Day label */}
                  <div className="min-w-[96px] text-lg font-semibold text-gray-900">
                    {dayName}
                  </div>

                  {/* Middle: Open toggle */}
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 accent-blue-600" 
                      checked={availability[dayIndex]?.isOpen || false}
                      onChange={(e) => updateAvailability(dayIndex, 'isOpen', e.target.checked)}
                    />
                    <span className="text-gray-700 font-medium">Open</span>
                  </label>

                  {/* Right: time inputs — take full width on mobile, fixed width on sm+ */}
                  {availability[dayIndex]?.isOpen && (
                    <div className="ms-auto flex w-full gap-3 sm:w-auto">
                      <input
                        type="time"
                        className="w-full sm:w-40 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                        value={availability[dayIndex].startTime}
                        onChange={(e) => updateAvailability(dayIndex, 'startTime', e.target.value)}
                      />
                      <input
                        type="time"
                        className="w-full sm:w-40 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                        value={availability[dayIndex].endTime}
                        onChange={(e) => updateAvailability(dayIndex, 'endTime', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
         ) : (
           <div className="text-center py-12">
             <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-gray-900 mb-2">Business Hours</h3>
             <p className="text-gray-600">Complete your profile setup to set your business hours.</p>
           </div>
         )}
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
         {barber ? (
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
         ) : (
           <div className="text-center py-12">
             <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Settings</h3>
             <p className="text-gray-600">Complete your profile setup to manage privacy settings.</p>
           </div>
         )}
        </div>
      )}
    </div>
  );
});

BarberDashboardContent.displayName = 'BarberDashboardContent';

export default BarberDashboardContent;