// Route guard wrapper. Use it to wrap your admin pages. No localStorage, no client-side passwords.
import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminGuard } from "../hooks/useAdminGuard";

type Props = { children: React.ReactNode };

export default function ProtectedAdminRoute({ children }: Props) {
  const { loading, allowed } = useAdminGuard();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full animate-spin border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    // Redirect to normal login if not authorized
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}