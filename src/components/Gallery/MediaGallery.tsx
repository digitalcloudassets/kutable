import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Star, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';

type GalleryMedia = Database['public']['Tables']['gallery_media']['Row'];

interface MediaGalleryProps {
  barberId: string;
  isOwner?: boolean;
  onMediaUpdate?: () => void;
  refreshTrigger?: number;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  barberId, 
  isOwner = false, 
  onMediaUpdate,
  refreshTrigger
}) => {
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<GalleryMedia | null>(null);
  const [editingCaption, setEditingCaption] = useState<string>('');

  useEffect(() => {
    fetchMedia();
  }, [barberId, refreshTrigger]);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_media')
        .select('*')
        .eq('barber_id', barberId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      const { error } = await supabase
        .from('gallery_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;
      
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      onMediaUpdate?.();
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const toggleFeatured = async (mediaId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('gallery_media')
        .update({ is_featured: !isFeatured })
        .eq('id', mediaId);

      if (error) throw error;
      
      setMedia(prev => prev.map(m => 
        m.id === mediaId ? { ...m, is_featured: !isFeatured } : m
      ));
      onMediaUpdate?.();
    } catch (error) {
      console.error('Error updating featured status:', error);
    }
  };

  const updateCaption = async (mediaId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('gallery_media')
        .update({ caption })
        .eq('id', mediaId);

      if (error) throw error;
      
      setMedia(prev => prev.map(m => 
        m.id === mediaId ? { ...m, caption } : m
      ));
      setSelectedMedia(null);
      onMediaUpdate?.();
    } catch (error) {
      console.error('Error updating caption:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No media yet</h3>
        <p className="text-gray-600">
          {isOwner 
            ? 'Upload some photos and videos to showcase your work!'
            : 'This barber hasn\'t uploaded any media yet.'
          }
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <div key={item.id} className="group relative aspect-square">
            <div
              onClick={() => setSelectedMedia(item)}
              className="w-full h-full cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            >
              {item.file_type === 'image' ? (
                <img
                  src={item.file_url}
                  alt={item.caption || 'Gallery image'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                  <Video className="h-8 w-8 text-white" />
                  <video
                    src={item.file_url}
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    muted
                  />
                </div>
              )}
            </div>

            {/* Featured badge */}
            {item.is_featured && (
              <div className="absolute top-2 left-2 bg-yellow-500 text-white p-1 rounded-full">
                <Star className="h-3 w-3 fill-current" />
              </div>
            )}

            {/* Owner controls */}
            {isOwner && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFeatured(item.id, item.is_featured);
                    }}
                    className={`p-1 rounded-full ${
                      item.is_featured 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-white/80 text-gray-600 hover:bg-yellow-500 hover:text-white'
                    } transition-colors`}
                    title="Toggle featured"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia(item.id);
                    }}
                    className="p-1 bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Caption preview */}
            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs truncate">{item.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="relative">
              {selectedMedia.file_type === 'image' ? (
                <img
                  src={selectedMedia.file_url}
                  alt={selectedMedia.caption || 'Gallery image'}
                  className="max-w-full max-h-96 object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.file_url}
                  controls
                  className="max-w-full max-h-96"
                />
              )}
              
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Caption section */}
            <div className="p-4">
              {isOwner ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingCaption !== '' ? editingCaption : selectedMedia.caption || ''}
                    onChange={(e) => setEditingCaption(e.target.value)}
                    onFocus={() => setEditingCaption(selectedMedia.caption || '')}
                    placeholder="Add a caption..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => updateCaption(selectedMedia.id, editingCaption)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              ) : (
                selectedMedia.caption && (
                  <p className="text-gray-700">{selectedMedia.caption}</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaGallery;