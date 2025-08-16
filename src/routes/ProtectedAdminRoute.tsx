import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { devPreviewEnabled } from "../lib/devFlags";
import { useAuth } from "../context/AuthProvider";

type Props = { children: React.ReactNode };

export default function ProtectedAdminRoute({ children }: Props) {
  if (devPreviewEnabled()) return <>{children}</>; // bypass in Bolt preview only
  
  const { loading: authLoading } = useAuth();
  const { allowed: isAdmin, loading: adminLoading, error: adminError } = useAdminGuard();

  // Wait for auth to be ready before evaluating admin status
  if (authLoading) {
    return <div className="w-full h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading...</div>;
  }

  if (adminLoading) {
    return <div className="w-full h-[50vh] flex items-center justify-center text-sm text-gray-500">Checking admin access…</div>;
  }

  // If admin check errored
  if (adminError) {
    return (
      <div className="p-4">
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Admin check failed: {adminError}. If you're in a preview environment, this may be expected.
        </div>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />; // non-admins go to their normal dashboard
  }

  return <>{children}</>;
}