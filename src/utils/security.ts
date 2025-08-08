// Security utilities for input validation and sanitization

export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
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

// Comprehensive input sanitization for different contexts
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
};

export const sanitizeBusinessName = (name: string): string => {
  return name
    .trim()
    .slice(0, 100)
    .replace(/[<>:"'/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ');
};

export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d\s\-\(\)\+\.]/g, '').slice(0, 20);
};
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15 && /^\d+$/.test(cleanPhone);
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol) && 
           parsedUrl.hostname.length > 0 &&
           !parsedUrl.hostname.includes('localhost') && // Block localhost in production
           !parsedUrl.hostname.includes('127.0.0.1'); // Block local IPs
  } catch {
    return false;
  }
};

export const validateSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && 
         slug.length >= 3 && 
         slug.length <= 100 &&
         !slug.startsWith('-') &&
         !slug.endsWith('-') &&
         !slug.includes('--');
};
export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
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
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .replace(/_{2,}/g, '_')
    .slice(0, 100); // Shorter limit for security
};

// Enhanced rate limiting utility for client-side
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private ipAttempts: Map<string, number[]> = new Map();
  
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

  // IP-based rate limiting
  isIpRateLimited(ip: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.ipAttempts.get(ip) || [];
    
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return true;
    }
    
    validAttempts.push(now);
    this.ipAttempts.set(ip, validAttempts);
    
    return false;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
    this.ipAttempts.delete(key);
  }

  // Clear old entries periodically
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(time => now - time < oneHour);
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
    
    for (const [ip, attempts] of this.ipAttempts.entries()) {
      const validAttempts = attempts.filter(time => now - time < oneHour);
      if (validAttempts.length === 0) {
        this.ipAttempts.delete(ip);
      } else {
        this.ipAttempts.set(ip, validAttempts);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Start cleanup interval
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000); // Cleanup every hour
// Content Security Policy helpers
export const isSecureUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || 
           (parsedUrl.protocol === 'http:' && 
            (parsedUrl.hostname === 'localhost' || 
             parsedUrl.hostname === '127.0.0.1' ||
             parsedUrl.hostname.endsWith('.local')));
  } catch {
    return false;
  }
};

// SQL injection prevention
export const sanitizeSqlInput = (input: string): string => {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '')
    .slice(0, 1000); // Limit length
};

// Prevent NoSQL injection for JSON queries
export const sanitizeJsonInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeInput(input);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const cleanKey = sanitizeInput(key, 50);
      if (typeof value === 'string') {
        sanitized[cleanKey] = sanitizeInput(value);
      } else if (typeof value === 'number' && isFinite(value)) {
        sanitized[cleanKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[cleanKey] = value;
      }
    }
    return sanitized;
  }
  return null;
};

// Session security
export const createSecureSession = (data: any, expiresInHours: number = 2): string => {
  const sessionData = {
    ...data,
    created: new Date().toISOString(),
    expires: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    nonce: crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
    fingerprint: generateFingerprint()
  };
  
  return btoa(JSON.stringify(sessionData));
};

const generateFingerprint = (): string => {
  // Generate a browser fingerprint for session validation
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);
  const canvasFingerprint = canvas.toDataURL();
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvasFingerprint.slice(-50)
  ].join('|');
  
  return btoa(fingerprint).slice(0, 32);
};
export const validateSecureSession = (sessionString: string): { 
  isValid: boolean; 
  data?: any; 
  error?: string 
} => {
  try {
    const session = JSON.parse(atob(sessionString));
    
    if (!session.created || !session.expires || !session.nonce || !session.fingerprint) {
      return { isValid: false, error: 'Invalid session format' };
    }
    
    if (new Date() > new Date(session.expires)) {
      return { isValid: false, error: 'Session expired' };
    }
    
    // Validate fingerprint (basic check)
    const currentFingerprint = generateFingerprint();
    if (session.fingerprint !== currentFingerprint) {
      return { isValid: false, error: 'Session security validation failed' };
    }
    
    return { isValid: true, data: session };
  } catch {
    return { isValid: false, error: 'Invalid session data' };
  }
};

// CSRF token management
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  try {
    const session = JSON.parse(atob(sessionToken));
    return session.csrfToken === token;
  } catch {
    return false;
  }
};

// Prevent timing attacks
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

// Security headers helper
export const getSecurityHeaders = () => {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss://*.supabase.co; frame-src https://js.stripe.com https://hooks.stripe.com;",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)'
  };
};

// Input validation for specific fields
export const validateBookingInput = (input: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!input.appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate)) {
    errors.push('Invalid appointment date format');
  }
  
  if (!input.appointmentTime || !/^\d{2}:\d{2}$/.test(input.appointmentTime)) {
    errors.push('Invalid appointment time format');
  }
  
  if (!input.barberId || typeof input.barberId !== 'string' || input.barberId.length > 50) {
    errors.push('Invalid barber ID');
  }
  
  if (!input.serviceId || typeof input.serviceId !== 'string' || input.serviceId.length > 50) {
    errors.push('Invalid service ID');
  }
  
  if (input.totalAmount && (typeof input.totalAmount !== 'number' || input.totalAmount <= 0 || input.totalAmount > 10000)) {
    errors.push('Invalid payment amount');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Prevent brute force attacks
export const createBruteForceProtection = () => {
  const attempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
  
  const isBlocked = (identifier: string): boolean => {
    const attempt = attempts.get(identifier);
    if (!attempt) return false;
    
    if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) {
      return true;
    }
    
    // Clear block if time has passed
    if (attempt.blockedUntil && Date.now() >= attempt.blockedUntil) {
      attempts.delete(identifier);
      return false;
    }
    
    return false;
  };
  
  const recordAttempt = (identifier: string, success: boolean): void => {
    const now = Date.now();
    const attempt = attempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      attempts.delete(identifier);
      return;
    }
    
    attempt.count++;
    attempt.lastAttempt = now;
    
    // Progressive blocking: 1 min, 5 min, 15 min, 1 hour
    if (attempt.count >= 10) {
      attempt.blockedUntil = now + (60 * 60 * 1000); // 1 hour
    } else if (attempt.count >= 7) {
      attempt.blockedUntil = now + (15 * 60 * 1000); // 15 minutes
    } else if (attempt.count >= 5) {
      attempt.blockedUntil = now + (5 * 60 * 1000); // 5 minutes
    } else if (attempt.count >= 3) {
      attempt.blockedUntil = now + (60 * 1000); // 1 minute
    }
    
    attempts.set(identifier, attempt);
  };
  
  return { isBlocked, recordAttempt };
};

export const bruteForceProtection = createBruteForceProtection();