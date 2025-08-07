// Security utilities for input validation and sanitization

export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>&"']/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[match] || match;
    });
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain repeated characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateBusinessName = (name: string): boolean => {
  return name.trim().length >= 2 && 
         name.trim().length <= 100 && 
         !/[<>:"/\\|?*]/.test(name);
};

export const validateFileUpload = (file: File): { 
  isValid: boolean; 
  error?: string 
} => {
  // Check file size (10MB for images, 50MB for videos)
  const maxImageSize = 10 * 1024 * 1024;
  const maxVideoSize = 50 * 1024 * 1024;
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (isImage && file.size > maxImageSize) {
    return { isValid: false, error: 'Image files must be smaller than 10MB' };
  }
  
  if (isVideo && file.size > maxVideoSize) {
    return { isValid: false, error: 'Video files must be smaller than 50MB' };
  }
  
  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi'];
  
  if (isImage && !allowedImageTypes.includes(file.type)) {
    return { isValid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }
  
  if (isVideo && !allowedVideoTypes.includes(file.type)) {
    return { isValid: false, error: 'Only MP4, MOV, and AVI videos are allowed' };
  }
  
  if (!isImage && !isVideo) {
    return { isValid: false, error: 'Only image and video files are allowed' };
  }
  
  // Validate filename
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name) || file.name.length > 255) {
    return { isValid: false, error: 'Invalid filename. Use only letters, numbers, dots, hyphens, and underscores.' };
  }
  
  return { isValid: true };
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255);
};

// Rate limiting utility for client-side
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return true;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return false;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Content Security Policy helpers
export const isSecureUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || 
           (parsedUrl.protocol === 'http:' && parsedUrl.hostname === 'localhost');
  } catch {
    return false;
  }
};

// Session security
export const createSecureSession = (data: any, expiresInHours: number = 8): string => {
  const sessionData = {
    ...data,
    created: new Date().toISOString(),
    expires: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    nonce: Math.random().toString(36).substring(2)
  };
  
  return btoa(JSON.stringify(sessionData));
};

export const validateSecureSession = (sessionString: string): { 
  isValid: boolean; 
  data?: any; 
  error?: string 
} => {
  try {
    const session = JSON.parse(atob(sessionString));
    
    if (!session.created || !session.expires || !session.nonce) {
      return { isValid: false, error: 'Invalid session format' };
    }
    
    if (new Date() > new Date(session.expires)) {
      return { isValid: false, error: 'Session expired' };
    }
    
    return { isValid: true, data: session };
  } catch {
    return { isValid: false, error: 'Invalid session data' };
  }
};