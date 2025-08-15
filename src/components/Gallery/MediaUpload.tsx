import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Video, X, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';
import { validateFileUpload } from '../../utils/security';
import { uploadGalleryItem } from '../../lib/uploadGallery';

interface MediaUploadProps {
  barberId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  preview: string;
  type: 'image' | 'video';
}

const MediaUpload: React.FC<MediaUploadProps> = ({ barberId, onUploadComplete }) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    Array.from(files).forEach((file, index) => {
      // Limit number of files
      if (index >= 10) {
        rejectedFiles.push(`${file.name} (file limit exceeded)`);
        return;
      }
      
      const validation = validateFileUpload(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        rejectedFiles.push(`${file.name} (${validation.error})`);
      }
    });

    if (rejectedFiles.length > 0) {
      NotificationManager.error(
        `${rejectedFiles.length} file(s) rejected: ${rejectedFiles.slice(0, 3).join(', ')}${rejectedFiles.length > 3 ? '...' : ''}`
      );
    }

    validFiles.forEach(file => {
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      const preview = URL.createObjectURL(file);
      
      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        preview,
        type: fileType
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);
      uploadFile(uploadingFile);
    });
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      // Guard: ensure user is signed in before upload
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        NotificationManager.error('Please sign in to upload media.');
        setUploadingFiles(prev => prev.filter(f => f.file !== uploadingFile.file));
        URL.revokeObjectURL(uploadingFile.preview);
        return;
      }

      // Update progress to show upload starting
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, progress: 10 }
            : f
        )
      );

      const fileName = `${barberId}/${Date.now()}-${uploadingFile.file.name}`;
      const bucket = uploadingFile.type === 'image' ? 'barber-images' : 'barber-videos';

      // Simulate progress updates since Supabase doesn't provide reliable progress callbacks
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, progress: Math.min(f.progress + 15, 80) }
              : f
          )
        );
      }, 200);

      // Upload using the new gallery system
      const { url: fileUrl } = await uploadGalleryItem(uploadingFile.file, auth.user.id);

      clearInterval(progressInterval);

      // Set progress to 95% before database save
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, progress: 95 }
            : f
        )
      );

      // Save to database
      const { error: dbError } = await supabase
        .from('gallery_media')
        .insert({
          barber_id: barberId,
          file_url: fileUrl,
          file_type: uploadingFile.type,
          display_order: 0
        });

      if (dbError) throw dbError;

      // Set progress to 100% when complete
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, progress: 100 }
            : f
        )
      );

      // Small delay to show 100% progress before removing
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== uploadingFile.file));
        URL.revokeObjectURL(uploadingFile.preview);
        onUploadComplete();
        NotificationManager.success(`${uploadingFile.type === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      NotificationManager.error('Failed to upload file. Please try again.');
      setUploadingFiles(prev => prev.filter(f => f.file !== uploadingFile.file));
      URL.revokeObjectURL(uploadingFile.preview);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => {
      const fileToRemove = prev.find(f => f.file === file);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.file !== file);
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
        }`}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Images or Videos
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select
        </p>
        <p className="text-sm text-gray-500">
          Supports JPG, PNG, MP4, MOV • Max 50MB per file
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploading...</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {uploadingFile.type === 'image' ? (
                    <img
                      src={uploadingFile.preview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <Video className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="mt-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(uploadingFile.progress)}% uploaded
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadingFile(uploadingFile.file);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;