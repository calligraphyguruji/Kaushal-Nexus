import { useAuth } from "../context/AuthContext.jsx";
import { computePermissions } from "../utils/permissions.js";

/**
 * React Hook exposing the evaluated RBAC permissions for the active authenticated user.
 */
export function usePermissions() {
  const { user } = useAuth();
  return computePermissions(user);
}

export * from "../utils/permissions.js";
