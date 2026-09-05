import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { Loader2 } from "lucide-react";
import StateView from "./StateView";
import DashboardLayout from "../layouts/DashboardLayout";

/**
 * Enterprise protected route verifying session authenticity and optional UI permission gating.
 */
export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredRoles,
  disallowedRoles,
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Verifying Institutional Security Session...
          </p>
        </div>
      </div>
    );
  }

  // 1. Not Authenticated -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Superuser bypasses all UI permission constraints
  if (user.is_superuser === true) {
    return children;
  }

  // 3. Disallowed Roles Check (e.g. Candidate Learner restricted from Officer screens)
  if (disallowedRoles && Array.isArray(disallowedRoles) && disallowedRoles.includes(user.role)) {
    if (user.role === "LEARNER") {
      return <Navigate to="/learner" replace />;
    }
    return (
      <DashboardLayout>
        <div className="py-8">
          <StateView
            variant="forbidden"
            title="Institutional Module Restricted"
            message={`Your role (${user.role}) is restricted from accessing this administrative governance module.`}
            backLink={user.role === "LEARNER" ? "/learner" : "/dashboard"}
            backLabel={user.role === "LEARNER" ? "Return to My Learning Portal" : "Return to Overview"}
          />
        </div>
      </DashboardLayout>
    );
  }

  // 4. Optional Permission Check
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <DashboardLayout>
        <div className="py-8">
          <StateView
            variant="forbidden"
            title="Institutional Module Restricted"
            message={`Your role (${user.role}) does not have permission to access this module. If you require access, contact your MSDE or State System Administrator.`}
            backLink={user.role === "LEARNER" ? "/learner" : "/dashboard"}
            backLabel={user.role === "LEARNER" ? "Return to My Learning Portal" : "Return to Overview"}
          />
        </div>
      </DashboardLayout>
    );
  }

  // 5. Optional Role Array Check
  if (requiredRoles && Array.isArray(requiredRoles) && !requiredRoles.includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="py-8">
          <StateView
            variant="forbidden"
            title="Role-Restricted Administration"
            message={`This administrative console is restricted to ${requiredRoles.join(", ")}. Your current role is ${user.role}.`}
            backLink={user.role === "LEARNER" ? "/learner" : "/dashboard"}
            backLabel={user.role === "LEARNER" ? "Return to My Learning Portal" : "Return to Overview"}
          />
        </div>
      </DashboardLayout>
    );
  }

  return children;
}
