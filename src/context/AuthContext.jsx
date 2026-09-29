import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

import {
  login as apiLogin,
  logout as apiLogout,
} from "../services/authService";

/**
 * AuthContext
 *
 * Provides:
 *   - user
 *   - token
 *   - isLoggedIn
 *   - loading
 *   - error
 *   - login()
 *   - logout()
 *   - sessionExpired
 */

const AuthContext = createContext(null);

/* =========================================================
   Helpers
========================================================= */

function readLocalUser() {
  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read user from localStorage:", error);

    localStorage.removeItem("user");

    return null;
  }
}

/* =========================================================
   Provider
========================================================= */

export function AuthProvider({ children }) {
  /*
   * Restore authentication from localStorage immediately.
   *
   * This is important because otherwise the app may briefly
   * think the user is logged out after refreshing the page.
   */

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token");
  });

  const [user, setUser] = useState(() => {
    return readLocalUser();
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [sessionExpired, setSessionExpired] = useState(false);

  /* =========================================================
     Login
  ========================================================= */

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiLogin(email, password);

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      const { token: newToken, user: newUser } = result.data;

      /*
       * Persist authentication
       */
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      /*
       * Update React state
       */
      setToken(newToken);
      setUser(newUser);

      setSessionExpired(false);
      setError(null);

      return newUser;
    } catch (err) {
      const message = err?.message || "Login failed";

      setError(message);

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================================================
     Logout
  ========================================================= */

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      /*
       * Server-side logout.
       *
       * Even if this fails, we still clear local authentication.
       */
      await apiLogout();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      /*
       * Clear local authentication
       */
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);

      setSessionExpired(false);
      setError(null);

      setLoading(false);
    }
  }, []);

  /* =========================================================
     Session Expired
  ========================================================= */

  useEffect(() => {
    const handleSessionExpired = () => {
      /*
       * Clear authentication
       */
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);

      setError("Your session has expired. Please log in again.");

      setSessionExpired(true);
    };

    window.addEventListener(
      "auth:expired",
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        "auth:expired",
        handleSessionExpired
      );
    };
  }, []);

  /* =========================================================
     Dismiss Session Expired
  ========================================================= */

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
    setError(null);
  }, []);

  /* =========================================================
     Context Value
  ========================================================= */

  const value = {
    user,
    token,

    /*
     * User is considered logged in only when both token and
     * user exist.
     */
    isLoggedIn: Boolean(token && user),

    loading,
    error,

    login,
    logout,

    sessionExpired,
    dismissSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   Hook
========================================================= */

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    );
  }

  return ctx;
}

export default AuthContext;