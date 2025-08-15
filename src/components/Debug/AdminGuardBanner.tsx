import React, { useState } from "react";
import { useAdminGuard } from "../../hooks/useAdminGuard";

/**
 * Dismissible banner that only renders when:
 * - we have finished loading
 * - user is NOT allowed (guard failed)
 * It never creates hooks conditionally.
 */
export default function AdminGuardBanner() {
  const { loading, allowed, error } = useAdminGuard();
  const [dismissed, setDismissed] = useState(false); // always declared

  // Only render when we have a definitive "not allowed" state AND not dismissed
  if (loading || allowed || dismissed) return null;

  return (
    <div className="mx-4 my-2 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div>
        <div className="font-medium">Admin Access Notice</div>
        <div className="mt-1">
          {error ? (
            <span>
              Could not verify admin access:&nbsp;
              <code className="font-mono">{error}</code>
            </span>
          ) : (
            <span>Not authorized.</span>
          )}
        </div>
      </div>
      <button
        className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-amber-900 hover:bg-amber-100"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}