import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, DollarSign, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

type Service = Database['public']['Tables']['services']['Row'];

interface ServicesManagementProps {
  barberId: string;
}

const ServicesManagement: React.FC<ServicesManagementProps> = ({ barberId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    deposit_required: false,
    deposit_amount: 0
  });

  useEffect(() => {
    fetchServices();
  }, [barberId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberId)
        .order('price');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    if (!newService.name.trim() || newService.price <= 0) {
      NotificationManager.error('Please provide a service name and valid price');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          barber_id: barberId,
          ...newService,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => [...prev, data]);
      setNewService({
        name: '',
        description: '',
        price: 0,
        duration_minutes: 30,
        deposit_required: false,
        deposit_amount: 0
      });
      setIsCreating(false);
      NotificationManager.success(`Service "${newService.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating service:', error);
      NotificationManager.error('Failed to create service. Please try again.');
    }
  };

  const updateService = async (service: Service) => {
    if (!service.name.trim() || service.price <= 0) {
      NotificationManager.error('Please provide a service name and valid price');
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: service.name,
          description: service.description,
          price: service.price,
          duration_minutes: service.duration_minutes,
          deposit_required: service.deposit_required,
          deposit_amount: service.deposit_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id);

      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === service.id ? service : s));
      setEditingService(null);
      NotificationManager.success('Service updated successfully!');
    } catch (error) {
      console.error('Error updating service:', error);
      NotificationManager.error('Failed to update service. Please try again.');
    }
  };

  const deleteService = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    if (!confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      
      setServices(prev => prev.filter(s => s.id !== serviceId));
      NotificationManager.success(`Service "${service.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting service:', error);
      NotificationManager.error('Failed to delete service. Please try again.');
    }
  };

  const toggleServiceStatus = async (serviceId: string, isActive: boolean) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !isActive })
        .eq('id', serviceId);

      if (error) throw error;
      
      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, is_active: !isActive } : s
      ));
      
      NotificationManager.success(
        `Service "${service.name}" ${!isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      console.error('Error toggling service status:', error);
      NotificationManager.error('Failed to update service status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Services</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Create New Service */}
      {isCreating && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">New Service</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Haircut, Beard Trim"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="25.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={newService.duration_minutes}
                onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="30"
                min="15"
                step="15"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newService.deposit_required}
                  onChange={(e) => setNewService(prev => ({ ...prev, deposit_required: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require deposit</span>
              </label>
              {newService.deposit_required && (
                <input
                  type="number"
                  value={newService.deposit_amount}
                  onChange={(e) => setNewService(prev => ({ ...prev, deposit_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="10.00"
                  min="0"
                  step="0.01"
                />
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newService.description}
              onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Describe this service..."
            />
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createService}
              disabled={!newService.name || newService.price <= 0}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Service
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            {editingService?.id === service.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                    <input
                      type="text"
                      value={editingService.name}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={editingService.price}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={editingService.duration_minutes}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, duration_minutes: parseInt(e.target.value) || 30 } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="15"
                      step="15"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingService.deposit_required}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, deposit_required: e.target.checked } : null)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require deposit</span>
                    </label>
                    {editingService.deposit_required && (
                      <input
                        type="number"
                        value={editingService.deposit_amount}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, deposit_amount: parseFloat(e.target.value) || 0 } : null)}
                        className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        min="0"
                        step="0.01"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingService.description || ''}
                    onChange={(e) => setEditingService(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingService(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateService(editingService)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-gray-600 text-sm">{service.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setEditingService(service)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  {/* Left: meta */}
                  <div className="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span className="font-medium">{service.price}</span>
                    </span>

                    <span className="inline-flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="ml-1">{service.duration_minutes}</span>
                      <span className="ml-1">min</span>
                    </span>

                    {service.deposit_required && service.deposit_amount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 text-xs font-semibold px-2.5 py-1 whitespace-nowrap">
                        Deposit&nbsp;${service.deposit_amount}
                      </span>
                    )}
                  </div>

                  {/* Right: actions (always stays inside the card) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors border ${
                        service.is_active
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                      }`}
                    >
                      {service.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {services.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
            <p className="text-gray-600 mb-4">Create your first service to start accepting bookings.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Add Your First Service
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesManagement;