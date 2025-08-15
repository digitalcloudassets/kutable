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
  const displayUrl = slug ? `kutable.com/barber/${slug}` : `kutable.com/barber/${id ?? ''}`;
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
    <div className={className ?? 'mt-2 flex items-center gap-2 text-sm'}>
      <div className="flex items-center gap-1 rounded-lg border px-2 py-1">
        <LinkIcon className="h-4 w-4 text-gray-500" />
        <span className="truncate max-w-[52vw] text-gray-700">{displayUrl}</span>
      </div>
      <button onClick={copy} className="rounded-lg border px-2 py-1 text-gray-700 hover:bg-gray-50">
        {copied ? (
          <>
            <Check className="h-4 w-4 inline" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 inline" /> Copy
          </>
        )}
      </button>
      <button onClick={nativeShare} className="rounded-lg border px-2 py-1 text-gray-700 hover:bg-gray-50">
        <Share2 className="h-4 w-4 inline" /> Share
      </button>
    </div>
  );
}