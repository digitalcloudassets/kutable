import React, { useState } from 'react';
import { Link as LinkIcon, Copy, Check, Share2 } from 'lucide-react';

type Props = {
  slug?: string | null;
  id?: string | null; // fallback if slug missing
  className?: string;
};

export default function ShareProfileLink({ slug, id, className }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = slug ? `${origin}/barber/${slug}` : `${origin}/barber/${id ?? ''}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    if ((navigator as any).share) {
      try { 
        await (navigator as any).share({ title: 'Book me on Kutable', url }); 
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
          <span className="max-w-[82vw] sm:max-w-[520px] break-anywhere hyphens-auto text-gray-800 text-sm">
            {url.replace(/^https?:\/\//, '')}
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