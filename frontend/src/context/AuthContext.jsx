import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getApiError, primeCsrf } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [authError, setAuthError] = useState("");

  const refreshUser = useCallback(async () => {
    try {
      const [{ data }, token] = await Promise.all([
        api.get("auth/me"),
        primeCsrf(),
      ]);
      setCsrfToken(token);
      setUser(data);
      setAuthError("");
      return data;
    } catch (error) {
      if (error?.response?.status !== 401) {
        setAuthError(getApiError(error, "The account service is unavailable."));
      } else {
        setAuthError("");
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([primeCsrf(), api.get("auth/me").catch((error) => {
      if (error?.response?.status !== 401) throw error;
      return null;
    })]).then(([token, response]) => {
      if (!active) return;
      setCsrfToken(token);
      setUser(response?.data || null);
      setAuthError("");
    }).catch((error) => {
      if (active) setAuthError(getApiError(error, "The account service is unavailable."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const token = await primeCsrf();
    setCsrfToken(token);
    const { data } = await api.post("auth/login", { email, password });
    setUser(data.user);
    setAuthError("");
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const token = await primeCsrf();
    setCsrfToken(token);
    const { data } = await api.post("auth/register", { name, email, password });
    setUser(data.user);
    setAuthError("");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    csrfToken,
    authError,
    login,
    register,
    logout,
    refreshUser,
  }), [user, loading, csrfToken, authError, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
