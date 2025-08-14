import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminGuard } from "../hooks/useAdminGuard";

type Props = { children: React.ReactNode };

export default function ProtectedAdminRoute({ children }: Props) {
  const { loading, allowed, errorMsg } = useAdminGuard();

  if (loading) {
    return <div className="w-full h-[50vh] flex items-center justify-center text-sm text-gray-500">Checking admin access…</div>;
  }

  // If the guard itself errored (CORS/preview), don't imply the *login* failed.
  if (errorMsg && allowed === false) {
    return (
      <div className="p-4">
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Admin check failed: {errorMsg}. If you're in a preview environment, this may be expected.
        </div>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />; // non-admins go to their normal dashboard
  }

  return <>{children}</>;
}