import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/accounts/me/");
      const userData =
        response.data.user ?? response.data.data ?? response.data;

      setUser(userData);
      return userData;
    } catch (error) {
      console.error("User authentication verification failed:", {
        status: error.response?.status,
        response: error.response?.data,
        message: error.message,
      });

      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check the existing Django session when the application loads.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);


  const logout = useCallback(async () => {
    try {
      await api.post("/accounts/logout/");
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    refreshUser,
    logout,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
