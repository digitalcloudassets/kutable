import React, { useState } from 'react';
import { Link as LinkIcon, Copy, Check, Share2 } from 'lucide-react';

// Check if slug is a proper branded slug (not UUID or fallback)
const isBrandedSlug = (slug?: string | null): boolean => {
  if (!slug) return false;
  
  // Not a UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(slug)) return false;
  
  // Not a fallback pattern like "barber-8620af49"
  const fallbackPattern = /^barber-[0-9a-f]{8}$/i;
  if (fallbackPattern.test(slug)) return false;
  
  // Must be at least 3 characters and contain meaningful content
  if (slug.length < 3) return false;
  
  return true;
};

type Props = {
  slug?: string | null;
  id?: string | null; // fallback if slug missing
  className?: string;
};

export default function ShareProfileLink({ slug, id, className }: Props) {
  // Only show branded link if we have a proper branded slug
  if (!isBrandedSlug(slug)) {
    return null;
  }
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kutable.com';
  const url = `${origin}/barber/${slug}`;
  const brandedUrl = `kutable.com/barber/${slug}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try { 
      await navigator.clipboard.writeText(brandedUrl); 
      setCopied(true); 
      setTimeout(() => setCopied(false), 1200); 
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    if ((navigator as any).share) {
      try { 
        await (navigator as any).share({ title: 'Book me on Kutable', url: brandedUrl }); 
      } catch {
        // fallback to copy
        copy();
      }
    } else {
      copy();
    }
  }

  return (
    <div className={className ?? 'mt-2'}>
      {/* Link pill centered */}
      <div className="w-full flex justify-center">
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
          <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="max-w-[82vw] sm:max-w-[520px] text-gray-800 text-sm font-medium">
            {brandedUrl}
          </span>
        </div>
      </div>

      {/* Actions underneath, centered */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={nativeShare}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
}