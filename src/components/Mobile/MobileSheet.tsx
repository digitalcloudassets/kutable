import React from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function MobileSheet({ open, title, onClose, children }: Props) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-0 bg-white">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 flex items-center space-x-1"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100dvh-48px)] px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}