// Admin guard banner with precise error display
import React from "react";
import { useAdminGuard } from "../../hooks/useAdminGuard";

export default function AdminGuardBanner() {
  const { loading, allowed, error } = useAdminGuard();
  if (loading || allowed) return null;
  return (
    <div className="mx-4 my-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-medium">Admin Access Notice</div>
      <div className="mt-1">
        {error ? <>Could not verify admin access: <code className="font-mono">{error}</code></> : "Not authorized."}
      </div>
    </div>
  );
}