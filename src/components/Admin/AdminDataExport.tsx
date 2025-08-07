import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  Loader,
  CheckCircle 
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

interface ExportOptions {
  type: 'bookings' | 'revenue' | 'barbers' | 'customers';
  dateRange: 'last_month' | 'last_3_months' | 'last_6_months' | 'custom';
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'json';
}

const AdminDataExport: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    type: 'bookings',
    dateRange: 'last_month',
    format: 'csv'
  });
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportHistory, setExportHistory] = useState<Array<{
    type: string;
    date: string;
    records: number;
  }>>([]);

  const exportTypes = [
    { 
      id: 'bookings', 
      label: 'Bookings Data', 
      icon: Calendar,
      description: 'All booking records with customer and service details'
    },
    { 
      id: 'revenue', 
      label: 'Revenue Report', 
      icon: DollarSign,
      description: 'Financial data including platform fees and payouts'
    },
    { 
      id: 'barbers', 
      label: 'Barber Directory', 
      icon: Users,
      description: 'Complete barber profiles and business information'
    },
    { 
      id: 'customers', 
      label: 'Customer Data', 
      icon: Users,
      description: 'Customer profiles and booking history'
    }
  ];

  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'last_month':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1))
        };
      case 'last_3_months':
        return {
          start: startOfMonth(subMonths(now, 3)),
          end: endOfMonth(subMonths(now, 1))
        };
      case 'last_6_months':
        return {
          start: startOfMonth(subMonths(now, 6)),
          end: endOfMonth(subMonths(now, 1))
        };
      case 'custom':
        return {
          start: exportOptions.startDate || subMonths(now, 1),
          end: exportOptions.endDate || now
        };
      default:
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1))
        };
    }
  };

  const exportData = async (type: string) => {
    setExporting(type);
    
    try {
      const { start, end } = getDateRange(exportOptions.dateRange);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'bookings':
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              appointment_date,
              appointment_time,
              status,
              total_amount,
              platform_fee,
              created_at,
              barber_profiles(business_name, owner_name, city, state),
              client_profiles(first_name, last_name, email, phone),
              services(name, duration_minutes)
            `)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)
            .order('appointment_date', { ascending: false });

          if (bookingsError) throw bookingsError;
          
          data = (bookingsData || []).map(booking => ({
            booking_id: booking.id,
            date: booking.appointment_date,
            time: booking.appointment_time,
            status: booking.status,
            amount: booking.total_amount,
            platform_fee: booking.platform_fee,
            barber_business: booking.barber_profiles?.business_name,
            barber_owner: booking.barber_profiles?.owner_name,
            barber_location: `${booking.barber_profiles?.city}, ${booking.barber_profiles?.state}`,
            customer_name: `${booking.client_profiles?.first_name} ${booking.client_profiles?.last_name}`,
            customer_email: booking.client_profiles?.email,
            customer_phone: booking.client_profiles?.phone,
            service_name: booking.services?.name,
            service_duration: booking.services?.duration_minutes,
            booked_at: booking.created_at
          }));
          
          filename = `bookings_${startDate}_to_${endDate}`;
          break;

        case 'revenue':
          const { data: revenueData, error: revenueError } = await supabase
            .from('platform_transactions')
            .select(`
              id,
              transaction_type,
              gross_amount,
              platform_fee,
              stripe_fee,
              net_amount,
              created_at,
              barber_profiles(business_name, owner_name),
              bookings(appointment_date, services(name))
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });

          if (revenueError) throw revenueError;
          
          data = (revenueData || []).map(transaction => ({
            transaction_id: transaction.id,
            type: transaction.transaction_type,
            gross_amount: transaction.gross_amount,
            platform_fee: transaction.platform_fee,
            stripe_fee: transaction.stripe_fee,
            net_amount: transaction.net_amount,
            date: transaction.created_at,
            barber_business: transaction.barber_profiles?.business_name,
            barber_owner: transaction.barber_profiles?.owner_name,
            service_date: transaction.bookings?.appointment_date,
            service_name: transaction.bookings?.services?.name
          }));
          
          filename = `revenue_${startDate}_to_${endDate}`;
          break;

        case 'barbers':
          const { data: barbersData, error: barbersError } = await supabase
            .from('barber_profiles')
            .select(`
              id,
              business_name,
              owner_name,
              phone,
              email,
              address,
              city,
              state,
              zip_code,
              is_claimed,
              is_active,
              average_rating,
              total_reviews,
              stripe_onboarding_completed,
              created_at
            `)
            .order('created_at', { ascending: false });

          if (barbersError) throw barbersError;
          
          data = (barbersData || []).map(barber => ({
            barber_id: barber.id,
            business_name: barber.business_name,
            owner_name: barber.owner_name,
            phone: barber.phone,
            email: barber.email,
            address: barber.address,
            city: barber.city,
            state: barber.state,
            zip_code: barber.zip_code,
            is_claimed: barber.is_claimed,
            is_active: barber.is_active,
            average_rating: barber.average_rating,
            total_reviews: barber.total_reviews,
            stripe_connected: barber.stripe_onboarding_completed,
            joined_date: barber.created_at
          }));
          
          filename = `barbers_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'customers':
          const { data: customersData, error: customersError } = await supabase
            .from('client_profiles')
            .select(`
              id,
              first_name,
              last_name,
              email,
              phone,
              preferred_contact,
              created_at,
              bookings(id, appointment_date, total_amount, status)
            `)
            .order('created_at', { ascending: false });

          if (customersError) throw customersError;
          
          data = (customersData || []).map(customer => ({
            customer_id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            phone: customer.phone,
            preferred_contact: customer.preferred_contact,
            total_bookings: customer.bookings?.length || 0,
            total_spent: customer.bookings?.reduce((sum, booking) => 
              booking.status === 'completed' ? sum + Number(booking.total_amount) : sum, 0) || 0,
            last_booking: customer.bookings?.reduce((latest, booking) => 
              booking.appointment_date > (latest?.appointment_date || '') ? booking : latest, null)?.appointment_date,
            joined_date: customer.created_at
          }));
          
          filename = `customers_${format(new Date(), 'yyyy-MM-dd')}`;
          break;
      }

      // Convert to CSV or JSON
      let fileContent = '';
      let mimeType = '';
      let fileExtension = '';

      if (exportOptions.format === 'csv') {
        // Convert to CSV
        if (data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => 
            Object.values(row).map(value => 
              typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value
            ).join(',')
          ).join('\n');
          fileContent = `${headers}\n${rows}`;
        }
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else {
        // Convert to JSON
        fileContent = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      }

      // Download file
      const blob = new Blob([fileContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update export history
      setExportHistory(prev => [{
        type: type,
        date: format(new Date(), 'yyyy-MM-dd HH:mm'),
        records: data.length
      }, ...prev.slice(0, 4)]); // Keep last 5 exports

      NotificationManager.success(
        `${data.length} ${type} records exported successfully!`
      );

    } catch (error) {
      console.error('Export error:', error);
      NotificationManager.error(`Failed to export ${type} data. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Configuration */}
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-purple-100 p-3 rounded-2xl">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">
            Export Configuration
            </h3>
          </div>

          <div className="space-y-8">
            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Select Data Type
              </label>
              <div className="space-y-4">
                {exportTypes.map(type => (
                  <label
                    key={type.id}
                    className={`flex items-start p-6 border rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                      exportOptions.type === type.id
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportType"
                      value={type.id}
                      checked={exportOptions.type === type.id}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        type: e.target.value as any 
                      }))}
                      className="sr-only"
                    />
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-100 p-3 rounded-xl">
                        <type.icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-gray-900 text-lg mb-1">{type.label}</p>
                        <p className="text-gray-600 font-medium">{type.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Date Range
              </label>
              <select
                value={exportOptions.dateRange}
                onChange={(e) => setExportOptions(prev => ({ 
                  ...prev, 
                  dateRange: e.target.value as any 
                }))}
                className="input-premium"
              >
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {exportOptions.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportOptions.startDate ? format(exportOptions.startDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      startDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportOptions.endDate ? format(exportOptions.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      endDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    className="input-premium"
                  />
                </div>
              </div>
            )}

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportOptions.format === 'csv'}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      format: e.target.value as any 
                    }))}
                    className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">CSV (Excel compatible)</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={exportOptions.format === 'json'}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      format: e.target.value as any 
                    }))}
                    className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">JSON (Developer format)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-accent-100 p-3 rounded-2xl">
              <Download className="h-6 w-6 text-accent-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">
            Export Actions
            </h3>
          </div>

          <div className="space-y-6">
            <button
              onClick={() => exportData(exportOptions.type)}
              disabled={!!exporting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === exportOptions.type ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Export {exportTypes.find(t => t.id === exportOptions.type)?.label}</span>
                </>
              )}
            </button>

            {/* Quick Export Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {exportTypes.filter(t => t.id !== exportOptions.type).map(type => (
                <button
                  key={type.id}
                  onClick={() => exportData(type.id)}
                  disabled={!!exporting}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting === type.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                  ) : (
                    <type.icon className="h-4 w-4" />
                  )}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export History */}
          {exportHistory.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-lg font-display font-bold text-gray-900 mb-6">Recent Exports</h4>
              <div className="space-y-4">
                {exportHistory.map((export_, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-500 p-1.5 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-900 capitalize font-semibold">{export_.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-semibold">{export_.records} records</p>
                      <p className="text-gray-500 text-sm font-medium">{export_.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-500 p-3 rounded-2xl">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="font-display font-bold text-blue-900 mb-4 text-lg">Export Guidelines</h4>
            <ul className="space-y-2 text-blue-800 font-medium">
              <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
              <li>• JSON files are ideal for developers and technical analysis</li>
              <li>• Exported data includes all records within the selected date range</li>
              <li>• Customer data exports follow privacy regulations and exclude sensitive information</li>
              <li>• Large exports may take a few moments to process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDataExport;