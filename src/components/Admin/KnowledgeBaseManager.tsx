import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  RefreshCw, 
  BookOpen,
  Loader,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

interface KnowledgeItem {
  id?: string;
  title: string;
  content: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

const KnowledgeBaseManager: React.FC = () => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<KnowledgeItem>({
    title: '',
    content: '',
    category: 'general'
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
    { value: 'barber', label: 'For Barbers' },
    { value: 'technical', label: 'Technical' },
    { value: 'support', label: 'Support' },
    { value: 'privacy', label: 'Privacy' }
  ];

  useEffect(() => {
    fetchKnowledgeItems();
  }, []);

  const fetchKnowledgeItems = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('category')
        .order('title');

      if (error) throw error;
      setKnowledgeItems(data || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      NotificationManager.error('Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const seedKnowledgeBase = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-knowledge-base');

      if (error) throw error;

      if (data?.success) {
        NotificationManager.success(`Knowledge base seeded! Processed ${data.stats.processed} items.`);
        await fetchKnowledgeItems();
      } else {
        throw new Error(data?.error || 'Failed to seed knowledge base');
      }
    } catch (error: any) {
      console.error('Error seeding knowledge base:', error);
      NotificationManager.error(error.message || 'Failed to seed knowledge base');
    } finally {
      setSeeding(false);
    }
  };

  const createItem = async () => {
    if (!newItem.title.trim() || !newItem.content.trim()) {
      NotificationManager.error('Title and content are required');
      return;
    }

    try {
      // We'll let the backend generate embeddings via a separate function
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title: newItem.title.trim(),
          content: newItem.content.trim(),
          category: newItem.category
        });

      if (error) throw error;

      setNewItem({ title: '', content: '', category: 'general' });
      setIsCreating(false);
      await fetchKnowledgeItems();
      NotificationManager.success('Knowledge item created successfully!');
    } catch (error) {
      console.error('Error creating knowledge item:', error);
      NotificationManager.error('Failed to create knowledge item');
    }
  };

  const updateItem = async (item: KnowledgeItem) => {
    if (!item.title.trim() || !item.content.trim()) {
      NotificationManager.error('Title and content are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          title: item.title.trim(),
          content: item.content.trim(),
          category: item.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      setEditingItem(null);
      await fetchKnowledgeItems();
      NotificationManager.success('Knowledge item updated successfully!');
    } catch (error) {
      console.error('Error updating knowledge item:', error);
      NotificationManager.error('Failed to update knowledge item');
    }
  };

  const deleteItem = async (itemId: string) => {
    const item = knowledgeItems.find(i => i.id === itemId);
    if (!item) return;

    if (!confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchKnowledgeItems();
      NotificationManager.success('Knowledge item deleted successfully');
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      NotificationManager.error('Failed to delete knowledge item');
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
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-3 rounded-2xl">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900">AI Knowledge Base</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={seedKnowledgeBase}
            disabled={seeding}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seeding ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{seeding ? 'Seeding...' : 'Seed Knowledge Base'}</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Add Knowledge Item</span>
          </button>
        </div>
      </div>

      {/* Create New Item */}
      {isCreating && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">New Knowledge Item</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., How to book an appointment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={newItem.content}
                onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Detailed explanation or answer..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                disabled={!newItem.title || !newItem.content}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Items List */}
      <div className="space-y-4">
        {knowledgeItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            {editingItem?.id === item.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={editingItem.content}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, content: e.target.value } : null)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateItem(editingItem)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {categories.find(c => c.value === item.category)?.label || item.category}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-3">{item.content}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id!)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                  {item.updated_at && item.updated_at !== item.created_at && (
                    <> • Updated: {new Date(item.updated_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {knowledgeItems.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-4">No Knowledge Items Yet</h3>
            <p className="text-gray-600 mb-6">
              Create knowledge base items to power the AI chatbot with accurate information about Kutable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={seedKnowledgeBase}
                disabled={seeding}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seeding ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{seeding ? 'Seeding Knowledge Base...' : 'Seed with Default Content'}</span>
              </button>
              <button
                onClick={() => setIsCreating(true)}
                className="btn-secondary"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Item</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Base Stats */}
      {knowledgeItems.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-xl">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h4 className="font-display font-bold text-purple-900 text-lg">Knowledge Base Stats</h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-800">{knowledgeItems.length}</p>
              <p className="text-sm text-purple-600 font-medium">Total Items</p>
            </div>
            {categories.map(category => {
              const count = knowledgeItems.filter(item => item.category === category.value).length;
              if (count === 0) return null;
              return (
                <div key={category.value} className="text-center">
                  <p className="text-2xl font-bold text-purple-800">{count}</p>
                  <p className="text-sm text-purple-600 font-medium">{category.label}</p>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 bg-purple-200 rounded-xl p-4">
            <p className="text-purple-800 text-sm font-medium">
              💡 The AI chatbot uses this knowledge base to answer customer questions accurately. 
              Keep it updated with the latest information about Kutable's features and policies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;