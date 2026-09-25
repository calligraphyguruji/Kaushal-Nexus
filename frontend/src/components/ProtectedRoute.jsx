import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRole, UserRole, hasPermission, getRoleDashboardPath } from "../utils/permissions";
import { Loader2 } from "lucide-react";
import StateView from "./StateView";
import DashboardLayout from "../layouts/DashboardLayout";

/**
 * Enterprise protected route verifying session authenticity and role-based gating.
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

  const userRole = normalizeRole(user.role);
  const homeDest = getRoleDashboardPath(userRole, user.is_superuser);

  // 2. Disallowed Roles Check (e.g. MSDE Officer prevented from Learner portal, Learner from Officer consoles)
  if (disallowedRoles && Array.isArray(disallowedRoles)) {
    const normDisallowed = disallowedRoles.map((r) => normalizeRole(r));
    if (normDisallowed.includes(userRole)) {
      return <Navigate to={homeDest} replace />;
    }
  }

  // 3. Required Roles Check
  if (requiredRoles && Array.isArray(requiredRoles)) {
    const normRequired = requiredRoles.map((r) => normalizeRole(r));
    const isAllowed =
      normRequired.includes(userRole) || (user.is_superuser && userRole !== UserRole.LEARNER);

    if (!isAllowed) {
      // If user is a Learner trying to access MSDE or Admin route, redirect them to /learner
      if (userRole === UserRole.LEARNER) {
        return <Navigate to="/learner" replace />;
      }
      // If user is an MSDE Officer trying to access Learner route, redirect them to /msde
      if (userRole === UserRole.MSDE_OFFICER) {
        return <Navigate to="/msde" replace />;
      }
      // If user is an Admin trying to access Learner route, redirect them to /admin
      if (userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.STATE_ADMIN) {
        return <Navigate to="/admin" replace />;
      }

      return (
        <DashboardLayout>
          <div className="py-8">
            <StateView
              variant="forbidden"
              title="Role-Restricted Administration"
              message={`This portal module is restricted to ${requiredRoles.join(", ")}. Your current role is ${user.role}.`}
              backLink={homeDest}
              backLabel={`Return to ${userRole === UserRole.MSDE_OFFICER ? "MSDE Overview" : "Dashboard"}`}
            />
          </div>
        </DashboardLayout>
      );
    }
  }

  // 4. Superuser bypasses granular permissions (unless role-gated above)
  if (user.is_superuser === true) {
    return children;
  }

  // 5. Optional Permission Check
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <DashboardLayout>
        <div className="py-8">
          <StateView
            variant="forbidden"
            title="Institutional Module Restricted"
            message={`Your role (${user.role}) does not have permission to access this module. If you require access, contact your MSDE or State System Administrator.`}
            backLink={homeDest}
            backLabel="Return to Overview"
          />
        </div>
      </DashboardLayout>
    );
  }

  return children;
}
