import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  User, 
  Building,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Edit,
  Save,
  X,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

interface ConversationIssue {
  booking_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  barber_business: string;
  barber_owner: string;
  barber_user_id: string | null;
  client_first: string;
  client_last: string;
  client_user_id: string | null;
  service_name: string;
  issue_type: string;
  issue_description: string;
  suggested_fix: string;
}

const ConversationAudit: React.FC = () => {
  const [issues, setIssues] = useState<ConversationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [fixingBooking, setFixingBooking] = useState<string | null>(null);
  const [fixAction, setFixAction] = useState<{
    bookingId: string;
    action: 'create_placeholder' | 'fix_self_messaging' | 'manual_link';
    userIdToLink?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    fetchConversationIssues();
  }, []);

  const fetchConversationIssues = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('client_conversation_audit')
        .select('*');

      if (error) throw error;
      
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching conversation issues:', error);
      NotificationManager.error('Failed to load conversation audit');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchTerm || 
      issue.barber_business.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.client_first.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.client_last.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || issue.issue_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const createPlaceholderClient = async (bookingId: string) => {
    try {
      setFixingBooking(bookingId);
      
      const { data, error } = await supabase.rpc('create_placeholder_client_profile', {
        booking_id_param: bookingId
      });

      if (error) throw error;

      NotificationManager.success('Placeholder client profile created successfully');
      await fetchConversationIssues();
    } catch (error: any) {
      console.error('Error creating placeholder client:', error);
      NotificationManager.error(error.message || 'Failed to create placeholder client');
    } finally {
      setFixingBooking(null);
    }
  };

  const fixSelfMessaging = async (bookingId: string) => {
    try {
      setFixingBooking(bookingId);
      
      const { data, error } = await supabase.rpc('fix_self_messaging_booking', {
        booking_id_param: bookingId
      });

      if (error) throw error;

      NotificationManager.success('Self-messaging issue fixed - separate client profile created');
      await fetchConversationIssues();
    } catch (error: any) {
      console.error('Error fixing self-messaging:', error);
      NotificationManager.error(error.message || 'Failed to fix self-messaging issue');
    } finally {
      setFixingBooking(null);
    }
  };

  const linkClientToUser = async () => {
    if (!fixAction) return;

    try {
      setFixingBooking(fixAction.bookingId);
      
      const { data, error } = await supabase.rpc('link_client_profile_to_user', {
        client_profile_id_param: fixAction.bookingId, // This should be client_id, adjust as needed
        user_id_param: fixAction.userIdToLink,
        first_name_param: fixAction.firstName,
        last_name_param: fixAction.lastName,
        email_param: fixAction.email,
        phone_param: fixAction.phone
      });

      if (error) throw error;

      NotificationManager.success('Client profile linked to user account successfully');
      setFixAction(null);
      await fetchConversationIssues();
    } catch (error: any) {
      console.error('Error linking client to user:', error);
      NotificationManager.error(error.message || 'Failed to link client profile');
    } finally {
      setFixingBooking(null);
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'CLIENT_PROFILE_MISSING_USER_ID':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'SELF_MESSAGING_DETECTED':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'CLIENT_PROFILE_MISSING':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'CLIENT_PROFILE_MISSING_USER_ID':
        return <User className="h-5 w-5 text-amber-600" />;
      case 'SELF_MESSAGING_DETECTED':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'CLIENT_PROFILE_MISSING':
        return <Database className="h-5 w-5 text-blue-600" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Conversation Audit</h3>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conversation Data Integrity Audit</h3>
          <p className="text-gray-600 text-sm">Identify and fix bookings with messaging issues</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={fetchConversationIssues}
            className="btn-secondary text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by barber, client, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="all">All Issues</option>
            <option value="CLIENT_PROFILE_MISSING_USER_ID">Unclaimed Client</option>
            <option value="SELF_MESSAGING_DETECTED">Self-Messaging</option>
            <option value="CLIENT_PROFILE_MISSING">Missing Profile</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Issues</p>
          <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700">Unclaimed Clients</p>
          <p className="text-2xl font-bold text-amber-800">
            {issues.filter(i => i.issue_type === 'CLIENT_PROFILE_MISSING_USER_ID').length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">Self-Messaging</p>
          <p className="text-2xl font-bold text-red-800">
            {issues.filter(i => i.issue_type === 'SELF_MESSAGING_DETECTED').length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">Missing Profiles</p>
          <p className="text-2xl font-bold text-blue-800">
            {issues.filter(i => i.issue_type === 'CLIENT_PROFILE_MISSING').length}
          </p>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {issues.length === 0 ? 'No messaging issues detected' : 'No issues match your filters'}
            </h4>
            <p className="text-gray-600">
              {issues.length === 0 
                ? 'All conversations have proper profile associations'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.booking_id}
              className={`border rounded-lg p-4 ${getIssueColor(issue.issue_type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getIssueIcon(issue.issue_type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">
                        {issue.barber_business} → {issue.client_first} {issue.client_last}
                      </h4>
                      <span className="text-xs font-medium px-2 py-1 bg-white/50 rounded-full">
                        {issue.issue_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1 mb-3">
                      <p><strong>Service:</strong> {issue.service_name}</p>
                      <p><strong>Date:</strong> {new Date(issue.appointment_date).toLocaleDateString()} at {issue.appointment_time}</p>
                      <p><strong>Status:</strong> {issue.status}</p>
                    </div>
                    
                    <div className="text-sm mb-3">
                      <p><strong>Issue:</strong> {issue.issue_description}</p>
                      <p><strong>Suggested Fix:</strong> {issue.suggested_fix}</p>
                    </div>

                    <div className="text-xs text-gray-600 bg-white/30 rounded p-2">
                      <p><strong>Booking ID:</strong> {issue.booking_id}</p>
                      <p><strong>Barber User ID:</strong> {issue.barber_user_id || 'None'}</p>
                      <p><strong>Client User ID:</strong> {issue.client_user_id || 'None'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {issue.issue_type === 'CLIENT_PROFILE_MISSING' && (
                    <button
                      onClick={() => createPlaceholderClient(issue.booking_id)}
                      disabled={fixingBooking === issue.booking_id}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {fixingBooking === issue.booking_id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      <span>Create Profile</span>
                    </button>
                  )}

                  {issue.issue_type === 'SELF_MESSAGING_DETECTED' && (
                    <button
                      onClick={() => fixSelfMessaging(issue.booking_id)}
                      disabled={fixingBooking === issue.booking_id}
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {fixingBooking === issue.booking_id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      <span>Fix Self-Msg</span>
                    </button>
                  )}

                  {issue.issue_type === 'CLIENT_PROFILE_MISSING_USER_ID' && (
                    <button
                      onClick={() => setFixAction({
                        bookingId: issue.booking_id,
                        action: 'manual_link',
                        firstName: issue.client_first,
                        lastName: issue.client_last
                      })}
                      className="bg-amber-600 text-white px-3 py-2 rounded text-sm hover:bg-amber-700 transition-colors flex items-center space-x-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Link User</span>
                    </button>
                  )}

                  <a
                    href={`/admin-console/booking/${issue.booking_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Link Modal */}
      {fixAction && fixAction.action === 'manual_link' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Link Client to User Account</h3>
              <button
                onClick={() => setFixAction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID to Link
                </label>
                <input
                  type="text"
                  value={fixAction.userIdToLink || ''}
                  onChange={(e) => setFixAction(prev => prev ? { ...prev, userIdToLink: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter user UUID"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={fixAction.firstName || ''}
                    onChange={(e) => setFixAction(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={fixAction.lastName || ''}
                    onChange={(e) => setFixAction(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={fixAction.email || ''}
                  onChange={(e) => setFixAction(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  value={fixAction.phone || ''}
                  onChange={(e) => setFixAction(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setFixAction(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={linkClientToUser}
                disabled={!fixAction.userIdToLink || !fixAction.firstName || !fixAction.lastName || !fixAction.email}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Link Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">How to Fix Conversation Issues</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li><strong>Unclaimed Client:</strong> Client needs to create account and claim their profile, or admin can manually link existing user</li>
          <li><strong>Self-Messaging:</strong> Same user is both barber and client - create separate client profile</li>
          <li><strong>Missing Profile:</strong> System will auto-create placeholder profile that client can claim later</li>
        </ul>
      </div>
    </div>
  );

  // Helper functions
  async function createPlaceholderClient(bookingId: string) {
    try {
      setFixingBooking(bookingId);
      
      const { data, error } = await supabase.rpc('create_placeholder_client_profile', {
        booking_id_param: bookingId
      });

      if (error) throw error;

      NotificationManager.success('Placeholder client profile created successfully');
      await fetchConversationIssues();
    } catch (error: any) {
      console.error('Error creating placeholder client:', error);
      NotificationManager.error(error.message || 'Failed to create placeholder client');
    } finally {
      setFixingBooking(null);
    }
  }

  async function fixSelfMessaging(bookingId: string) {
    try {
      setFixingBooking(bookingId);
      
      const { data, error } = await supabase.rpc('fix_self_messaging_booking', {
        booking_id_param: bookingId
      });

      if (error) throw error;

      NotificationManager.success('Self-messaging issue fixed - separate client profile created');
      await fetchConversationIssues();
    } catch (error: any) {
      console.error('Error fixing self-messaging:', error);
      NotificationManager.error(error.message || 'Failed to fix self-messaging issue');
    } finally {
      setFixingBooking(null);
    }
  }
};

export default ConversationAudit;