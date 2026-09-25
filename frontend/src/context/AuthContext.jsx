import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/auth";
import { normalizeRole } from "../utils/permissions";

const AuthContext = createContext(null);

function formatUser(rawUser) {
  if (!rawUser) return null;
  const normRole = normalizeRole(rawUser.role) || rawUser.role;
  return {
    ...rawUser,
    role: normRole,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => formatUser(authApi.getCurrentUser()));
  const [token, setToken] = useState(() => localStorage.getItem("kn_access_token"));
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem("kn_access_token");
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await authApi.getMe();
      const formattedMe = formatUser(me);
      setUser(formattedMe);
      setToken(storedToken);
      localStorage.setItem("kn_user", JSON.stringify(formattedMe));
    } catch (err) {
      console.warn("Session validation failed:", err);
      // If validation fails and refresh token is absent or invalid, clear
      if (!localStorage.getItem("kn_refresh_token")) {
        authApi.logout();
        setUser(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    const formattedUser = formatUser(data.user);
    setToken(data.access_token);
    setUser(formattedUser);
    return { ...data, user: formattedUser };
  };

  // Phone OTP Login handler
  const phoneLogin = async (payload) => {
    const data = await authApi.phoneLogin(payload);
    const formattedUser = formatUser(data.user);
    setToken(data.access_token);
    setUser(formattedUser);
    return { ...data, user: formattedUser };
  };

  // Logout handler
  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        phoneLogin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
