import React, { useState } from 'react';
import { Image, Clock, Shield } from 'lucide-react';
import MobileSheet from '../Mobile/MobileSheet';

type Props = {
  renderGallery: () => React.ReactNode;
  renderHours: () => React.ReactNode;
  renderPrivacy: () => React.ReactNode;
};

function MobileProfileActions({ renderGallery, renderHours, renderPrivacy }: Props) {
  const [panel, setPanel] = useState<null | 'gallery' | 'hours' | 'privacy'>(null);

  return (
    <>
      {/* Sticky action row under profile header - mobile only */}
      <div className="md:hidden sticky top-0 z-[40] bg-white/90 backdrop-blur border-b">
        <div className="px-4 py-2 flex gap-2">
          <button
            onClick={() => setPanel('gallery')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Image className="h-4 w-4" />
            Gallery
          </button>
          <button
            onClick={() => setPanel('hours')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Clock className="h-4 w-4" />
            Hours
          </button>
          <button
            onClick={() => setPanel('privacy')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Privacy
          </button>
        </div>
      </div>

      <MobileSheet
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={
          panel === 'gallery' ? 'Gallery' : 
          panel === 'hours' ? 'Business Hours' : 
          panel === 'privacy' ? 'Privacy Settings' : ''
        }
      >
        {panel === 'gallery' && renderGallery()}
        {panel === 'hours' && renderHours()}
        {panel === 'privacy' && renderPrivacy()}
      </MobileSheet>
    </>
  );
}

// Hide the sticky action row on mobile since tabs are now in bottom nav
const MobileProfileActionsWrapper = ({ renderGallery, renderHours, renderPrivacy }: Props) => {
  return (
    <>
      {/* Desktop only - action chips remain visible */}
      <div className="hidden md:block">
        <MobileProfileActions 
          renderGallery={renderGallery}
          renderHours={renderHours}
          renderPrivacy={renderPrivacy}
        />
      </div>
    </>
  );
};

export default MobileProfileActionsWrapper;